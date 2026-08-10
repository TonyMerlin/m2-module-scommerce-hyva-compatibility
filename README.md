# m2-module-scommerce-hyva-compatibility

HyvÃ compatibility layer for the Scommerce tracking and Google Tag Manager Pro extensions used on Magento 2 storefronts.

This module allows the existing Scommerce tracking stack to operate on a HyvÃ storefront **without loading RequireJS, jQuery, Knockout, Magento UI components, `mage/*` AMD modules, or other Luma frontend dependencies into HyvÃ**.

The module does **not** replace Scommerce as the source of tracking data. Wherever possible it keeps the existing Scommerce PHP-side implementation, configuration, observers, controllers, session state, product/category generation, quote attribution, GA4 payload conventions, and dynamic remarketing rules. It replaces only the browser-side execution layer that is incompatible with HyvÃ.

---

## Module information

- **Magento module:** `Merlin_ScommerceHyvaCompatibility`
- **PHP namespace:** `Merlin\ScommerceHyvaCompatibility`
- **Package:** `merlin/module-scommerce-hyva-compatibility`
- **Module version:** `1.0.0`
- **Built against Magento:** Magento 2.4.8-p5
- **Frontend:** HyvÃ
- **Checkout:** Luma fallback checkout
- **Scommerce TrackingBase audited version:** `2.0.39`
- **Scommerce GoogleTagManagerPro audited version:** `3.0.46`
- **Amasty GDPR Cookie HyvÃ audited version:** `2.7.0`
- **Amasty Google Consent Mode HyvÃ audited version:** `1.2.0`

The Composer package deliberately requires the exact Scommerce versions that were audited when this compatibility layer was written:

```json
"scommerce/trackingbase": "2.0.39",
"scommerce/googletagmanagerpro": "3.0.46"
```

If either Scommerce package is upgraded, re-audit the upstream frontend implementation before relaxing these constraints. See **Upgrading Scommerce** below.

---

# Why this module exists

The original Scommerce modules were written around Magento's Luma frontend architecture.

Several Scommerce templates execute AMD code such as:

```js
require([
    'jquery',
    'scTrackingData',
    'mage/url',
    'mage/translate'
], function (...) {
    // ...
});
```

and:

```js
require([
    'jquery',
    'scTrackingData',
    'remarketing',
    'mage/cookies'
], function (...) {
    // ...
});
```

On a genuine HyvÃ page RequireJS is intentionally absent, so this results in errors such as:

```text
Uncaught ReferenceError: require is not defined
```

The problem is deeper than the inline `require()` calls. Scommerce's original core tracking module also depends on Magento UI:

```text
Scommerce_TrackingBase/js/tracking-data
    -> jQuery
    -> uiClass
    -> mage/url
```

Other parts rely on Luma-specific behaviour including:

- `ajax:addToCart`
- `ajax:addToWishlist`
- `Magento_Checkout/js/sidebar`
- jQuery widget mixins
- `$.ajax()` / `$.post()`
- jQuery cookie handling
- jQuery scroll/viewport plugins
- Knockout checkout subscriptions
- `Magento_Checkout/js/model/quote`

Loading RequireJS and jQuery into HyvÃ merely to satisfy these dependencies would defeat one of the main purposes of HyvÃ and would unnecessarily reintroduce the Luma frontend stack.

`Merlin_ScommerceHyvaCompatibility` instead provides a native browser implementation using:

- `fetch()`
- `CustomEvent`
- `addEventListener()`
- `querySelector()` / `querySelectorAll()`
- `closest()`
- `dataset`
- `URLSearchParams`
- `IntersectionObserver`
- Magento/HyvÃ customer-section events
- standard browser cookies/localStorage/sessionStorage

---

# Design principle

The module follows one central rule:

> **Keep Scommerce's server-side tracking logic; replace only the incompatible HyvÃ browser execution layer.**

This is important because Scommerce already contains substantial Magento-aware logic for:

- determining product IDs/SKUs
- configurable/simple product relationships
- product prices
- brand
- category hierarchy
- variants
- cart quantities
- quote items
- wishlist additions
- purchase data
- list attribution
- currency
- affiliation
- order totals
- coupon information
- enhanced conversion data

Recreating that information from HyvÃ DOM markup would be less reliable and would cause the HyvÃ implementation to diverge from the original Scommerce extension.

---

# What is kept from Scommerce

The compatibility module intentionally retains the existing Scommerce backend wherever possible.

## PHP data generation

The original Scommerce Blocks/ViewModels/helpers continue to generate tracking data.

This includes the existing implementations responsible for:

- product data
- product lists
- related products
- upsell products
- cross-sells
- cart products
- purchase products
- category hierarchy
- product brand
- product variant
- product price
- currency
- affiliation
- list names
- list IDs
- checkout/order information
- enhanced conversion data

The compatibility templates consume these same PHP-generated structures instead of rebuilding them client-side.

## Magento observers

Scommerce's server observers remain authoritative for cart and wishlist state.

In particular, the original observer flow that stores tracking information in session is retained for:

- products added to cart
- products removed from cart
- products added to wishlist
- quote/list attribution

