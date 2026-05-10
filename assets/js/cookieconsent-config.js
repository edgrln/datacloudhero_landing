import * as CookieConsent from '../vendor/cookieconsent/cookieconsent.esm.js';

const GTM_ID = 'GTM-MKSVW4QD';

const CAT_NECESSARY = 'necessary';
const CAT_ANALYTICS = 'analytics';
const CAT_MARKETING = 'marketing';

const isDatacloudheroDomain =
  window.location.hostname === 'datacloudhero.com' ||
  window.location.hostname.endsWith('.datacloudhero.com');

const COOKIE_DOMAIN = isDatacloudheroDomain
  ? 'datacloudhero.com'
  : window.location.hostname;

window.dataLayer = window.dataLayer || [];

window.gtag = function gtag() {
  window.dataLayer.push(arguments);
};

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

function getConsentState() {
  return {
    analyticsGranted: CookieConsent.acceptedCategory(CAT_ANALYTICS),
    marketingGranted: CookieConsent.acceptedCategory(CAT_MARKETING),
  };
}

function updateGoogleConsent() {
  const { analyticsGranted, marketingGranted } = getConsentState();

  window.gtag('consent', 'update', {
    analytics_storage: analyticsGranted ? 'granted' : 'denied',

    ad_storage: marketingGranted ? 'granted' : 'denied',
    ad_user_data: marketingGranted ? 'granted' : 'denied',
    ad_personalization: marketingGranted ? 'granted' : 'denied',

    functionality_storage: 'granted',
    security_storage: 'granted',
    personalization_storage: 'denied',
  });

  window.dataLayer.push({
    event: 'cookie_consent_update',
    analytics_consent: analyticsGranted ? 'granted' : 'denied',
    marketing_consent: marketingGranted ? 'granted' : 'denied',
  });
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

function updateConsentAndLoadGtmIfNeeded() {
  updateGoogleConsent();

  const { analyticsGranted, marketingGranted } = getConsentState();

  if (analyticsGranted || marketingGranted) {
    loadGtm();
  }
}

CookieConsent.run({
  mode: 'opt-in',

  revision: 1,

  cookie: {
    name: 'cc_cookie',
    domain: COOKIE_DOMAIN,
    path: '/',
    secure: window.location.protocol === 'https:',
    sameSite: 'Lax',
    expiresAfterDays: 180,
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
          { name: /^_ga/ },
          { name: '_gid' },
          { name: /^_ga/, domain: COOKIE_DOMAIN },
          { name: '_gid', domain: COOKIE_DOMAIN },
        ],
      },
    },

    [CAT_MARKETING]: {
      autoClear: {
        cookies: [
          { name: /^_gcl_/ },
          { name: '_fbp' },
          { name: '_fbc' },
          { name: 'li_fat_id' },

          { name: /^_gcl_/, domain: COOKIE_DOMAIN },
          { name: '_fbp', domain: COOKIE_DOMAIN },
          { name: '_fbc', domain: COOKIE_DOMAIN },
          { name: 'li_fat_id', domain: COOKIE_DOMAIN },
        ],
      },
    },
  },

  onConsent: updateConsentAndLoadGtmIfNeeded,
  onChange: updateConsentAndLoadGtmIfNeeded,

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