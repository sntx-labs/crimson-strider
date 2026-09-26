(() => {
  // One shared GA4 stream across SNTX and Labs; never count embedded renderers twice.
  const hosts = ['sntx.co', 'www.sntx.co', 'labs.sntx.co', 'syntax-labs.taylor-sntx.chatgpt.site'];
  if (!hosts.includes(location.hostname) || window.self !== window.top || window.syntaxAnalyticsInitialized) return;
  window.syntaxAnalyticsInitialized = true;
  const id = 'G-0Y7KVQV8CK';
  const page = new URL(location.href);
  for (const key of [...page.searchParams.keys()]) {
    if (!['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term', 'utm_content', 'gclid'].includes(key)) page.searchParams.delete(key);
  }
  page.hash = '';
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', id, {
    page_location: page.href,
    content_group: location.pathname.startsWith('/experiments/') ? 'Experiments' : location.hostname.includes('labs') ? 'Labs' : 'SNTX',
    cookie_domain: 'auto',
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });
  const tag = document.createElement('script');
  tag.async = true;
  tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
  document.head.appendChild(tag);
})();