The HyvÃ layer consumes this state rather than guessing from DOM data.

## Existing Scommerce controllers/endpoints

The compatibility JavaScript continues to use the existing Scommerce routes where appropriate, including:

```text
sctracking/index/addtocart
sctracking/index/unsaddtocart
sctracking/index/removefromcart
sctracking/index/unsremovefromcart
sctracking/index/saveimpression
```

These routes remain part of the original tracking flow.

## LocalStorage attribution format

The original Scommerce storage key is deliberately preserved:

```js
localStorage['sc-tracking-data']
```

including the existing product/list structure:

```json
{
    "product_list": [
        {
            "id": "123",
            "list": "Category Name"
        }
    ]
}
```

This is especially important because this installation uses **HyvÃ for the storefront but Luma fallback for checkout**.

Both runtimes therefore need to understand the same browser state:

```text
HyvÃ category/product pages
        |
        | writes sc-tracking-data
        v
Luma fallback checkout
        |
        | original Scommerce runtime reads the same data
        v
checkout / purchase attribution
```

No Merlin-specific replacement storage schema is introduced.

## GA4 semantics

The existing Scommerce GA4 payload conventions have been retained, including fields such as:

- `item_id`
- `item_name`
- `price`
- `quantity`
- `item_brand`
- `item_variant`
- `item_list_name`
- `item_list_id`
- `index`
- `affiliation`
- `item_category`
- `item_category2`, `item_category3`, etc.

The compatibility implementation also retains Scommerce's deliberate use of:

```js
window.dataLayer.push({ ecommerce: null });
```

before applicable ecommerce events.

This is not removed or "simplified" because existing GTM tags/triggers may depend on Scommerce's current dataLayer behaviour.

## Dynamic remarketing algorithm

The native `remarketing.js` is based on the actual behaviour of Scommerce's original AMD `remarketing` module.

It retains support for the Scommerce-generated Google remarketing structures, including:

```text
dynx_pagetype
dynx_itemid
dynx_totalvalue
dynx_quantity
```

and:

```text
ecomm_prodid
ecomm_totalvalue
ecomm_pvalue
ecomm_category
ecomm_quantity
hasaccount
```

The parameters were not recreated from assumptions about Google Ads; the existing Scommerce logic was ported to a HyvÃ-safe execution model.

---

# What is rewritten for HyvÃ

The following parts of the original frontend cannot safely run on HyvÃ and are replaced by this module.

## Scommerce_TrackingBase

### Original `tracking_data.phtml`

Original responsibilities include:

- creating/configuring the Tracking object
- page type
- currency
- list settings
- consent mode
- AddToCart
- RemoveFromCart
- AddToWishlist
- product-click attribution
- promotion tracking
- page-ready handling

The original template requires jQuery, `scTrackingData`, `mage/url`, and `mage/translate`.

On HyvÃ it is replaced by:

```text
tracking/init.phtml
tracking.js
interactions.js
consent.js
```

### Original `view.phtml`

Used on product pages to feed:

- product/view-item data
- full/plain category path
- related products
- upsell products
- list/impression data

Its Scommerce PHP ViewModel is retained, while the AMD/jQuery execution is replaced by:

```text
tracking/product.phtml
```

### Original `list_product.phtml`

Used for category/search product impressions and listing-scroll/SIOS behaviour.

The original relies on:

- jQuery
- `scTrackingData`
- a jQuery viewport plugin
- scroll/load handlers

The HyvÃ version is:

```text
tracking/list.phtml
```

with native `IntersectionObserver` used when products should be tracked as they enter the viewport.

### Original `cart.phtml`

The PHP-side cart/cross-sell data generation is retained.

The AMD wrapper is replaced by:

```text
tracking/cart.phtml
```

### Original `home.phtml`

The original `home_page` event is retained through:

```text
tracking/home.phtml
```

without AMD/jQuery.

### Original `tracking_slider.phtml`

Scommerce's slider/product-list PHP tracking data is retained.

The AMD execution wrapper is replaced by:

```text
tracking/slider.phtml
```

### Original `tracking-data.js`

This is the most significant rewrite.

The original is an AMD module extending Magento `uiClass` and using jQuery / `mage/url`.

It is replaced by:

```text
view/frontend/web/js/tracking.js
```

The native replacement preserves the important Scommerce API and state model, including:

- event subscriptions
- queued events
- `startEvents()` behaviour
- product/list attribution
- localStorage persistence
- product lookup by URL
- AddToCart state
- RemoveFromCart state
- AddToWishlist state
- cart state
- purchase state
- list data
- product data
- scroll impressions
- quote impression persistence

### Original `sidebar-mixin.js`

The original mixin attaches tracking behaviour to Magento's Luma minicart/sidebar jQuery widget.

That widget does not exist on native HyvÃ pages.

The visual/widget portion is not ported. The tracking purpose is replaced by customer-section observation in:

```text
interactions.js
```

### Original jQuery viewport module

The original jQuery viewport implementation is not loaded on HyvÃ.

Its tracking purpose is replaced by native `IntersectionObserver`.

### Original `requirejs-config.js`

