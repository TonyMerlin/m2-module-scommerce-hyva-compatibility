(function () {
    'use strict';

    window.ScommerceHyva = window.ScommerceHyva || {};
    if (window.ScommerceHyva.remarketing) {
        return;
    }

    function formatPrice(priceValue) {
        let val = priceValue;
        if (typeof val === 'string') {
            val = val.replace(/,/g, '');
        }
        return parseFloat(parseFloat(val).toFixed(2));
    }

    window.ScommerceHyva.remarketing = function (tracking, pageType, remarketingType, sendCategoryPath) {
        let result = remarketingType === 1
            ? {dynx_pagetype: pageType, dynx_itemid: '', dynx_totalvalue: 0}
            : {ecomm_pagetype: pageType, ecomm_prodid: '', ecomm_totalvalue: 0};

        if (pageType === 'product') {
            const productData = tracking.getProductData();
            if (!productData) {
                return result;
            }
            const price = formatPrice(productData.price);
            if (remarketingType === 1) {
                result.dynx_pagetype = 'offerdetail';
                result.dynx_itemid = productData.id;
                result.dynx_totalvalue = price;
            } else {
                result.ecomm_prodid = productData.id;
                result.ecomm_totalvalue = price;
                result.ecomm_pvalue = price;
                result.ecomm_category = sendCategoryPath === 1
                    ? tracking.getData('category_full')
                    : tracking.getData('category_plain');
            }
            return result;
        }

        if (['home', 'other', 'searchresults', 'category'].indexOf(pageType) !== -1) {
            const productsData = tracking.getCategoryProducts() || [];
            const products = [];
            let total = 0;
            productsData.forEach(function (product) {
                products.push(product.id);
                total += formatPrice(product.price);
            });
            total = formatPrice(total);
            if (remarketingType === 1) {
                result.dynx_pagetype = 'other';
                result.dynx_itemid = products;
                result.dynx_totalvalue = total;
            } else {
                result.ecomm_prodid = products;
                result.ecomm_totalvalue = total;
            }
            return result;
        }

        if (pageType === 'cart' || pageType === 'checkout') {
            const cartData = tracking.getCartData() || [];
            const products = [];
            let qtys = 0;
            cartData.forEach(function (product) {
                products.push(product.id);
                qtys += Number(product.quantity || 0);
            });
            const total = formatPrice(tracking.getData('total'));
            if (remarketingType === 1) {
                result.dynx_pagetype = 'conversionintent';
                result.dynx_itemid = products;
                result.dynx_totalvalue = total;
                result.dynx_quantity = parseFloat(qtys);
            } else {
                result.ecomm_prodid = products;
                result.ecomm_totalvalue = total;
                result.ecomm_quantity = parseFloat(qtys);
            }
            return result;
        }

        if (pageType === 'purchase') {
            const purchaseData = tracking.getPurchaseData();
            if (!purchaseData) {
                return result;
            }
            const products = [];
            const prices = [];
            let qtys = 0;
            (purchaseData.products || []).forEach(function (product) {
                products.push(product.id);
                qtys += Number(product.quantity || 0);
                prices.push(formatPrice(product.price));
            });
            const total = formatPrice(purchaseData.revenue);
            if (remarketingType === 1) {
                result.dynx_pagetype = 'conversion';
                result.dynx_itemid = products;
                result.dynx_totalvalue = total;
                result.dynx_quantity = parseFloat(qtys);
            } else {
                result.ecomm_prodid = products;
                result.ecomm_totalvalue = total;
                result.ecomm_quantity = parseFloat(qtys);
                result.ecomm_pvalue = prices;
            }
            result.hasaccount = tracking.getData('isGuest') === 1 ? 'N' : 'Y';
        }

        return result;
    };
})();
