// =====================================================================
//  Online payments
//  1. Ask the server for an order. The server sets the amount from the
//     database (room rent / rent due), never from this page.
//  2. Razorpay mode: open Razorpay Checkout. Card, UPI and netbanking
//     details are typed into Razorpay's window, never into our pages.
//     Test mode (no Razorpay keys on the server): the server signs a test
//     payment; no money moves.
//  3. Return the proof; the server verifies it before recording anything.
// =====================================================================
import { http } from './apiClient';

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

export const fetchGatewayConfig = () => http.get('/payment-gateway/config', { auth: false });

/** '+91 98765 43210' / '09876543210' / '9876543210' → '+919876543210'; anything else → ''. */
export function indianMobile(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits.length === 11 && digits.startsWith('0') ? digits.slice(1) : digits;
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : '';
}

let scriptPromise = null;
function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = RAZORPAY_SCRIPT;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        scriptPromise = null;
        reject(new Error('Could not load the payment window. Check your internet connection and try again.'));
      };
      document.body.appendChild(s);
    });
  }
  return scriptPromise;
}

/**
 * @param {object} purpose  { purpose: 'checkout', propertyId, roomNumber } | { purpose: 'rent', rentDueId } | { purpose: 'subscription', planType }
 * @param {object} details  { description, name, email, phone } shown in the gateway window
 * @returns {Promise<{ gatewayOrderId, gatewayPaymentId, gatewaySignature, mode, amount, quoteDate? }>}
 */
export async function payOnline(purpose, details = {}) {
  const order = await http.post('/payment-gateway/order', purpose);

  if (order.mode === 'test') {
    const proof = await http.post('/payment-gateway/test-pay', { orderId: order.orderId });
    return { gatewayOrderId: proof.orderId, gatewayPaymentId: proof.paymentId, gatewaySignature: proof.signature, mode: 'test', amount: order.amount, quoteDate: order.quoteDate };
  }

  await loadRazorpay();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: Math.round(order.amount * 100),
      currency: order.currency,
      name: 'RentBro',
      description: details.description || 'PG payment',
      // Pre-fill only a valid Indian mobile; otherwise Razorpay asks for one.
      // (A wrong number makes Razorpay's OTP login fail with "Login Failed".)
      prefill: { name: details.name || '', email: details.email || '', contact: indianMobile(details.phone) },
      // No Razorpay saved-card / customer login: it needs extra account setup
      // and an OTP to the customer's phone, and is not needed to pay rent.
      remember_customer: false,
      theme: { color: '#4f46e5' },
      // Success: Razorpay closes its window and hands us the signed proof.
      handler: (res) =>
        resolve({
          gatewayOrderId: res.razorpay_order_id,
          gatewayPaymentId: res.razorpay_payment_id,
          gatewaySignature: res.razorpay_signature,
          mode: 'razorpay',
          amount: order.amount,
          quoteDate: order.quoteDate,
        }),
      // Closed without paying: report the last failure reason, if there was one.
      modal: { ondismiss: () => reject(new Error(lastFailure ? `${lastFailure} You have not been charged.` : 'Payment cancelled. You have not been charged.')) },
    });
    // A failed attempt is NOT the end: Razorpay keeps its window open and lets
    // the tenant retry with another method (e.g. card declined → netbanking).
    // Only remember the reason; the promise settles on success or on close.
    let lastFailure = '';
    rzp.on('payment.failed', (resp) => {
      lastFailure = resp?.error?.description || 'The last payment attempt failed.';
    });
    rzp.open();
  });
}