No HyvÃ replacement is required.

The vendor RequireJS configuration is left untouched for Luma pages, while the HyvÃ compatibility module simply does not depend on it.

---

# Scommerce_GoogleTagManagerPro rewrite

## Original `gtm.phtml`

The original GTM template depends on:

```text
jquery
scTrackingData
remarketing
mage/cookies
```

It subscribes to the Tracking event bus and converts Scommerce data into dataLayer/GA4 events.

On HyvÃ it is replaced by:

```text
gtm/init.phtml
ga4.js
remarketing.js
```

The original event architecture is retained rather than replaced with unrelated DOM tracking.

## Original GA4 conversion logic

The Scommerce GA4 conversion functions are represented in:

```text
view/frontend/web/js/ga4.js
```

The file provides native converters for:

- promotions
- item lists
- AddToCart items
- checkout items
- purchase items
- wishlist items

## Original `remarketing.js`

The underlying Scommerce remarketing logic is retained but the AMD `define()` wrapper is removed.

The native implementation is exposed through:

```js
window.ScommerceHyva.remarketing
```

## Original cookie script

Scommerce's old cookie helper relies on jQuery/jQuery cookie functionality.

The HyvÃ replacement is:

```text
gtm/cookies.phtml
```

using standard browser cookie APIs.

## Files intentionally retained unchanged

Scommerce's compatible server-rendered GTM pieces do not need replacement merely because the site uses HyvÃ.

Examples include the existing GTM noscript/nonce behaviour where no incompatible frontend dependency is involved.

---

# Native Tracking runtime

The compatibility runtime is exposed under:

```js
window.ScommerceHyva
```

The main singleton is available as:

```js
window.ScommerceHyva.tracking
```

or:

```js
window.ScommerceHyva.getTracking()
```

For interoperability with Scommerce's existing state model, the runtime also maintains:

```js
window.scTrackingData
```

## Supported Tracking events

The native event bus recognises the original Scommerce event set:

```text
page_view
page_ready
promo_view
promo_click
view_list
item_click
view_item
add_to_cart
remove_from_cart
begin_checkout
checkout_step
checkout_option
purchase
listing_scroll
home_page
view_cart
add_to_wishlist
```

## Event ordering and queue

The original Scommerce implementation can generate events before GTM subscribers are registered. It handles this by queuing events until `startEvents()` is called.

The compatibility runtime preserves this design.

```text
Tracking runtime created
        |
        v
page/product/list data can be populated
        |
        | event firing still closed
        v
_eventsQueue
        |
        v
GTM subscribers register
        |
        v
tracking.startEvents()
        |
        v
queued events replay in original order
```

This avoids race conditions without using arbitrary `setTimeout()` delays.

---

# GA4 events supported

The native GTM subscriber layer preserves the Scommerce event model for the following GA4 ecommerce events where enabled/configured by Scommerce:

- `view_item`
- `view_item_list`
- `select_item`
- `add_to_cart`
- `remove_from_cart`
- `view_cart`
- `add_to_wishlist`
- `begin_checkout`
- `add_shipping_info`
- `add_payment_info`
- `purchase`
- `view_promotion`
- `select_promotion`
- `conversion_pii`

The Luma fallback checkout remains responsible for the normal checkout-time Knockout-driven events on `checkout_index_index`; see **Luma fallback checkout** below.

---

# Product AddToCart tracking

Scommerce's server-side observer remains the source of truth for the product that Magento successfully adds to the quote.

## Normal HyvÃ product form submission

The standard flow is:

```text
Customer submits Add to Basket
        |
        v
Magento adds product successfully
        |
        v
Scommerce observer stores ProductToBasket in session
        |
        v
next HyvÃ page render
        |
        v
tracking/init.phtml consumes Scommerce data
        |
        v
list attribution is restored from sc-tracking-data
        |
        v
tracking.setAddToCart()
        |
        v
GA4 add_to_cart / GTM subscribers
```

## AJAX cart updates

HyvÃ uses Magento customer sections as a common success synchronization mechanism.

`interactions.js` listens for:

```text
private-content-loaded
```

and keeps a previous cart snapshot.

The **first** private-content event establishes the baseline and does not generate an analytics event.

Later changes are compared:

```text
previous cart section
        |
        v
new private-content-loaded
        |
        v
new cart section
        |
        +-- quantity/item increased -> check Scommerce AddToCart state
        |
        +-- quantity/item decreased -> check Scommerce RemoveFromCart state
```

The cart comparison is only used as the **success trigger**. The actual product/price/category/list data still comes from Scommerce.

After an AddToCart payload is consumed, the module uses Scommerce's existing `unsaddtocart` flow to clear/persist state and avoid duplicate tracking.

---

# RemoveFromCart tracking

The original Scommerce frontend used a Luma minicart/sidebar mixin.

HyvÃ does not use Magento's jQuery sidebar widget, so the compatibility layer instead observes successful customer-section changes.

Flow:

