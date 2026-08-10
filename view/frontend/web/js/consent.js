(function () {
    'use strict';

    window.ScommerceHyva = window.ScommerceHyva || {};
    if (window.ScommerceHyva.consent) {
        return;
    }

    function getCookie(name) {
        if (!name) {
            return null;
        }
        const prefix = name + '=';
        const cookies = document.cookie ? document.cookie.split(';') : [];
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.indexOf(prefix) === 0) {
                return decodeURIComponent(cookie.substring(prefix.length));
            }
        }
        return null;
    }

    function pushConsent(type, value) {
        window.dataLayer = window.dataLayer || [];
        (function () { window.dataLayer.push(arguments); })('consent', type, value);
    }

    function buildConsent(config) {
        const result = {};
        Object.keys(config || {}).forEach(function (consent) {
            const entry = config[consent] || {};
            const cookieName = entry.cookie_name || '';
            const cookieValue = getCookie(cookieName);
            if (!cookieName || cookieValue === null) {
                result[consent] = entry.default_value;
            } else {
                result[consent] = String(cookieValue) === '1' ? 'granted' : 'denied';
            }
        });
        return result;
    }

    function valuesDiffer(a, b) {
        const keys = new Set(Object.keys(a || {}).concat(Object.keys(b || {})));
        for (const key of keys) {
            if ((a || {})[key] !== (b || {})[key]) {
                return true;
            }
        }
        return false;
    }

    function init(options) {
        if (!options || !options.enabled || options.amastyAuthoritative) {
            return;
        }
        let initialSent = false;

        function send() {
            const current = buildConsent(options.config || {});
            let stored = null;
            try {
                stored = JSON.parse(sessionStorage.getItem('consentDefault'));
            } catch (error) {}

            if (!initialSent) {
                pushConsent('default', current);
                initialSent = true;
                try {
                    sessionStorage.setItem('consentDefault', JSON.stringify(current));
                } catch (error) {}
                if (stored && valuesDiffer(stored, current)) {
                    pushConsent('update', current);
                }
                return;
            }

            if (!stored || valuesDiffer(stored, current)) {
                pushConsent('update', current);
                try {
                    sessionStorage.setItem('consentDefault', JSON.stringify(current));
                } catch (error) {}
            }
        }

        ['scommerceCookieSaved', 'cookiebar-action-accept-finish', 'cookiebar-action-allow-finish', 'amasty-cookie-group-updated']
            .forEach(function (eventName) {
                window.addEventListener(eventName, send);
                document.addEventListener(eventName, send);
            });
        send();
    }

    window.ScommerceHyva.consent = {init: init, getCookie: getCookie};
})();
