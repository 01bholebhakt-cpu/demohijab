# Noor Hijab House — e-commerce store template

Static multi-page store (HTML, CSS, JS). Open `index.html`, or deploy the folder to Vercel / GitHub Pages / Netlify.

Pages: Home, Shop, Hijabs, Caps, Accessories, New Arrivals, Product, Cart, Checkout, Track Order, About, Contact, FAQ, Shipping, Delivery, Returns, Privacy, Terms, Admin (demo).

## Per client
1. `assets/js/app.js` CONFIG: brand name, WhatsApp number (digits with country code).
2. `assets/js/products.js`: products, prices (`price`, `mrp` for sale), `stock`, `sizes`, photos. Set `"demo": false` for real stock.
3. Replace `Noor Hijab House`, `Your City` and the address in the HTML pages (search and replace), add `assets/logo.png` and set `logo` in CONFIG.
4. Fill the policy pages marked "To be confirmed by the store owner".

## Demo limits
Orders, coupons, settings and admin edits are saved in the visitor's browser only (localStorage). The admin has no login. For a live store with real orders and online payment, add a backend (database, auth, payment gateway). Reviews and testimonials are samples.
