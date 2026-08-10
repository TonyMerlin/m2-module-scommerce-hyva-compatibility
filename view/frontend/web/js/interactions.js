(function () {
    'use strict';

    window.ScommerceHyva = window.ScommerceHyva || {};
    if (window.ScommerceHyva.interactions) {
        return;
    }

    const state = {
        initialized: false,
        cartSnapshot: null,
        wishlistPending: false,
        requestInFlight: false,
        promotionObserver: null
    };

    function getTracking() {
        return window.ScommerceHyva.tracking;
    }

    function fetchJson(url, options) {
        if (!url) {
            return Promise.resolve(null);
        }
        return fetch(url, Object.assign({credentials: 'same-origin'}, options || {}))
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                return response.json();
            });
    }

    function buildProductParams(products) {
        const params = new URLSearchParams();
        (products || []).forEach(function (product, index) {
            ['_realProductId', 'list'].forEach(function (key) {
                if (product[key] !== undefined && product[key] !== null) {
                    params.append('product[' + index + '][' + key + ']', String(product[key]));
                }
            });
        });
        return params;
    }

    function consumeAddToCart() {
        const config = window.ScommerceHyva.config;
        if (state.requestInFlight) {
            return Promise.resolve();
        }
        state.requestInFlight = true;
        return fetchJson(config.addToCartUrl)
            .then(function (products) {
                if (!Array.isArray(products) || products.length === 0) {
                    return;
                }
                products.forEach(function (product) {
                    product.list = getTracking().getProductImpression(product.allSkus);
                });
                const quoteProducts = products.map(function (product) {
                    return Object.assign({}, product);
                });
                products.forEach(function (product) {
                    if (product._realProductId && product.list) {
                        getTracking().sendQuoteImpression(product._realProductId, product.list);
                    }
                });
                getTracking().setAddToCart(products);
                const params = buildProductParams(quoteProducts);
                const separator = config.unsAddToCartUrl.indexOf('?') === -1 ? '?' : '&';
                return fetchJson(config.unsAddToCartUrl + (params.toString() ? separator + params.toString() : ''));
            })
            .catch(function (error) {
                if (getTracking().getData('debug')) {
                    console.warn('[ScommerceHyva] AddToCart tracking failed', error);
                }
            })
            .finally(function () {
                state.requestInFlight = false;
            });
    }

    function consumeRemoveFromCart() {
        const config = window.ScommerceHyva.config;
        return fetchJson(config.removeFromCartUrl)
            .then(function (product) {
                if (!product || Array.isArray(product) || !Object.keys(product).length) {
                    return;
                }
                getTracking().setRemoveFromCart(product);
                return fetchJson(config.unsRemoveFromCartUrl);
            })
            .catch(function (error) {
                if (getTracking().getData('debug')) {
                    console.warn('[ScommerceHyva] RemoveFromCart tracking failed', error);
                }
            });
    }

    function consumeWishlist() {
        const config = window.ScommerceHyva.config;
        if (!state.wishlistPending) {
            return Promise.resolve();
        }
        state.wishlistPending = false;
        return fetchJson(config.wishlistStateUrl)
            .then(function (data) {
                if (!data || !data.item) {
                    return;
                }
                data.item.list = getTracking().getProductImpression(data.item.allSkus);
                getTracking().setAddToWishlist(data);
            })
            .catch(function (error) {
                if (getTracking().getData('debug')) {
                    console.warn('[ScommerceHyva] Wishlist tracking failed', error);
                }
            });
    }

    function normalizeCart(data) {
        const cart = data && data.cart ? data.cart : data;
        if (!cart || !Array.isArray(cart.items)) {
            return {};
        }
        const snapshot = {};
        cart.items.forEach(function (item) {
            const key = String(item.item_id || item.id || item.product_id || item.product_sku || Math.random());
            snapshot[key] = Number(item.qty || item.quantity || 0);
        });
        return snapshot;
    }

    function compareCart(oldCart, newCart) {
        let added = false;
        let removed = false;
        Object.keys(newCart).forEach(function (key) {
            if (!(key in oldCart) || newCart[key] > oldCart[key]) {
                added = true;
            }
        });
        Object.keys(oldCart).forEach(function (key) {
            if (!(key in newCart) || newCart[key] < oldCart[key]) {
                removed = true;
            }
        });
        return {added: added, removed: removed};
    }

    function onPrivateContentLoaded(event) {
        const data = event && event.detail ? event.detail.data : null;
        const snapshot = normalizeCart(data);
        if (state.cartSnapshot === null) {
            state.cartSnapshot = snapshot;
            consumeWishlist();
            return;
        }
        const changes = compareCart(state.cartSnapshot, snapshot);
        state.cartSnapshot = snapshot;
        if (changes.added) {
            consumeAddToCart();
        }
        if (changes.removed) {
            consumeRemoveFromCart();
        }
        consumeWishlist();
    }

    function onClick(event) {
        const wishlist = event.target.closest('[data-addto="wishlist"]');
        if (wishlist) {
            state.wishlistPending = true;
        }

        const promo = event.target.closest('a[data-promotion]');
        if (promo) {
            getTracking().fire('promo_click', promotionFromElement(promo));
            return;
        }

        const link = event.target.closest('a[href]');
        if (!link) {
            return;
        }
        const product = getTracking().findProductByUrl(link.href);
        if (product) {
            getTracking().setProductImpression(product.id, product.list);
            getTracking().fire('item_click', product);
        }
    }

    function promotionFromElement(element) {
        return {
            id: element.dataset.id,
            name: element.dataset.name,
            creative: element.dataset.creative,
            position: element.dataset.position,
            slot: element.dataset.slot,
            href: element.href
        };
    }

    function initPromotions() {
        const elements = document.querySelectorAll('a[data-promotion][data-id]');
        if (!elements.length) {
            return;
        }
        if (!('IntersectionObserver' in window)) {
            const promotions = Array.from(elements).map(promotionFromElement);
            if (promotions.length) {
                getTracking().setPromotions(promotions);
            }
            return;
        }
        state.promotionObserver = new IntersectionObserver(function (entries, observer) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting || entry.target.dataset.scommercePromoSent === '1') {
                    return;
                }
                entry.target.dataset.scommercePromoSent = '1';
                getTracking().setPromotions([promotionFromElement(entry.target)]);
                observer.unobserve(entry.target);
            });
        }, {threshold: 0.01});
        elements.forEach(function (element) {
            state.promotionObserver.observe(element);
        });
    }

    function init() {
        if (state.initialized) {
            return;
        }
        state.initialized = true;
        document.addEventListener('click', onClick, true);
        window.addEventListener('private-content-loaded', onPrivateContentLoaded);
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initPromotions, {once: true});
        } else {
            initPromotions();
        }
    }

    window.ScommerceHyva.interactions = {
        init: init,
        consumeAddToCart: consumeAddToCart,
        consumeRemoveFromCart: consumeRemoveFromCart,
        consumeWishlist: consumeWishlist
    };
})();
