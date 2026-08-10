(function () {
    'use strict';

    if (window.ScommerceHyva && window.ScommerceHyva.tracking) {
        return;
    }

    const events = [
        'page_view', 'page_ready', 'promo_view', 'promo_click', 'view_list', 'item_click',
        'view_item', 'add_to_cart', 'remove_from_cart', 'begin_checkout', 'checkout_step',
        'checkout_option', 'purchase', 'listing_scroll', 'home_page', 'view_cart', 'add_to_wishlist'
    ];

    window.ScommerceHyva = window.ScommerceHyva || {};
    window.ScommerceHyva.config = window.ScommerceHyva.config || {};
    window.scTrackingData = window.scTrackingData || {
        productList: [],
        subscribers: {},
        _fireEvents: false,
        _eventsQueue: [],
        _loggerEnabled: false
    };

    events.forEach(function (eventName) {
        window.scTrackingData.subscribers[eventName] = window.scTrackingData.subscribers[eventName] || [];
    });

    function clone(data) {
        return JSON.parse(JSON.stringify(data));
    }

    function getStorageData() {
        try {
            const raw = localStorage.getItem('sc-tracking-data');
            if (!raw) {
                return null;
            }
            const parsed = JSON.parse(raw);
            return parsed && Array.isArray(parsed.product_list) ? parsed : null;
        } catch (error) {
            return null;
        }
    }

    function postForm(url, data) {
        if (!url) {
            return Promise.resolve(null);
        }
        const body = new URLSearchParams();
        Object.keys(data || {}).forEach(function (key) {
            if (data[key] !== undefined && data[key] !== null) {
                body.append(key, String(data[key]));
            }
        });
        return fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
            body: body.toString()
        });
    }

    const tracking = {
        _internalData: window.scTrackingData,

        _logData: function (data) {
            if (this._internalData._loggerEnabled === true) {
                try {
                    console.log('[ScommerceHyva]', clone(data));
                } catch (error) {
                    console.log('[ScommerceHyva]', data);
                }
            }
        },

        enableLogs: function () {
            this._internalData._loggerEnabled = true;
        },

        disableLogs: function () {
            this._internalData._loggerEnabled = false;
        },

        formatPrice: function (priceValue, asString) {
            let val = priceValue;
            if (typeof val === 'string') {
                val = val.replace(/,/g, '');
            }
            const parsed = parseFloat(val);
            if (asString === true) {
                return parsed.toFixed(2);
            }
            return parseFloat(parsed.toFixed(2));
        },

        getListId: function (listName) {
            if (listName === undefined || listName === 'undefined' || listName === null || listName === 'null') {
                listName = this.getSendDefaultList() ? this.getDefaultList() : '';
            }
            return String(listName || '').trim().replace(/[^\w ]/g, ' ').replace(/\s\s+/g, ' ').replace(/\s/g, '_').toLowerCase();
        },

        startEvents: function () {
            if (this._internalData._fireEvents === true) {
                return;
            }
            this._internalData._fireEvents = true;
            while (this._internalData._eventsQueue.length > 0) {
                const event = this._internalData._eventsQueue.shift();
                this.fire(event.eventName, event.data);
            }
        },

        setData: function (key, data) {
            this._internalData[key] = data;
        },

        getData: function (key) {
            return this._internalData[key];
        },

        setPageType: function (pageType) {
            this._logData(pageType);
            this._internalData.pageType = pageType;
            this.fire('page_view', pageType);
        },

        setSendFullList: function (value) { this._internalData.sendFullList = value; },
        getSendFullList: function () { return this.getData('sendFullList'); },
        setSendDefaultList: function (value) { this._internalData.sendDefaultList = value; },
        getSendDefaultList: function () { return this.getData('sendDefaultList'); },
        setDefaultList: function (value) { this._internalData.defaultList = value; },
        getDefaultList: function () { return this.getData('defaultList'); },
        getPageType: function () { return this._internalData.pageType; },
        setCurrency: function (value) { this._internalData.currency = value; },
        getCurrency: function () { return this._internalData.currency; },

        setPromotions: function (promotions) {
            this._logData(promotions);
            this.setData('promotions', promotions);
            this.fire('promo_view', promotions);
        },

        getPromotions: function () { return this.getData('promotions'); },

        setAddToCart: function (cartData) {
            this._logData(cartData);
            if (!Array.isArray(cartData)) {
                return;
            }
            cartData.forEach(function (item) {
                if (item.list === undefined) {
                    item.list = tracking.getProductImpression(item.allSkus);
                }
                item.price = tracking.formatPrice(item.price, true);
                item.qty = tracking.formatPrice(item.qty);
                delete item.allSkus;
            });
            this.setData('addToCart', cartData);
            this.fire('add_to_cart', cartData);
        },

        setAddToWishlist: function (data) {
            this._logData(data);
            this.setData('addToWishlist', data);
            this.fire('add_to_wishlist', data);
        },

        getAddedToCart: function () { return this.getData('addToCart'); },

        setRemoveFromCart: function (cartData) {
            this._logData(cartData);
            if (!cartData || Array.isArray(cartData)) {
                return;
            }
            cartData.price = this.formatPrice(cartData.price, true);
            this.setData('removeFromCart', cartData);
            this.fire('remove_from_cart', cartData);
            this._removeFromStorage(cartData);
        },

        _removeFromStorage: function (cartData) {
            const cart = this.getCartData();
            const newSkus = cartData.allSkus;
            if (!Array.isArray(cart) || !Array.isArray(newSkus)) {
                return;
            }
            for (let i = 0; i < cart.length; i++) {
                const skus = cart[i].allSkus;
                if (!Array.isArray(skus)) {
                    continue;
                }
                let matchCount = 0;
                skus.forEach(function (sku) {
                    if (newSkus.indexOf(sku) !== -1) {
                        matchCount++;
                    }
                });
                if (matchCount === skus.length) {
                    cart.splice(i, 1);
                    break;
                }
            }
        },

        _getFilteredItems: function (data) {
            return (data || []).map(function (item) {
                const result = clone(item);
                delete result.allSkus;
                return result;
            });
        },

        getRemoveFromCart: function () { return this.getData('removeFromCart'); },

        setCartData: function (data) {
            this._logData(data);
            (data || []).forEach(function (item) {
                item.quantity = parseFloat(item.quantity);
                item.price = tracking.formatPrice(item.price, true);
            });
            this.setData('cart', data);
            this.fire('begin_checkout', this._getFilteredItems(data));
        },

        setCheckoutStep: function (step) {
            const stepData = {
                step: step.step,
                option: step.option,
                products: this._getFilteredItems(step.products),
                stepType: step.stepType
            };
            this.setData('checkoutStep', stepData);
            this.fire('checkout_step', stepData);
        },

        setCheckoutOption: function (option) {
            this.setData('checkoutOption', option);
            this.fire('checkout_option', option);
        },

        getCartData: function () { return this.getData('cart'); },

        setPurchaseData: function (data) {
            this._logData(data);
            if (!data) {
                return;
            }
            data.affiliation = data.affiliation == null ? '' : data.affiliation;
            data.coupon = data.coupon == null ? '' : data.coupon;
            data.revenue = this.formatPrice(data.revenue, true);
            data.tax = this.formatPrice(data.tax, true);
            data.shipping = this.formatPrice(data.shipping, true);
            data.products = (data.products || []).map(function (product) {
                product.quantity = parseFloat(product.quantity);
                product.price = tracking.formatPrice(product.price, true);
                delete product.allSkus;
                return product;
            });
            this.setData('purchase', data);
            this.fire('purchase', data);
        },

        getPurchaseData: function () { return this.getData('purchase'); },

        findProductInList: function (id, list) {
            if (!Array.isArray(list)) {
                return '';
            }
            for (let i = 0; i < list.length; i++) {
                if (list[i].id === id) {
                    return list[i];
                }
            }
            return '';
        },

        _getProductFromStorage: function (productId) {
            const ids = Array.isArray(productId) ? productId : [productId];
            const storage = getStorageData();
            if (!storage) {
                return false;
            }
            for (let i = 0; i < ids.length; i++) {
                const item = this.findProductInList(ids[i], storage.product_list);
                if (item !== '') {
                    return item;
                }
            }
            return false;
        },

        getProductImpression: function (productId) {
            const item = this._getProductFromStorage(productId);
            return item !== false && item !== '' ? item.list : this.getDefaultList();
        },

        setProductImpression: function (productId, list) {
            let storage = getStorageData();
            if (!storage) {
                storage = {product_list: []};
            }
            const item = this.findProductInList(productId, storage.product_list);
            if (item !== '') {
                item.list = list;
            } else {
                storage.product_list.push({id: productId, list: list});
            }
            try {
                localStorage.setItem('sc-tracking-data', JSON.stringify(storage));
            } catch (error) {}
        },

        clearProductImpressions: function () {
            try {
                localStorage.setItem('sc-tracking-data', null);
            } catch (error) {}
        },

        findProductByUrl: function (url) {
            if (!url) {
                return false;
            }
            const normalized = String(url).split('#')[0];
            for (let i = 0; i < this._internalData.productList.length; i++) {
                const item = this._internalData.productList[i];
                if (String(item.url || '').split('#')[0] === normalized) {
                    return item;
                }
            }
            return false;
        },

        setImpressionListData: function (listData, skipFireEvent) {
            this._logData(listData);
            if (!Array.isArray(listData) || listData.length === 0) {
                return;
            }
            listData.forEach(function (item) {
                tracking._internalData.productList.push(item);
                tracking.setProductImpression(item.id, item.list);
            });
            if (skipFireEvent !== true) {
                this.fire('view_list', listData);
            }
        },

        setProductData: function (data) {
            this._logData(data);
            data.list = this.getProductImpression(data.id);
            this._internalData.productData = data;
            this.fire('view_item', data);
        },

        getProductData: function () { return this.getData('productData'); },
        getCategoryProducts: function () { return this.getData('productList'); },

        setScrollImpression: function (data, fixPosition) {
            this._logData(data);
            if (fixPosition === undefined || fixPosition === true) {
                const lastPos = this._internalData.productList.length;
                (data || []).forEach(function (item, index) {
                    item.position = lastPos + index + 1;
                    tracking._internalData.productList.push(item);
                    tracking.setProductImpression(item.id, item.list);
                });
            }
            this.fire('listing_scroll', data);
        },

        subscribe: function (eventName, callback) {
            if (!this._internalData.subscribers[eventName]) {
                this._internalData.subscribers[eventName] = [];
            }
            this._internalData.subscribers[eventName].push(callback);
        },

        fire: function (eventName, data) {
            if (this._internalData._fireEvents === false) {
                this._internalData._eventsQueue.push({eventName: eventName, data: data});
                return;
            }
            (this._internalData.subscribers[eventName] || []).forEach(function (callback) {
                try {
                    callback(data);
                } catch (error) {
                    console.error('[ScommerceHyva] subscriber failed for ' + eventName, error);
                }
            });
        },

        sendQuoteImpression: function (productId, list) {
            return postForm(window.ScommerceHyva.config.saveImpressionUrl, {id: productId, list: list});
        }
    };

    window.ScommerceHyva.tracking = tracking;
    window.ScommerceHyva.getTracking = function () { return tracking; };
})();