```text
cart item removed / quantity reduced
        |
        v
Magento quote is updated
        |
        v
Scommerce observer stores ProductOutBasket
        |
        v
private-content-loaded shows cart reduction
        |
        v
sctracking/index/removefromcart
        |
        v
tracking.setRemoveFromCart()
        |
        v
remove_from_cart
        |
        v
sctracking/index/unsremovefromcart
```

The tracking payload remains the one generated by Scommerce.

---

# AddToWishlist tracking

HyvÃ wishlist additions are AJAX/fetch based and do not emit Luma's old:

```text
ajax:addToWishlist
```

Scommerce already has a server observer which generates the authoritative wishlist payload and stores it in the session as `ProductToWishlist`.

The compatibility module adds one narrow endpoint:

```text
GET merlin_scommerce_hyva/tracking/wishlist
```

implemented by:

```text
Controller/Tracking/Wishlist.php
```

The endpoint:

1. reads the existing Scommerce `ProductToWishlist` session value;
2. decodes it;
3. clears the session value after consumption;
4. returns the existing Scommerce payload as JSON.

It does **not** calculate product prices, categories, variants, IDs, or other tracking data itself.

`interactions.js` marks a wishlist interaction as pending when a native HyvÃ control matching:

```css
[data-addto="wishlist"]
```

is clicked. When customer sections subsequently refresh, the Merlin endpoint consumes the Scommerce session payload and fires `add_to_wishlist`.

This makes tracking dependent on the resulting Magento state rather than firing analytics merely because a button was clicked.

---

# Product-list and category tracking

The compatibility module continues using the product arrays generated by Scommerce's list ViewModel.

It preserves:

- product-list names
- product-list IDs
- position/index
- product URLs
- category information
- product/list attribution
- immediate list impressions
- listing-scroll/SIOS impressions

For scroll-based impressions the old jQuery viewport logic is replaced by:

```text
IntersectionObserver
```

Each product impression is sent only when the configured DOM item enters the viewport, matching the intention of the original Scommerce implementation without scroll polling or jQuery plugins.

---

# Product click / select_item tracking

The original implementation bound jQuery click handling to product links.

The HyvÃ layer uses a single delegated native listener:

```js
document.addEventListener('click', ...)
```

It locates the nearest link with:

```js
event.target.closest('a[href]')
```

then uses Scommerce's product-list data to:

1. find the matching product by URL;
2. persist that product's list attribution;
3. fire the original `item_click` tracking event;
4. allow the GTM subscriber to generate `select_item`.

Normal navigation is never blocked by analytics.

---

# Promotion tracking

The original Scommerce implementation scans:

```css
a[data-promotion]
```

and uses jQuery window/scroll calculations to determine when promotions enter the viewport.

The compatibility layer uses `IntersectionObserver` instead.

Promotion attributes remain based on the existing Scommerce markup/data attributes:

- ID
- name
- creative
- position
- slot
- href

When a promotion first enters the viewport:

```text
promo_view
    -> view_promotion
```

is fired.

Promotion clicks are handled with delegated native click handling:

```text
promo_click
    -> select_promotion
```

Each observed promotion is marked after its first view so it is not repeatedly counted as the customer scrolls.

---

# Related, upsell, cross-sell and slider products

The compatibility layer does not create a separate tracking model for related/upsell/widget products.

It continues using Scommerce's original PHP-generated product-list structures:

- related products on PDP
- upsell products on PDP
- cross-sell products in cart
- tracked product sliders/widgets

These are passed into the same native Tracking list/impression API as category products, preserving the common Scommerce attribution model.

---

# Purchase and order-success tracking

HyvÃ-specific layout replacements are provided for applicable success/order handles, including:

```text
hyva_checkout_onepage_success
hyva_multishipping_checkout_success
hyva_sctracking_index_order
```

The original Scommerce purchase/order PHP data remains the source of truth.

The HyvÃ templates replace only the frontend AMD wrapper and continue supplying data required for:

- `purchase`
- transaction ID
- affiliation
- revenue/value
- tax
- shipping
- coupon
- currency
- purchase items
- new-customer state
- enhanced-conversion / `conversion_pii` data where enabled

---

# Luma fallback checkout

This installation uses **Luma fallback for the checkout page**.

That boundary is intentional and important.

The compatibility module does **not** replace Scommerce's original:

```text
checkout/onepage.phtml
```

on the Luma checkout.

The original Scommerce checkout code can therefore continue using the frontend dependencies that are already inherent to the fallback checkout, including:

- RequireJS
- jQuery
- Knockout
- `Magento_Checkout/js/model/quote`

This preserves Scommerce's existing checkout subscriptions such as shipping/payment selection and the related:

- `begin_checkout`
- checkout step/option events
- `add_shipping_info`
- `add_payment_info`

The key distinction is:

> Luma dependencies are allowed to remain **inside the deliberately Luma-rendered fallback checkout**. This extension does not load them into HyvÃ storefront pages.

Because both runtimes retain the same `sc-tracking-data` localStorage structure, list attribution can pass from a HyvÃ category/product interaction into the original Luma checkout runtime.

---

# Consent Mode and Amasty GDPR Cookie integration

The audited site uses:

```text
Amasty_GdprCookieHyva
Amasty_GoogleConsentMode
Amasty_GoogleConsentModeHyva
```

