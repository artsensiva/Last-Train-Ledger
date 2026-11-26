'use strict';
const session = new URLSearchParams(location.search).get('session_id');
const status = document.getElementById('status');
const retry = document.getElementById('retry');
async function check() {
  retry.hidden = true;
  if (!session) {
    status.textContent =
      'No checkout reference was supplied. Return to the storefront to start checkout.';
    return;
  }
  try {
    const response = await fetch(`/api/order?session_id=${encodeURIComponent(session)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Payment verification is unavailable.');
    const download = document.getElementById('download');
    download.href = data.download;
    download.hidden = false;
    status.textContent = 'Your test payment is confirmed. Your full game is ready.';
  } catch (error) {
    status.textContent = `${error.message} If you completed payment, retry here; do not purchase again.`;
    retry.hidden = false;
  }
}
retry.addEventListener('click', check);
check();
