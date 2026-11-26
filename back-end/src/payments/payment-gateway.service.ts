import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { DataSource } from 'typeorm';
import { Payment } from './payment.entity';

/** Checkout price rule (the booking pages show the same breakdown). */
export const PLATFORM_FEE = 500;
export const DEPOSIT_RATE = 0.4;

export function checkoutPrice(roomRent: number) {
  const rent = Math.round(Number(roomRent) || 0);
  const deposit = Math.round(rent * DEPOSIT_RATE);
  return { rent, deposit, fee: PLATFORM_FEE, total: rent + deposit + PLATFORM_FEE };
}

export type GatewayOrder = { mode: 'razorpay' | 'test'; orderId: string; amount: number; currency: 'INR'; keyId: string | null };
export type GatewayProof = { orderId?: string; paymentId?: string; signature?: string };

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Online payments.
 *  - With RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET set: real Razorpay orders.
 *    The browser opens Razorpay Checkout (card / UPI / netbanking are entered
 *    there, never on our pages) and we verify Razorpay's signature and the
 *    order amount on the server before recording anything.
 *  - Without keys: TEST MODE. Same flow, but the order and the "payment" are
 *    signed by this server and no money moves. The UI says so clearly.
 * In both modes the amount comes from the database, never from the browser.
 */
@Injectable()
export class PaymentGatewayService {
  constructor(private readonly db: DataSource) {}

  private get keyId() {
    return process.env.RAZORPAY_KEY_ID || '';
  }
  private get keySecret() {
    return process.env.RAZORPAY_KEY_SECRET || '';
  }
  get mode(): 'razorpay' | 'test' {
    return this.keyId && this.keySecret ? 'razorpay' : 'test';
  }

  config() {
    return { mode: this.mode, keyId: this.mode === 'razorpay' ? this.keyId : null, currency: 'INR' };
  }

  // ---------------------------------------------------------------- test mode signing

  private testSecret() {
    const s = process.env.SUPER_ADMIN_TOKEN_SECRET;
    if (!s) throw new ServiceUnavailableException('Payment test mode needs SUPER_ADMIN_TOKEN_SECRET');
    return `payment-test:${s}`;
  }
  private testSign(value: string) {
    return createHmac('sha256', this.testSecret()).update(value).digest('base64url');
  }

  // ---------------------------------------------------------------- orders

  /** Create an order for `amount` rupees. `receipt` ties the order to what is being paid for. */
  async createOrder(amount: number, receipt: string): Promise<GatewayOrder> {
    const rupees = Math.round(amount);
    if (!(rupees > 0)) throw new BadRequestException('Nothing to pay');

    if (this.mode === 'razorpay') {
      const res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic ' + Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64'),
        },
        body: JSON.stringify({ amount: rupees * 100, currency: 'INR', receipt: receipt.slice(0, 40), notes: { receipt } }),
      }).catch(() => null);
      if (!res || !res.ok) throw new ServiceUnavailableException('The payment gateway is not reachable. Please try again.');
      const order = (await res.json()) as { id: string; amount: number };
      return { mode: 'razorpay', orderId: order.id, amount: order.amount / 100, currency: 'INR', keyId: this.keyId };
    }

    const payload = Buffer.from(JSON.stringify({ a: rupees, r: receipt, n: randomBytes(6).toString('hex') })).toString('base64url');
    return { mode: 'test', orderId: `test_${payload}.${this.testSign(payload)}`, amount: rupees, currency: 'INR', keyId: null };
  }

  /** TEST MODE ONLY: stands in for the gateway's payment window. */
  testPay(orderId: string) {
    if (this.mode !== 'test') throw new BadRequestException('Test payments are disabled when a real gateway is configured');
    this.readTestOrder(orderId);
    const paymentId = `test_pay_${randomBytes(8).toString('hex')}`;
    return { orderId, paymentId, signature: this.testSign(`${orderId}|${paymentId}`) };
  }

  private readTestOrder(orderId: string) {
    const m = /^test_([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(orderId || '');
    if (!m || !safeEqual(this.testSign(m[1]), m[2])) throw new BadRequestException('Invalid payment order');
    return JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8')) as { a: number; r: string };
  }

  /**
   * Check that the order was really paid, for exactly `amount`, for this
   * `receipt`, and that the payment was not used before. Returns the
   * transaction id to store on our payment record.
   */
  async verify(proof: GatewayProof, amount: number, receipt: string): Promise<{ transactionId: string; mode: 'razorpay' | 'test' }> {
    const { orderId = '', paymentId = '', signature = '' } = proof || {};
    if (!orderId || !paymentId || !signature) throw new BadRequestException('Payment was not completed');
    const rupees = Math.round(amount);

    if (this.mode === 'razorpay') {
      const expected = createHmac('sha256', this.keySecret).update(`${orderId}|${paymentId}`).digest('hex');
      if (!safeEqual(expected, signature)) throw new BadRequestException('Payment could not be verified');
      const res = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`, {
        headers: { Authorization: 'Basic ' + Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64') },
      }).catch(() => null);
      if (!res || !res.ok) throw new ServiceUnavailableException('Could not confirm the payment with the gateway. If money was deducted it will be refunded.');
      const order = (await res.json()) as { amount: number; status: string; notes?: { receipt?: string } };
      if (order.amount !== rupees * 100) throw new BadRequestException('Payment amount does not match the price');
      if ((order.notes?.receipt || '') !== receipt) throw new BadRequestException('Payment was made for a different item');
      if (order.status !== 'paid') throw new BadRequestException('Payment is not complete yet');
    } else {
      if (!safeEqual(this.testSign(`${orderId}|${paymentId}`), signature)) throw new BadRequestException('Payment could not be verified');
      const order = this.readTestOrder(orderId);
      if (order.a !== rupees) throw new BadRequestException('Payment amount does not match the price');
      if (order.r !== receipt) throw new BadRequestException('Payment was made for a different item');
    }

    // One payment can only ever be recorded once.
    if (await this.db.getRepository(Payment).exists({ where: { transactionId: paymentId } })) {
      throw new BadRequestException('This payment has already been used');
    }
    return { transactionId: paymentId, mode: this.mode };
  }
}