The original Scommerce template listens for a jQuery-era event named:

```text
scommerceCookieSaved
```

That emitter is not part of the supplied Scommerce modules and is not how the installed Amasty HyvÃ implementation communicates consent changes.

Amasty's HyvÃ implementation uses native events including:

```text
cookiebar-action-accept
cookiebar-action-accept-finish
cookiebar-action-allow
cookiebar-action-allow-finish
amasty-cookie-group-updated
amcookie-show-notification-bar
```

and its Google Consent Mode package exposes its own consent manager.

## Avoiding duplicate Consent Mode writers

`CompatibilityConfig.php` checks whether both:

```text
Amasty_GoogleConsentMode
Amasty_GoogleConsentModeHyva
```

are enabled and whether:

```text
amasty_gdprcookie/consent_mode/enable
```

is active for the store.

When Amasty Google Consent Mode is active, the compatibility layer treats Amasty as the authoritative Google Consent Mode implementation instead of blindly duplicating Scommerce's own:

```js
gtag('consent', 'default', ...)
gtag('consent', 'update', ...)
```

calls.

When the Amasty Google Consent Mode integration is not active, the native `consent.js` can use the Scommerce consent-cookie configuration supplied by TrackingBase.

This prevents conflicting consent updates while retaining Scommerce's configuration as a fallback.

---

# GTM startup

The compatibility implementation retains the public function:

```js
window.scStartGTM()
```

for compatibility with the existing Scommerce architecture.

Before injecting/starting GTM it continues to respect the relevant Scommerce GDPR/GTM cookie decision generated by the GTM block.

Unlike the old frontend architecture, subscriber ordering is not forced through arbitrary startup delays. The native Tracking event queue guarantees that data produced before GTM subscriber registration is not lost.

---

# CSP handling

The original Scommerce ViewModels/helpers already expose nonce information used by the tracking templates.

The compatibility templates continue using the Scommerce nonce where the original data layer/bootstrap output requires inline script execution.

The module does not require `unsafe-inline` and does not introduce eval-based or RequireJS-style execution.

---

# HyvÃ-only scope

The module applies its template replacements through HyvÃ layout handles such as:

```text
hyva_default
hyva_catalog_product_view
hyva_catalog_category_view
hyva_catalogsearch_result_index
hyva_checkout_cart_index
hyva_checkout_onepage_success
```

This is deliberate.

The original vendor templates are not globally replaced, so a Luma store view or the configured Luma fallback checkout can continue using Scommerce's normal implementation.

There are:

- no vendor file edits;
- no Magento class preferences;
- no theme-level patches required;
- no RequireJS mappings added for HyvÃ.

---

# Layout replacements

The module replaces the templates of existing Scommerce blocks rather than duplicating their backend data-generation logic.

| HyvÃ layout handle | Existing Scommerce block | Merlin template |
|---|---|---|
| `hyva_default` | `scommerce_tracking_data` | `tracking/init.phtml` |
| `hyva_default` | `scommerce_traking_slider` | `tracking/slider.phtml` |
| `hyva_default` | `google_tag_manager_pro_js` | `gtm/init.phtml` |
| `hyva_default` | `google_tag_manager_pro_cookies` | `gtm/cookies.phtml` |
| `hyva_catalog_product_view` | `scommerce_tracking_base_product_view` | `tracking/product.phtml` |
| `hyva_catalog_category_view` | `scommerce_tracking_base_product_list` | `tracking/list.phtml` |
| `hyva_catalogsearch_result_index` | `scommerce_tracking_base_product_list` | `tracking/list.phtml` |
| `hyva_catalogsearch_advanced_result` | `scommerce_tracking_base_product_list` | `tracking/list.phtml` |
| `hyva_checkout_cart_index` | `scommerce_tracking_base_cart` | `tracking/cart.phtml` |
| `hyva_cms_index_index` | `scommerce_tracking_base_home` | `tracking/home.phtml` |
| `hyva_checkout_onepage_success` | `scommerce_tracking_base_purchase` | `tracking/success.phtml` |
| `hyva_multishipping_checkout_success` | `scommerce_tracking_base_purchase` | `tracking/multisuccess.phtml` |
| `hyva_sctracking_index_order` | `scommerce_tracking_base_purchase` | `tracking/order.phtml` |

Because these are `referenceBlock` template changes, the existing Scommerce block/ViewModel data remains available.

---

# Module file structure

