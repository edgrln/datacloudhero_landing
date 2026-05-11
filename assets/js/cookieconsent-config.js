import * as CookieConsent from '../vendor/cookieconsent/cookieconsent.esm.js';

const GTM_ID = 'GTM-MKSVW4QD';

const CAT_NECESSARY = 'necessary';
const CAT_ANALYTICS = 'analytics';
const CAT_MARKETING = 'marketing';

const COOKIE_CONSENT_NAME = 'cc_cookie';

// Shared cookies между blog.datacloudhero.com и datacloudhero.com
const SHARED_ANALYTICS_COOKIE = 'gtm_consent';
const SHARED_MARKETING_COOKIE = 'dch_marketing_consent';

const COOKIE_DAYS = 180;

const isDatacloudheroDomain =
  window.location.hostname === 'datacloudhero.com' ||
  window.location.hostname.endsWith('.datacloudhero.com');

const COOKIE_DOMAIN = isDatacloudheroDomain
  ? '.datacloudhero.com'
  : window.location.hostname;

window.dataLayer = window.dataLayer || [];

window.gtag = function gtag() {
  window.dataLayer.push(arguments);
};

function getCookieValue(name) {
  const escapedName = name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&');

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${escapedName}=([^;]*)`),
  );

  return match ? decodeURIComponent(match[1]) : null;
}

function setSharedCookie(name, value) {
  const expires = new Date();
  expires.setTime(expires.getTime() + COOKIE_DAYS * 24 * 60 * 60 * 1000);

  let cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

  if (window.location.protocol === 'https:') {
    cookie += '; Secure';
  }

  if (isDatacloudheroDomain) {
    cookie += `; Domain=${COOKIE_DOMAIN}`;
  }

  document.cookie = cookie;
}

function hasSharedConsent() {
  return (
    getCookieValue(SHARED_ANALYTICS_COOKIE) !== null ||
    getCookieValue(SHARED_MARKETING_COOKIE) !== null
  );
}

function getSharedConsentState() {
  return {
    analyticsGranted: getCookieValue(SHARED_ANALYTICS_COOKIE) === 'true',
    marketingGranted: getCookieValue(SHARED_MARKETING_COOKIE) === 'true',
  };
}

function getCookieConsentState() {
  return {
    analyticsGranted: CookieConsent.acceptedCategory(CAT_ANALYTICS),
    marketingGranted: CookieConsent.acceptedCategory(CAT_MARKETING),
  };
}

function syncCcCookieFromSharedConsent() {
  if (!hasSharedConsent()) {
    return;
  }

  const {analyticsGranted, marketingGranted} = getSharedConsentState();

  const categories = [CAT_NECESSARY];

  if (analyticsGranted) {
    categories.push(CAT_ANALYTICS);
  }

  if (marketingGranted) {
    categories.push(CAT_MARKETING);
  }

  const existingCcCookie = getCookieValue(COOKIE_CONSENT_NAME);

  let previousConsentId = null;
  let previousConsentTimestamp = null;

  if (existingCcCookie) {
    try {
      const parsed = JSON.parse(existingCcCookie);

      previousConsentId = parsed.consentId || null;
      previousConsentTimestamp = parsed.consentTimestamp || null;
    } catch {
      // ignore invalid old cc_cookie
    }
  }

  const now = new Date().toISOString();

  const ccCookieValue = {
    categories,
    revision: 1,
    data: null,
    consentTimestamp: previousConsentTimestamp || now,
    consentId:
      previousConsentId ||
      window.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    services: {},
    languageCode: 'en',
    lastConsentTimestamp: now,
  };

  setSharedCookie(
    COOKIE_CONSENT_NAME,
    encodeURIComponent(JSON.stringify(ccCookieValue)),
  );
}

function applyGoogleConsent({analyticsGranted, marketingGranted}) {
  window.gtag('consent', 'update', {
    analytics_storage: analyticsGranted ? 'granted' : 'denied',

    ad_storage: marketingGranted ? 'granted' : 'denied',
    ad_user_data: marketingGranted ? 'granted' : 'denied',
    ad_personalization: marketingGranted ? 'granted' : 'denied',

    functionality_storage: 'granted',
    security_storage: 'granted',
    personalization_storage: 'denied',
  });
}

function pushConsentUpdateEvent({analyticsGranted, marketingGranted}) {
  window.dataLayer.push({
    event: 'cookie_consent_update',
    analytics_consent: analyticsGranted ? 'granted' : 'denied',
    marketing_consent: marketingGranted ? 'granted' : 'denied',
  });
}

function syncSharedConsentCookies({analyticsGranted, marketingGranted}) {
  setSharedCookie(
    SHARED_ANALYTICS_COOKIE,
    analyticsGranted ? 'true' : 'false',
  );

  setSharedCookie(
    SHARED_MARKETING_COOKIE,
    marketingGranted ? 'true' : 'false',
  );
}

function updateGoogleConsent() {
  const consentState = getCookieConsentState();

  syncSharedConsentCookies(consentState);
  applyGoogleConsent(consentState);
  pushConsentUpdateEvent(consentState);
}

function loadGtm() {
  if (window.__gtmLoaded) {
    return;
  }

  window.__gtmLoaded = true;

  window.dataLayer.push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js',
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;

  document.head.appendChild(script);
}

// 1. Сначала default denied.
window.gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  functionality_storage: 'granted',
  security_storage: 'granted',
  personalization_storage: 'denied',
  wait_for_update: 500,
});

// 2. Если consent уже пришёл с блога — синхронизируем cc_cookie,
// чтобы UI Orestbida показывал актуальные переключатели.
syncCcCookieFromSharedConsent();

// 3. Если есть shared consent — применяем его до загрузки GTM.
if (hasSharedConsent()) {
  const sharedConsentState = getSharedConsentState();

  applyGoogleConsent(sharedConsentState);
  pushConsentUpdateEvent(sharedConsentState);
}

// 4. Загружаем GTM.
loadGtm();

CookieConsent.run({
  mode: 'opt-in',

  revision: 1,

  // Если есть shared consent с блога, баннер не показываем.
  autoShow: !hasSharedConsent(),

  cookie: {
    name: COOKIE_CONSENT_NAME,
    domain: COOKIE_DOMAIN,
    path: '/',
    secure: window.location.protocol === 'https:',
    sameSite: 'Lax',
    expiresAfterDays: COOKIE_DAYS,
  },

  guiOptions: {
    consentModal: {
      layout: 'box',
      position: 'bottom right',
      equalWeightButtons: true,
      flipButtons: false,
    },
    preferencesModal: {
      layout: 'box',
      equalWeightButtons: true,
      flipButtons: false,
    },
  },

  categories: {
    [CAT_NECESSARY]: {
      enabled: true,
      readOnly: true,
    },

    [CAT_ANALYTICS]: {
      autoClear: {
        cookies: [
          {name: /^_ga/},
          {name: '_gid'},
          {name: /^_ga/, domain: COOKIE_DOMAIN},
          {name: '_gid', domain: COOKIE_DOMAIN},
        ],
      },
    },

    [CAT_MARKETING]: {
      autoClear: {
        cookies: [
          {name: /^_gcl_/},
          {name: '_fbp'},
          {name: '_fbc'},
          {name: 'li_fat_id'},

          {name: /^_gcl_/, domain: COOKIE_DOMAIN},
          {name: '_fbp', domain: COOKIE_DOMAIN},
          {name: '_fbc', domain: COOKIE_DOMAIN},
          {name: 'li_fat_id', domain: COOKIE_DOMAIN},
        ],
      },
    },
  },

  onConsent: updateGoogleConsent,
  onChange: updateGoogleConsent,

  language: {
    default: 'en',
    translations: {
      en: {
        consentModal: {
          title: 'We use cookies',
          description:
            'We use cookies to measure website usage and improve our marketing. You can accept all cookies, reject optional cookies, or customize your choices.',
          acceptAllBtn: 'Accept all',
          acceptNecessaryBtn: 'Reject all',
          showPreferencesBtn: 'Customize',
        },

        preferencesModal: {
          title: 'Cookie settings',
          acceptAllBtn: 'Accept all',
          acceptNecessaryBtn: 'Reject all',
          savePreferencesBtn: 'Save settings',
          closeIconLabel: 'Close',

          sections: [
            {
              title: 'Cookie usage',
              description:
                'We use cookies to keep the website working, measure traffic, and improve our advertising. You can change your choices at any time.',
            },

            {
              title: 'Strictly necessary cookies',
              description:
                'These cookies are required for the website to work and cannot be disabled.',
              linkedCategory: CAT_NECESSARY,
            },

            {
              title: 'Analytics cookies',
              description:
                'These cookies help us understand how visitors use the website. For example, we use Google Analytics 4.',
              linkedCategory: CAT_ANALYTICS,
            },

            {
              title: 'Marketing cookies',
              description:
                'These cookies help us measure and improve advertising campaigns. This may include Google Ads, Meta Pixel, and LinkedIn Insight Tag.',
              linkedCategory: CAT_MARKETING,
            },

            {
              title: 'More information',
              description:
                'For more details, please read our Privacy Policy and Cookie Policy.',
            },
          ],
        },
      },
    },
  },
});