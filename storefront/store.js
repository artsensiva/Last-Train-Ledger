'use strict';
const buy = document.getElementById('buy');
const status = document.getElementById('checkout-status');
(async () => {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) throw new Error();
    const config = await response.json();
    if (!config.ready) {
      status.textContent = 'Payments are not configured. You can play the free demo now.';
      return;
    }
    document.getElementById('price').textContent = new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: config.currency,
    }).format(config.amount / 100);
    buy.disabled = false;
    buy.textContent = 'Try test checkout';
    status.textContent =
      new URLSearchParams(location.search).get('checkout') === 'cancelled'
        ? 'Checkout cancelled. You can try again.'
        : 'Test purchase only. No real money is charged.';
  } catch {
    status.textContent = 'Checkout is temporarily unavailable. The demo is still available.';
  }
})();
buy.addEventListener('click', async () => {
  buy.disabled = true;
  status.textContent = 'Opening Stripe test checkout…';
  try {
    const response = await fetch('/api/checkout', { method: 'POST' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Checkout unavailable.');
    if (!data.url?.startsWith('https://checkout.stripe.com/'))
      throw new Error('Invalid checkout destination.');
    location.assign(data.url);
  } catch (error) {
    status.textContent = error.message;
    buy.disabled = false;
  }
});