```text
Merlin/ScommerceHyvaCompatibility/
â”œâ”€â”€ Controller/
â”‚   â””â”€â”€ Tracking/
â”‚       â””â”€â”€ Wishlist.php
â”œâ”€â”€ ViewModel/
â”‚   â””â”€â”€ CompatibilityConfig.php
â”œâ”€â”€ etc/
â”‚   â”œâ”€â”€ frontend/
â”‚   â”‚   â””â”€â”€ routes.xml
â”‚   â””â”€â”€ module.xml
â”œâ”€â”€ view/frontend/
â”‚   â”œâ”€â”€ layout/
â”‚   â”‚   â”œâ”€â”€ hyva_default.xml
â”‚   â”‚   â”œâ”€â”€ hyva_catalog_product_view.xml
â”‚   â”‚   â”œâ”€â”€ hyva_catalog_category_view.xml
â”‚   â”‚   â”œâ”€â”€ hyva_catalogsearch_result_index.xml
â”‚   â”‚   â”œâ”€â”€ hyva_catalogsearch_advanced_result.xml
â”‚   â”‚   â”œâ”€â”€ hyva_checkout_cart_index.xml
â”‚   â”‚   â”œâ”€â”€ hyva_checkout_onepage_success.xml
â”‚   â”‚   â”œâ”€â”€ hyva_cms_index_index.xml
â”‚   â”‚   â”œâ”€â”€ hyva_multishipping_checkout_success.xml
â”‚   â”‚   â””â”€â”€ hyva_sctracking_index_order.xml
â”‚   â”œâ”€â”€ templates/
â”‚   â”‚   â”œâ”€â”€ gtm/
â”‚   â”‚   â”‚   â”œâ”€â”€ init.phtml
â”‚   â”‚   â”‚   â””â”€â”€ cookies.phtml
â”‚   â”‚   â””â”€â”€ tracking/
â”‚   â”‚       â”œâ”€â”€ init.phtml
â”‚   â”‚       â”œâ”€â”€ product.phtml
â”‚   â”‚       â”œâ”€â”€ list.phtml
â”‚   â”‚       â”œâ”€â”€ cart.phtml
â”‚   â”‚       â”œâ”€â”€ home.phtml
â”‚   â”‚       â”œâ”€â”€ slider.phtml
â”‚   â”‚       â”œâ”€â”€ success.phtml
â”‚   â”‚       â”œâ”€â”€ multisuccess.phtml
â”‚   â”‚       â””â”€â”€ order.phtml
â”‚   â””â”€â”€ web/js/
â”‚       â”œâ”€â”€ tracking.js
â”‚       â”œâ”€â”€ interactions.js
â”‚       â”œâ”€â”€ ga4.js
â”‚       â”œâ”€â”€ remarketing.js
â”‚       â””â”€â”€ consent.js
â”œâ”€â”€ composer.json
â”œâ”€â”€ README.md
â””â”€â”€ registration.php
```

---

# File responsibilities

## `ViewModel/CompatibilityConfig.php`

Contains compatibility-specific configuration checks.

Currently its main responsibility is detecting whether Amasty Google Consent Mode HyvÃ is enabled and configured, allowing Amasty to remain authoritative rather than creating duplicate Consent Mode updates.

## `Controller/Tracking/Wishlist.php`

Small JSON endpoint used only to expose and consume Scommerce's existing `ProductToWishlist` session payload after a successful HyvÃ AJAX wishlist operation.

It does not generate ecommerce data itself.

## `tracking.js`

Native replacement for the Scommerce `scTrackingData` AMD runtime.

Responsibilities include:

- singleton tracking object
- event subscriptions
- event queue/startup ordering
- page type
- currency/list configuration
- product data
- list data
- product/list localStorage attribution
- product lookup by URL
- AddToCart
- RemoveFromCart
- AddToWishlist
- cart data
- purchase data
- quote impression persistence

## `interactions.js`

Native browser integration layer.

Responsibilities include:

- `private-content-loaded` observation
- cart baseline/snapshot comparison
- AJAX AddToCart consumption
- RemoveFromCart consumption
- wishlist-success/session consumption
- delegated product-link click tracking
- delegated promotion clicks
- promotion visibility via `IntersectionObserver`

## `ga4.js`

Contains Scommerce-compatible GA4 ecommerce data converters.

## `remarketing.js`

Native port of Scommerce's Google dynamic remarketing data builder.

## `consent.js`

Handles Scommerce consent configuration when Scommerce is responsible for consent and avoids conflicting with the installed Amasty Google Consent Mode implementation when Amasty is authoritative.

## `tracking/init.phtml`

Main HyvÃ TrackingBase bootstrap.

It:

- loads the native JS files;
- initializes URLs/configuration;
- sets page type;
- sets currency;
- sets list behaviour;
- sets customer/guest state;
- initializes consent;
- consumes server-rendered AddToCart state;
- consumes RemoveFromCart state;
- consumes wishlist state;
- starts native interaction listeners;
- fires page-ready at the appropriate DOM state.

## `gtm/init.phtml`

Native replacement for the Scommerce GoogleTagManagerPro AMD subscriber template.

It subscribes to the Tracking event bus and pushes the configured Scommerce/GA4 events into `window.dataLayer`.

---

# Dependencies deliberately NOT introduced into HyvÃ

A successful installation should not require any of the following on native HyvÃ pages:

```text
RequireJS
jQuery
Knockout
Magento UI / uiClass
mage/url
mage/cookies
mage/translate
Magento_Checkout/js/sidebar
Magento_Checkout/js/model/quote
jQuery widget factory
jQuery viewport plugins
```

The extension should never be "fixed" by adding these libraries back to HyvÃ.

---

# Installation

Copy the module to:

```text
app/code/Merlin/ScommerceHyvaCompatibility
```

