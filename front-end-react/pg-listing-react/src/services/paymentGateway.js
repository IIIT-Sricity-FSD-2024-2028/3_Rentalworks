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
 * @param {object} purpose  { purpose: 'checkout', propertyId, roomNumber } | { purpose: 'rent', rentDueId }
 * @param {object} details  { description, name, email, phone } shown in the gateway window
 * @returns {Promise<{ gatewayOrderId, gatewayPaymentId, gatewaySignature, mode, amount }>}
 */
export async function payOnline(purpose, details = {}) {
  const order = await http.post('/payment-gateway/order', purpose);

  if (order.mode === 'test') {
    const proof = await http.post('/payment-gateway/test-pay', { orderId: order.orderId });
    return { gatewayOrderId: proof.orderId, gatewayPaymentId: proof.paymentId, gatewaySignature: proof.signature, mode: 'test', amount: order.amount };
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
      prefill: { name: details.name || '', email: details.email || '', contact: details.phone || '' },
      theme: { color: '#4f46e5' },
      handler: (res) =>
        resolve({
          gatewayOrderId: res.razorpay_order_id,
          gatewayPaymentId: res.razorpay_payment_id,
          gatewaySignature: res.razorpay_signature,
          mode: 'razorpay',
          amount: order.amount,
        }),
      modal: { ondismiss: () => reject(new Error('Payment cancelled. You have not been charged.')) },
    });
    rzp.on('payment.failed', (resp) => reject(new Error(resp?.error?.description || 'Payment failed. You have not been charged.')));
    rzp.open();
  });
}
