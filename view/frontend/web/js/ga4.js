(function () {
    'use strict';

    window.ScommerceHyva = window.ScommerceHyva || {};
    if (window.ScommerceHyva.ga4) {
        return;
    }

    function addCategories(item, category) {
        const categories = String(category || '').split('->');
        item.item_category = categories[0] || '';
        for (let i = 1; i < categories.length; i++) {
            item['item_category' + (i + 1)] = categories[i];
        }
    }

    window.ScommerceHyva.ga4 = {
        convertPromotions: function (tracking, data) {
            if (!Array.isArray(data)) {
                return [];
            }
            return data.map(function (promo) {
                return {
                    promotion_name: promo.name,
                    promotion_id: promo.id,
                    location_id: promo.position,
                    creative_name: promo.creative,
                    creative_slot: promo.slot
                };
            });
        },

        convertItemList: function (tracking, data) {
            return (data || []).map(function (product) {
                const item = {
                    item_id: product.id,
                    item_name: product.name,
                    price: tracking.formatPrice(product.price, false),
                    item_brand: product.brand,
                    item_list_name: product.list,
                    item_list_id: tracking.getListId(product.list),
                    index: product.position,
                    quantity: 1
                };
                if (tracking.getData('affiliation') !== '') {
                    item.affiliation = tracking.getData('affiliation');
                }
                addCategories(item, product.category);
                return item;
            });
        },

        convertAddToCartItem: function (tracking, data) {
            return (data || []).map(function (product, index) {
                const item = {
                    item_name: product.name,
                    item_id: product.id,
                    price: tracking.formatPrice(product.price, false),
                    item_brand: product.brand,
                    quantity: product.quantity,
                    index: index + 1
                };
                if (tracking.getSendDefaultList() == '1' || tracking.getDefaultList() != product.list) {
                    item.item_list_name = product.list;
                    item.item_list_id = tracking.getListId(product.list);
                }
                if (tracking.getData('affiliation') !== '') {
                    item.affiliation = tracking.getData('affiliation');
                }
                addCategories(item, product.category);
                return item;
            });
        },

        convertCheckoutItems: function (tracking, data) {
            return (data || []).map(function (source, index) {
                const product = Object.assign({}, source);
                const item = {
                    item_name: product.name,
                    item_id: product.id,
                    price: tracking.formatPrice(product.price, false),
                    item_brand: product.brand,
                    item_category: product.category,
                    quantity: product.quantity,
                    index: index + 1
                };
                if (tracking.getDefaultList() == product.list) {
                    const stored = tracking._getProductFromStorage(product.id);
                    if (stored) {
                        product.list = stored.list;
                    }
                }
                if (tracking.getSendDefaultList() == '1' || tracking.getDefaultList() != product.list) {
                    item.item_list_name = product.list;
                    item.item_list_id = tracking.getListId(product.list);
                }
                if (tracking.getData('affiliation') !== '') {
                    item.affiliation = tracking.getData('affiliation');
                }
                addCategories(item, product.category);
                return item;
            });
        },

        convertPurchaseItems: function (tracking, data, conversionPii) {
            return (data || []).map(function (product, index) {
                const item = {
                    item_name: product.name,
                    item_id: product.id,
                    price: tracking.formatPrice(product.price, false),
                    item_brand: product.brand,
                    affiliation: tracking.getData('affiliation'),
                    index: index + 1
                };
                if (tracking.getSendDefaultList() == '1' || tracking.getDefaultList() != product.list) {
                    item.item_list_name = product.list;
                    item.item_list_id = tracking.getListId(product.list);
                }
                addCategories(item, product.category);
                if (conversionPii) {
                    item.price_excl_tax = tracking.formatPrice(product.price_excl_tax, false);
                    item.qty = tracking.formatPrice(product.quantity, false);
                } else {
                    item.quantity = product.quantity;
                }
                return item;
            });
        },

        convertWishlistItems: function (tracking, data) {
            const product = data.item;
            const item = {
                item_name: product.name,
                item_id: product.id,
                price: tracking.formatPrice(product.price, false),
                item_brand: product.brand,
                item_category: product.category,
                quantity: Number(product.quantity),
                index: 1
            };
            if (tracking.getSendDefaultList() == '1' || tracking.getDefaultList() != product.list) {
                item.item_list_name = product.list;
                item.item_list_id = tracking.getListId(product.list);
            }
            if (tracking.getData('affiliation') !== '') {
                item.affiliation = tracking.getData('affiliation');
            }
            addCategories(item, product.category);
            return [item];
        },

        addCategories: addCategories
    };
})();