Enable and upgrade Magento:

```bash
php bin/magento module:enable Merlin_ScommerceHyvaCompatibility
php bin/magento setup:upgrade
php bin/magento cache:clean
php bin/magento cache:flush
```

For a compiled production/development deployment also run as appropriate:

```bash
rm -rf generated/code/*
rm -rf generated/metadata/*
php bin/magento setup:di:compile
php bin/magento setup:static-content:deploy -f en_GB
php bin/magento cache:flush
```

There are no CSS/Tailwind files in this module, therefore no HyvÃ Tailwind rebuild is required for this extension itself.

---

# Verification

## 1. Confirm no RequireJS error

Open a HyvÃ product page and check the browser console.

There should be no:

```text
Uncaught ReferenceError: require is not defined
```

On a native HyvÃ page this is expected:

```js
typeof require
```

Result:

```text
"undefined"
```

That is correct. The goal is not to make `require` exist; the goal is to make Scommerce no longer need it on HyvÃ.

## 2. Confirm compatibility runtime

```js
window.ScommerceHyva
```

and:

```js
window.ScommerceHyva.tracking
```

should both exist.

## 3. Inspect Tracking state

```js
window.scTrackingData
```

can be used during debugging to inspect the shared runtime state/event queue.

## 4. Inspect dataLayer events

All events:

```js
window.dataLayer
```

View item:

```js
window.dataLayer.filter(x => x && x.event === 'view_item')
```

Product lists:

```js
window.dataLayer.filter(x => x && x.event === 'view_item_list')
```

Product clicks:

```js
window.dataLayer.filter(x => x && x.event === 'select_item')
```

AddToCart:

```js
window.dataLayer.filter(x => x && x.event === 'add_to_cart')
```

RemoveFromCart:

```js
window.dataLayer.filter(x => x && x.event === 'remove_from_cart')
```

Wishlist:

```js
window.dataLayer.filter(x => x && x.event === 'add_to_wishlist')
```

Promotions:

```js
window.dataLayer.filter(x => x && ['view_promotion', 'select_promotion'].includes(x.event))
```

Purchase:

```js
window.dataLayer.filter(x => x && x.event === 'purchase')
```

## 5. Check product/list attribution

After viewing/clicking products from a category/list:

```js
JSON.parse(localStorage.getItem('sc-tracking-data'))
```

should show Scommerce's `product_list` mappings.

Verify those list values continue through AddToCart and then into the Luma fallback checkout.

## 6. Test customer-section mutations

Test at minimum:

1. Add to Basket from PDP.
2. Add to Basket from a listing if AJAX is enabled there.
3. Increase cart quantity.
4. Reduce cart quantity.
5. Remove an item from cart/minicart.
6. Add to wishlist from PDP.
7. Add to wishlist from product listing.

Confirm the resulting dataLayer event occurs **after successful Magento state change**, not simply on the initial click.

## 7. Consent

With Amasty Google Consent Mode enabled:

- verify Amasty remains the consent-state authority;
- accept selected cookie groups;
- allow all cookies;
- change preferences;
- inspect consent messages in `window.dataLayer`;
- confirm Scommerce tracking/GTM startup follows the configured consent state;
- confirm duplicate/conflicting consent updates are not produced by the compatibility layer.

## 8. Checkout

Because checkout uses Luma fallback:

- confirm RequireJS/jQuery/Knockout are present only on the fallback checkout as expected;
- confirm Scommerce's original checkout implementation still loads there;
- confirm `begin_checkout` / shipping/payment events work using the original Scommerce code;
- verify list attribution created on HyvÃ pages remains available via `sc-tracking-data`.

## 9. Purchase

Complete a test order and verify:

- `purchase`
- transaction ID
- value
- tax
- shipping
- coupon if applicable
- currency
- items
- affiliation
- new-customer field where configured
- enhanced conversion / `conversion_pii` when enabled

Ensure purchase fires once per intended Scommerce flow.

---

# GTM / GA4 validation

Browser dataLayer inspection should be the first validation step because it confirms what Magento/Scommerce actually generated before Google tooling processes it.

After that, validate with:

- Google Tag Manager Preview / Tag Assistant
- GA4 DebugView
- Browser Network tab

When comparing HyvÃ against the previous Scommerce implementation, compare the **payload structure and values**, not merely whether an event with the same name exists.

Important fields to compare include:

- product ID/SKU
- product name
- price
- quantity
- brand
- variant
- list name/list ID
- index
- category hierarchy
- affiliation
- currency
- transaction totals
- dynamic remarketing values

---

# Debugging

The native Tracking object retains a logging facility.

Enable:

```js
window.ScommerceHyva.tracking.enableLogs()
```

Disable:

```js
window.ScommerceHyva.tracking.disableLogs()
```

When enabled, compatibility-layer tracking state is logged with the prefix:

```text
[ScommerceHyva]
```

The analytics integration is designed to remain observational: failed tracking HTTP requests must not block normal cart, wishlist, checkout, or navigation behaviour.

---

# Upgrading Scommerce

This compatibility layer was written by auditing the complete supplied versions of:

