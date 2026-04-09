/**
 * Google Analytics (GA4) composable.
 * Loads gtag.js dynamically and gates all tracking on cookie consent.
 *
 * Consent is stored in a cookie on .realmforge.io so it carries across subdomains.
 */

const CONSENT_COOKIE = 'rf-analytics-consent';
const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

let initialized = false;

/** Read the consent cookie. Returns 'accepted', 'declined', or null. */
export function getConsent() {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Write the consent cookie on .realmforge.io (365 days, same as auth cookies). */
export function setConsent(value) {
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const domain = isLocal ? 'localhost' : '.realmforge.io';
  const secure = isLocal ? '' : '; Secure';
  const maxAge = 365 * 24 * 60 * 60;
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(value)}; Domain=${domain}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

/** Inject the gtag.js script and configure GA4. Only runs once. */
function loadGtag() {
  if (initialized || !MEASUREMENT_ID) return;
  initialized = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', MEASUREMENT_ID, { send_page_view: false });
}

/** Initialize GA if consent was previously accepted. Call on app mount. */
export function initGoogleAnalytics() {
  if (getConsent() === 'accepted') {
    loadGtag();
  }
}

/** Accept consent, persist cookie, and load GA. */
export function acceptAnalytics() {
  setConsent('accepted');
  loadGtag();
}

/** Decline consent, persist cookie. GA is never loaded. */
export function declineAnalytics() {
  setConsent('declined');
}

/** Send a page_view event. No-op if GA is not loaded. */
export function trackPageView(path, title) {
  if (!initialized || !window.gtag) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title
  });
}

/** Send a custom event. No-op if GA is not loaded. */
export function trackEvent(name, params = {}) {
  if (!initialized || !window.gtag) return;
  window.gtag('event', name, params);
}