```text
Scommerce_TrackingBase 2.0.39
Scommerce_GoogleTagManagerPro 3.0.46
```

Do **not** assume a future Scommerce release is frontend-compatible simply because the module still installs.

Before upgrading either package, compare at minimum the upstream versions of:

## TrackingBase

```text
view/frontend/templates/tracking_data.phtml
view/frontend/templates/view.phtml
view/frontend/templates/cart.phtml
view/frontend/templates/home.phtml
view/frontend/templates/list_product.phtml
view/frontend/templates/tracking_slider.phtml
view/frontend/templates/checkout/*
view/frontend/web/js/tracking-data.js
view/frontend/web/js/sidebar-mixin.js
view/frontend/requirejs-config.js
view/frontend/layout/*
```

Also review any changed TrackingBase:

- ViewModels
- observers
- controllers
- helper methods
- session payload structures
- quote impression/list logic

## GoogleTagManagerPro

Review at minimum:

```text
view/frontend/templates/gtm.phtml
view/frontend/templates/ga4.phtml
view/frontend/templates/gtmns.phtml
view/frontend/templates/gtm_nonce_value.phtml
view/frontend/templates/cookiescript.phtml
view/frontend/web/js/remarketing.js
view/frontend/requirejs-config.js
view/frontend/layout/*
```

Also compare:

- event subscriptions
- GA4 field mappings
- dynamic remarketing parameter rules
- GTM consent/GDPR checks
- enhanced conversion handling

If Scommerce introduces a new event, changes an existing payload, changes a session key, or modifies localStorage/list-attribution semantics, this compatibility module should be updated to match before deployment.

---

# Updating HyvÃ / Amasty consent modules

Future HyvÃ upgrades should be checked for changes to:

```text
private-content-loaded
reload-customer-section-data
wishlist AJAX behaviour
cart customer-section structure
```

Future Amasty GDPR/Consent upgrades should be checked for changes to:

```text
Amasty_GoogleConsentMode
Amasty_GoogleConsentModeHyva
amasty_gdprcookie/consent_mode/enable
cookiebar-action-accept-finish
cookiebar-action-allow-finish
amasty-cookie-group-updated
```

The module intentionally uses public/native browser events instead of patching HyvÃ templates, which should reduce upgrade friction, but these interfaces should still be regression tested.

---

# Security and implementation notes

- No vendor files are modified.
- No ObjectManager usage is introduced.
- No class preferences are required.
- The wishlist controller only exposes an existing session tracking payload and consumes it after retrieval.
- Tracking HTTP requests use same-origin credentials.
- Analytics failures do not control or block the customer's normal storefront action.
- Data comes from Scommerce/Magento server-side state wherever possible instead of trusting arbitrary DOM data.
- The module does not add jQuery or RequireJS to HyvÃ.

---

# Summary of retained vs rewritten functionality

| Area | Retained from Scommerce | Rewritten for HyvÃ |
|---|---|---|
| Product/category/cart PHP data | Yes | No |
| Scommerce configuration | Yes | No |
| Magento observers | Yes | No |
| Scommerce cart/session endpoints | Yes | No |
| Product/list localStorage schema | Yes | Native implementation preserves it |
| Tracking event names/semantics | Yes | Native event bus implementation |
| Tracking AMD/uiClass runtime | No | `tracking.js` |
| RequireJS bootstrapping | No | Native scripts/layout |
| jQuery handlers | No | Native delegated listeners |
| jQuery AJAX | No | `fetch()` |
| Luma sidebar mixin | No on HyvÃ | Customer-section observation |
| jQuery viewport tracking | No | `IntersectionObserver` |
| Product click attribution | Semantics retained | Native delegated click |
| Promotion impressions/clicks | Semantics retained | IntersectionObserver/native click |
| GA4 conversion rules | Retained | Native `ga4.js` |
| Dynamic remarketing rules | Retained | Native `remarketing.js` |
| `dataLayer` ecommerce clearing | Retained | Native subscriber layer |
| Wishlist server payload | Retained | Small Merlin consumption endpoint |
| Consent config | Retained where applicable | Native + Amasty-aware integration |
| Luma checkout TrackingBase code | Retained unchanged | Not replaced |
| Knockout checkout listeners | Retained inside Luma fallback | Not loaded into HyvÃ |
| Vendor files | Retained unchanged | Never modified |

---

# Intended result

On native HyvÃ storefront pages the Scommerce integration should provide equivalent analytics functionality without producing:

```text
require is not defined
```

and without loading the Luma JavaScript stack solely for analytics.

The target architecture is:

```text
                         Scommerce backend
                               |
                 +-------------+-------------+
                 |                           |
                 v                           v
          HyvÃ storefront             Luma fallback checkout
                 |                           |
     Merlin native JS runtime         Vendor Scommerce AMD runtime
                 |                           |
                 +-------------+-------------+
                               |
                     shared Scommerce state
                     shared list attribution
                     shared backend semantics
                     equivalent GTM/GA4 data
```

This keeps HyvÃ genuinely lightweight while preserving Scommerce as the authoritative tracking implementation.
