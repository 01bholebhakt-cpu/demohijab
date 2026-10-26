/* Noor Hijab House — storefront logic (plain JavaScript, no dependencies) */
(function () {
  'use strict';

  /* ================= CONFIG — edit here ================= */
  var CONFIG = {
    whatsapp: '919229048879',          // wa.me number, digits only, with country code
    brand: 'Noor Hijab House',
    logo: null,                        // e.g. 'assets/logo.png' once the official logo file is added
    currency: '₹',
    cartKey: 'nhh_bag_v1'
  };

  var PRODUCTS = ls('nhh_products', null) || window.KHH_PRODUCTS || [];
  function ls(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function lsw(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function SETTINGS() { return Object.assign({ ship: 60, free: 999, cod: true, upi: true, bank: false }, ls('nhh_settings', {})); }
  function COUPONS() { return ls('nhh_coupons', [{ code: 'WELCOME10', pct: 10, min: 0, on: true }, { code: 'EID50', flat: 50, min: 499, on: true }]); }
  function nav(h) { var x = document.createElement('a'); x.href = h; document.body.appendChild(x); x.click(); }
  function stars(r) { var n = Math.round(r); return '<span class="stars" aria-label="' + r + ' out of 5">' + '★★★★★'.slice(0, n) + '<i>' + '★★★★★'.slice(n) + '</i></span>'; }
  function calc(lines) {
    var sub = 0; lines.forEach(function (l) { sub += l.price * l.qty; });
    var code = ls('nhh_coupon', ''), cp = COUPONS().filter(function (c) { return c.on && c.code === code; })[0], d = 0;
    if (cp && sub >= (cp.min || 0)) d = cp.pct ? Math.round(sub * cp.pct / 100) : Math.min(cp.flat || 0, sub); else code = '';
    var st = SETTINGS(), ship = (!sub || sub - d >= st.free) ? 0 : st.ship;
    return { sub: sub, disc: d, ship: ship, total: sub - d + ship, code: code, free: st.free };
  }
  function sumRows(t) {
    return '<div class="sum-row"><span>Subtotal</span><span>' + money(t.sub) + '</span></div>' +
      (t.disc ? '<div class="sum-row"><span>Discount (' + esc(t.code) + ')</span><span>−' + money(t.disc) + '</span></div>' : '') +
      '<div class="sum-row"><span>Shipping</span><span>' + (t.ship ? money(t.ship) : 'Free') + '</span></div>' +
      '<div class="sum-row total"><span>Total</span><span>' + money(t.total) + '</span></div>';
  }

  /* ================= helpers ================= */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return CONFIG.currency + Number(n).toLocaleString('en-IN'); }
  function byId(id) { for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i]; return null; }
  function colourOf(p, name) {
    for (var i = 0; i < p.colours.length; i++) if (p.colours[i].name === String(name || '').split('|')[0]) return p.colours[i];
    return p.colours[0];
  }
  function priceHTML(p) {
    if (p.price == null) return '<span class="price enq">Price on enquiry</span>';
    var off = p.mrp && p.mrp > p.price ? '<s>' + money(p.mrp) + '</s><em class="off">' + Math.round((1 - p.price / p.mrp) * 100) + '% off</em>' : '';
    return '<span class="price">' + money(p.price) + off + '</span>';
  }
  function waLink(text) { return 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(text); }
  function param(n) { return new URLSearchParams(location.search).get(n); }

  /* ================= bag (localStorage) ================= */
  var Bag = {
    read: function () {
      try { var a = JSON.parse(localStorage.getItem(CONFIG.cartKey) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
    },
    write: function (a) { try { localStorage.setItem(CONFIG.cartKey, JSON.stringify(a)); } catch (e) { } Bag.badge(); },
    add: function (id, colour, qty) {
      var p = byId(id); if (!p) return;
      var sz = (colour || '').split('|')[1]; colour = colourOf(p, colour).name + (sz ? '|' + sz : ''); qty = Math.max(1, Math.min(99, parseInt(qty, 10) || 1));
      var a = Bag.read(), hit = null;
      a.forEach(function (l) { if (l.id === id && l.colour === colour) hit = l; });
      if (hit) hit.qty = Math.min(99, hit.qty + qty); else a.push({ id: id, colour: colour, qty: qty });
      Bag.write(a);
    },
    setQty: function (id, colour, qty) {
      var a = Bag.read();
      a.forEach(function (l) { if (l.id === id && l.colour === colour) l.qty = Math.max(1, Math.min(99, qty)); });
      Bag.write(a);
    },
    remove: function (id, colour) { Bag.write(Bag.read().filter(function (l) { return !(l.id === id && l.colour === colour); })); },
    clear: function () { Bag.write([]); },
    // resolved lines (drops items no longer in the catalogue)
    lines: function () {
      return Bag.read().map(function (l) {
        var p = byId(l.id); if (!p) return null;
        var c = colourOf(p, l.colour);
        return { p: p, id: l.id, colour: c.name, key: l.colour, size: (l.colour || '').split('|')[1] || '', image: c.image, qty: l.qty, price: p.price };
      }).filter(Boolean);
    },
    count: function () { return Bag.read().reduce(function (n, l) { return n + (l.qty || 0); }, 0); },
    badge: function () { $$('[data-bag-count]').forEach(function (b) { var n = Bag.count(); b.textContent = n; b.setAttribute('data-n', n); }); },
    summary: function () {
      var ls = Bag.lines(), allPriced = ls.length > 0, total = 0, units = 0;
      ls.forEach(function (l) { units += l.qty; if (l.price == null) allPriced = false; else total += l.price * l.qty; });
      return { lines: ls, units: units, allPriced: allPriced, total: total };
    }
  };

  /* ================= toast ================= */
  var toastTimer;
  function toast(msg, linkHref, linkText) {
    var t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (linkHref ? '<a href="' + esc(linkHref) + '">' + esc(linkText) + '</a>' : '');
    t.classList.add('show'); clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3600);
  }

  /* ================= product card ================= */
  function cardHTML(p, colourName) {
    var c = colourOf(p, colourName);
    var href = 'product.html?id=' + encodeURIComponent(p.id) + '&colour=' + encodeURIComponent(c.name);
    var sw = p.colours.length > 1 ? '<div class="swatches" role="group" aria-label="Colours for ' + esc(p.name) + '">' +
      p.colours.map(function (k) {
        return '<button type="button" class="sw js-sw" style="background:' + esc(k.hex) + '" data-colour="' + esc(k.name) + '" aria-label="' + esc(k.name) + '" title="' + esc(k.name) + '" aria-pressed="' + (k.name === c.name) + '"></button>';
      }).join('') + '<span class="count" style="font-size:.78rem">' + p.colours.length + ' colours</span></div>' : '<div class="swatches"><span class="count" style="font-size:.78rem">' + esc(c.name) + '</span></div>';
    return '<article class="card" data-id="' + esc(p.id) + '" data-colour="' + esc(c.name) + '">' +
      '<a class="card-media js-link" href="' + href + '" aria-label="View ' + esc(p.name) + '">' +
      '<img src="' + esc(c.image) + '" alt="' + esc(p.name) + ' in ' + esc(c.name) + ' (demonstration image)" width="800" height="1000" loading="lazy" decoding="async">' +
      (p.isNew ? '<span class="tag">New</span>' : '') + (p.mrp > p.price ? '<span class="tag sale">Sale</span>' : '') + (p.stock < 1 ? '<span class="tag out">Sold out</span>' : '') + (p.demo ? '<span class="tag demo">Demo</span>' : '') + '</a>' +
      '<div class="card-body"><span class="card-cat">' + esc(p.catLabel) + '</span>' +
      '<h3><a class="js-link" href="' + href + '">' + esc(p.name) + '</a></h3>' + priceHTML(p) + sw +
      '<div class="card-actions"><a class="btn ghost sm js-link" href="' + href + '">View Details</a>' +
      '<button type="button" class="btn sm js-add"' + (p.stock < 1 ? ' disabled' : '') + '>Add to Bag</button></div></div></article>';
  }

  function fillGrid(el, list) {
    if (!el) return;
    el.innerHTML = list.map(function (p) { return cardHTML(p); }).join('');
  }

  /* ================= global delegation ================= */
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('.js-sw, .js-add') : null;
    if (!t) return;
    var card = t.closest('.card'); if (!card) return;
    var p = byId(card.getAttribute('data-id')); if (!p) return;
    if (t.classList.contains('js-sw')) {
      var c = colourOf(p, t.getAttribute('data-colour'));
      card.setAttribute('data-colour', c.name);
      var img = $('img', card); img.src = c.image; img.alt = p.name + ' in ' + c.name + ' (demonstration image)';
      $$('.js-sw', card).forEach(function (b) { b.setAttribute('aria-pressed', b === t ? 'true' : 'false'); });
      var href = 'product.html?id=' + encodeURIComponent(p.id) + '&colour=' + encodeURIComponent(c.name);
      $$('.js-link', card).forEach(function (a) { a.setAttribute('href', href); });
    } else {
      Bag.add(p.id, card.getAttribute('data-colour'), 1);
      toast(p.name + ' (' + card.getAttribute('data-colour') + ') added to your bag.', 'cart.html', 'View Bag');
    }
  });

  /* ================= header / chrome ================= */
  function initChrome() {
    Bag.badge();
    if (CONFIG.logo) {
      $$('.brand').forEach(function (b) {
        var im = new Image(); im.className = 'logo-img'; im.alt = CONFIG.brand; im.src = CONFIG.logo;
        im.onload = function () { var w = $('.wordmark', b); if (w) w.classList.add('sr-only'); b.insertBefore(im, b.firstChild); };
      });
    }
    var menu = $('#menu-btn'), nav = $('#mobile-nav'), scrim = $('#scrim');
    function setMenu(open) {
      if (!nav) return; nav.classList.toggle('open', open); scrim.classList.toggle('open', open);
      menu.setAttribute('aria-expanded', open); nav.setAttribute('aria-hidden', !open);
      document.body.style.overflow = open ? 'hidden' : '';
    }
    if (menu && nav) {
      menu.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
      scrim.addEventListener('click', function () { setMenu(false); });
      $('#menu-close').addEventListener('click', function () { setMenu(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { threshold: .12 });
      $$('.reveal').forEach(function (el) { io.observe(el); });
    } else { $$('.reveal').forEach(function (el) { el.classList.add('in'); }); }
  }

  /* ================= home ================= */
  function initHero() {
    var hero = $('.hero'); if (!hero) return;
    if (window.__heroT) clearInterval(window.__heroT);
    var sl = $$('.slide', hero), dots = $$('.dot', hero), cur = 0, paused = false;
    function go(i) {
      cur = (i + sl.length) % sl.length;
      sl.forEach(function (s, k) { s.classList.toggle('on', k === cur); s.setAttribute('aria-hidden', k !== cur); });
      dots.forEach(function (d, k) { d.classList.toggle('on', k === cur); });
    }
    $('.prev', hero).addEventListener('click', function () { go(cur - 1); });
    $('.next', hero).addEventListener('click', function () { go(cur + 1); });
    dots.forEach(function (d) { d.addEventListener('click', function () { go(+d.getAttribute('data-i')); }); });
    hero.addEventListener('mouseenter', function () { paused = true; }); hero.addEventListener('mouseleave', function () { paused = false; });
    hero.addEventListener('focusin', function () { paused = true; }); hero.addEventListener('focusout', function () { paused = false; });
    var x0 = null; hero.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) go(cur + (dx < 0 ? 1 : -1)); x0 = null; });
    go(0);
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    window.__heroT = setInterval(function () { if (!document.body.contains(hero)) { clearInterval(window.__heroT); return; } if (!paused && !document.hidden) go(cur + 1); }, 5500);
  }

  function initHome() {
    initHero();
    fillGrid($('#featured-grid'), PRODUCTS.slice().sort(function (x, y) { return (y.pop || 0) - (x.pop || 0); }).slice(0, 4));
    var ig = $('#ig-grid'); if (ig) ig.innerHTML = PRODUCTS.slice(0, 6).map(function (p) { return '<a href="product.html?id=' + encodeURIComponent(p.id) + '"><img src="' + esc(p.colours[0].image) + '" alt="' + esc(p.name) + '" loading="lazy"></a>'; }).join('');
    var nl = $('#nl'); if (nl) nl.addEventListener('submit', function (e) { e.preventDefault(); nl.innerHTML = '<p style="margin:0"><b>Thank you! You are subscribed.</b></p>'; });
    fillGrid($('#new-grid'), PRODUCTS.filter(function (p) { return p.isNew; }).sort(function (a, b) { return b.order - a.order; }).slice(0, 4));
  }

  /* ================= listing (shop + collections) ================= */
  function initListing() {
    var mount = $('#listing'); if (!mount) return;
    var fixedCat = document.body.getAttribute('data-cat') || '';
    var onlyNew = document.body.getAttribute('data-new') === '1';
    var isShop = !fixedCat && !onlyNew;
    var hasPrices = PRODUCTS.some(function (p) { return p.price != null; });
    var state = { q: param('q') || '', cat: fixedCat || param('cat') || '', colour: param('colour') || '', sort: onlyNew ? 'newest' : 'featured', max: parseInt(param('max'), 10) || 0, sale: param('sale') === '1', n: 8 };
    var cats = [['', 'All'], ['hijabs', 'Hijabs'], ['caps', 'Caps'], ['accessories', 'Pins & Accessories']];
    var fam = {};
    PRODUCTS.forEach(function (p) { p.colours.forEach(function (c) { if (!fam[c.family]) fam[c.family] = c.hex; }); });
    var famNames = Object.keys(fam);

    mount.innerHTML =
      '<div class="toolbar"><div class="tool-l">' +
      '<label class="sr-only" for="f-q">Search products</label><input id="f-q" class="field" type="search" placeholder="Search products…" value="' + esc(state.q) + '" style="min-width:220px">' +
      '</div><div class="tool-r"><label class="sr-only" for="f-sort">Sort by</label><select id="f-sort" class="select">' +
      '<option value="featured">Featured</option><option value="popular">Popularity</option><option value="newest">Latest</option>' +
      (hasPrices ? '<option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option>' : '') +
      '<option value="name">Name A–Z</option></select></div></div>' +
      (isShop ? '<div class="chips" id="f-cats" role="group" aria-label="Category" style="margin-bottom:.9rem"></div>' : '') +
      '<div class="chips" id="f-cols" role="group" aria-label="Colour" style="margin-bottom:1.3rem"></div>' +
      '<p class="count" id="f-count" aria-live="polite"></p><div class="grid" id="f-grid"></div><div id="f-more" style="text-align:center;margin-top:1.8rem"></div>';

    $('#f-sort').value = state.sort;
    var catsEl = $('#f-cats'), colsEl = $('#f-cols');
    function chips() {
      if (catsEl) catsEl.innerHTML = cats.map(function (c) { return '<button type="button" class="chip" data-cat="' + c[0] + '" aria-pressed="' + (state.cat === c[0]) + '">' + c[1] + '</button>'; }).join('');
      colsEl.innerHTML = '<button type="button" class="chip" data-col="" aria-pressed="' + (state.colour === '') + '">All colours</button>' +
        famNames.map(function (f) { return '<button type="button" class="chip" data-col="' + esc(f) + '" aria-pressed="' + (state.colour === f) + '"><span class="sw" style="background:' + esc(fam[f]) + '"></span>' + esc(f) + '</button>'; }).join('');
    }
    function apply() {
      var q = state.q.trim().toLowerCase();
      var list = PRODUCTS.filter(function (p) {
        if (onlyNew && !p.isNew) return false;
        if (state.cat && p.cat !== state.cat) return false;
        if (q && (p.name + ' ' + p.catLabel + ' ' + p.colours.map(function (c) { return c.name; }).join(' ')).toLowerCase().indexOf(q) < 0) return false;
        if (state.colour && !p.colours.some(function (c) { return c.family === state.colour; })) return false;
        if (state.sale && !(p.mrp > p.price)) return false;
        if (state.max && p.price > state.max) return false;
        return true;
      });
      var s = state.sort;
      list.sort(function (a, b) {
        if (s === 'newest') return b.order - a.order;
        if (s === 'popular') return (b.pop || 0) - (a.pop || 0);
        if (s === 'name') return a.name.localeCompare(b.name);
        if (s === 'price-asc' || s === 'price-desc') {
          if (a.price == null && b.price == null) return a.order - b.order;
          if (a.price == null) return 1;
          if (b.price == null) return -1;
          return s === 'price-asc' ? a.price - b.price : b.price - a.price;
        }
        return (b.featured - a.featured) || (a.order - b.order);
      });
      var grid = $('#f-grid');
      $('#f-count').textContent = list.length + (list.length === 1 ? ' product' : ' products');
      if (!list.length) {
        grid.className = '';
        grid.innerHTML = '<div class="empty"><h3>No products found</h3><p>We couldn’t find anything matching your search or filters. Try a different word or clear the filters — or ask us on WhatsApp if you are looking for something specific.</p>' +
          '<button class="btn ghost sm" id="f-clear" type="button">Clear filters</button> <a class="btn wa sm" target="_blank" rel="noopener" href="' + waLink('Hello ' + CONFIG.brand + ', I am looking for: ' + state.q) + '">Ask on WhatsApp</a></div>';
        $('#f-clear').addEventListener('click', function () { state.q = ''; state.colour = ''; if (isShop) state.cat = ''; $('#f-q').value = ''; chips(); apply(); });
      } else { grid.className = 'grid'; fillGrid(grid, list.slice(0, state.n)); }
      $('#f-more').innerHTML = list.length > state.n ? '<button class="btn ghost" id="f-moreb" type="button">Load more (' + (list.length - state.n) + ' remaining)</button>' : '';
      chips();
      colsEl.insertAdjacentHTML('beforeend', '<button type="button" class="chip" data-sale="1" aria-pressed="' + state.sale + '">On sale</button><button type="button" class="chip" data-max="299" aria-pressed="' + (state.max === 299) + '">Under ₹299</button>');
    }
    $('#f-q').addEventListener('input', function (e) { state.q = e.target.value; state.n = 8; apply(); });
    $('#f-sort').addEventListener('change', function (e) { state.sort = e.target.value; state.n = 8; apply(); });
    mount.addEventListener('click', function (e) {
      if (e.target.id === 'f-moreb') { state.n += 8; apply(); return; }
      var sl = e.target.closest('[data-sale]'), mx = e.target.closest('[data-max]');
      if (sl) { state.sale = !state.sale; state.n = 8; apply(); return; }
      if (mx) { state.max = state.max ? 0 : 299; state.n = 8; apply(); return; }
      var c = e.target.closest('[data-cat]'), k = e.target.closest('[data-col]');
      if (c && c.classList.contains('chip')) { state.n = 8; state.cat = c.getAttribute('data-cat'); apply(); }
      if (k && k.classList.contains('chip')) { state.n = 8; state.colour = k.getAttribute('data-col'); apply(); }
    });
    apply();
  }

  /* ================= product detail ================= */
  function initProduct() {
    var mount = $('#pdp'); if (!mount) return;
    var p = byId(param('id'));
    if (!p) {
      mount.innerHTML = '<div class="empty" style="grid-column:1/-1"><h3>Product not found</h3><p>This product link is not valid. Please browse our collection.</p><a class="btn" href="shop.html">Back to Shop</a></div>';
      document.title = 'Product not found | ' + CONFIG.brand; return;
    }
    var cur = colourOf(p, param('colour')), size = (p.sizes && p.sizes[0]) || '';
    var imgs = p.colours.map(function (c) { return { src: c.image, label: c.name }; }).concat(p.detailImage ? [{ src: p.detailImage, label: 'Close-up detail' }] : []);
    document.title = p.name + ' | ' + CONFIG.brand;
    var md = $('meta[name="description"]'); if (md) md.setAttribute('content', p.name + ' — ' + p.desc + ' Order on WhatsApp from ' + CONFIG.brand + ', Your City. Shipping all over India.');
    var catPage = { hijabs: 'hijabs.html', caps: 'caps.html', accessories: 'accessories.html' }[p.cat];
    $('#crumbs').innerHTML = '<a href="index.html">Home</a><span>/</span><a href="shop.html">Shop</a><span>/</span><a href="' + catPage + '">' + esc(p.catLabel) + '</a><span>/</span>' + esc(p.name);

    mount.innerHTML =
      '<div class="gallery"><div class="gallery-main"><img id="g-main" src="' + esc(cur.image) + '" alt="' + esc(p.name) + ' in ' + esc(cur.name) + '" width="800" height="1000"></div>' +
      '<div class="thumbs" id="g-thumbs">' + imgs.map(function (i) { return '<button type="button" class="thumb" data-src="' + esc(i.src) + '" data-label="' + esc(i.label) + '" aria-label="Show ' + esc(i.label) + '"><img src="' + esc(i.src) + '" alt="" loading="lazy" width="120" height="150"></button>'; }).join('') + '</div></div>' +
      '<div class="info"><span class="eyebrow">' + esc(p.catLabel) + '</span><h1>' + esc(p.name) + '</h1>' + priceHTML(p) +
      (p.demo ? '<p class="notice"><strong>Demonstration product.</strong> Images are illustrative. Exact colour, fabric, size and availability are confirmed by the store on WhatsApp before your order is accepted.</p>' : '') +
      '<p class="rate">' + stars(p.rating || 4.5) + ' <span>' + (p.rating || 4.5) + ' · ' + (p.reviews || 0) + ' reviews</span></p><p>' + esc(p.desc) + '</p>' +
      '<ul class="specs"><li><b>SKU</b> ' + esc(p.id.toUpperCase()) + '</li><li><b>Category</b> ' + esc(p.catLabel) + '</li><li><b>Colours</b> ' + p.colours.length + ' available</li>' + (p.sizes && p.sizes.length ? '<li><b>Sizes</b> ' + esc(p.sizes.join(', ')) + '</li>' : '') + '</ul>' +
      '<p class="stock ' + (p.stock > 0 ? (p.stock <= 5 ? 'low' : 'in') : 'out') + '">' + (p.stock > 0 ? (p.stock <= 5 ? 'Only ' + p.stock + ' left in stock' : 'In stock') : 'Out of stock') + '</p>' +
      (p.sizes && p.sizes.length > 1 ? '<div class="opt-label">Size: <b id="s-name">' + esc(size) + '</b></div><div class="chips" id="s-chips">' + p.sizes.map(function (s, i) { return '<button type="button" class="chip" data-size="' + esc(s) + '" aria-pressed="' + (i === 0) + '">' + esc(s) + '</button>'; }).join('') + '</div>' : '') +
      '<div class="opt-label">Colour: <b id="c-name">' + esc(cur.name) + '</b></div><div class="swatches" id="c-sw" role="group" aria-label="Choose colour"></div>' +
      '<div class="opt-label">Quantity</div><div class="qty"><button type="button" id="q-minus" aria-label="Decrease quantity">−</button><input id="q-in" type="number" min="1" max="99" value="1" aria-label="Quantity"><button type="button" id="q-plus" aria-label="Increase quantity">+</button></div>' +
      '<div class="buy-row"><button type="button" class="btn" id="b-add"' + (p.stock > 0 ? '' : ' disabled') + '>Add to Bag</button><button type="button" class="btn gold" id="b-buy"' + (p.stock > 0 ? '' : ' disabled') + '>Buy Now</button><a class="btn wa" id="b-wa" target="_blank" rel="noopener" href="#">Order on WhatsApp</a></div>' +
      '<div class="info-box"><strong>Delivery &amp; shipping</strong><ul><li>Ships all over India in 3–7 working days (demo estimate).</li><li>Shipping ₹60 · free above ₹999.</li><li>Cash on delivery and UPI available.</li><li>7-day easy returns.</li></ul>' +
      '<p style="margin:.6rem 0 0"><a href="shipping.html">Shipping policy</a> · <a href="delivery.html">Delivery info</a> · <a href="returns.html">Returns</a></p></div></div>' +
      '<section style="grid-column:1/-1" class="reviews"><h2>Customer reviews</h2><p class="notice">Sample reviews for demonstration.</p>' +
      [['Ayesha K.', 5, 'Lovely quality and the colour matched the photos. Very happy.'], ['Sana R.', 4, 'Soft, easy to style and arrived on time.'], ['Mariam T.', 5, 'Will order again for Eid. Great value.']].map(function (r) { return '<div class="rev">' + stars(r[1]) + '<b>' + r[0] + '</b><p>' + r[2] + '</p></div>'; }).join('') + '</section>';

    function sync() {
      $('#c-name').textContent = cur.name; $('#g-main').src = cur.image; $('#g-main').alt = p.name + ' in ' + cur.name;
      $$('#c-sw .sw-btn').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-colour') === cur.name); });
      $$('#g-thumbs .thumb').forEach(function (t) { t.setAttribute('aria-current', t.getAttribute('data-src') === $('#g-main').getAttribute('src')); });
      var q = qty();
      var msg = 'Hello ' + CONFIG.brand + ', I would like to order / enquire about:\n\n*' + p.name + '*\nColour: ' + cur.name + '\nQuantity: ' + q + '\nPrice: ' + (p.price != null ? money(p.price) + ' each' : 'Price on enquiry') + '\nLink: ' + location.href.split('#')[0] + '\n\nPlease confirm availability, final price and delivery details. Thank you.';
      $('#b-wa').setAttribute('href', waLink(msg));
      try { history.replaceState(null, '', 'product.html?id=' + encodeURIComponent(p.id) + '&colour=' + encodeURIComponent(cur.name)); } catch (e) { }
    }
    function qty() { var v = parseInt($('#q-in').value, 10); return isNaN(v) ? 1 : Math.max(1, Math.min(99, v)); }
    $('#c-sw').innerHTML = p.colours.map(function (c) { return '<button type="button" class="sw-btn" data-colour="' + esc(c.name) + '" style="background:' + esc(c.hex) + '" aria-label="' + esc(c.name) + '" title="' + esc(c.name) + '" aria-pressed="false"></button>'; }).join('');
    $('#c-sw').addEventListener('click', function (e) { var b = e.target.closest('.sw-btn'); if (b) { cur = colourOf(p, b.getAttribute('data-colour')); sync(); } });
    $('#g-thumbs').addEventListener('click', function (e) {
      var t = e.target.closest('.thumb'); if (!t) return;
      $('#g-main').src = t.getAttribute('data-src'); $('#g-main').alt = p.name + ' — ' + t.getAttribute('data-label');
      p.colours.forEach(function (c) { if (c.image === t.getAttribute('data-src')) { cur = c; $('#c-name').textContent = c.name; } });
      sync();
    });
    $('#q-minus').addEventListener('click', function () { $('#q-in').value = Math.max(1, qty() - 1); sync(); });
    $('#q-plus').addEventListener('click', function () { $('#q-in').value = Math.min(99, qty() + 1); sync(); });
    $('#q-in').addEventListener('change', function () { $('#q-in').value = qty(); sync(); });
    $('#b-add').addEventListener('click', function () { Bag.add(p.id, cur.name + (size ? '|' + size : ''), qty()); toast(p.name + ' (' + cur.name + ') × ' + qty() + ' added to your bag.', 'cart.html', 'View Bag'); });
    var sc = $('#s-chips'); if (sc) sc.addEventListener('click', function (e) { var b = e.target.closest('[data-size]'); if (!b) return; size = b.getAttribute('data-size'); $('#s-name').textContent = size; $$('#s-chips .chip').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); });
    $('#b-buy').addEventListener('click', function () { Bag.add(p.id, cur.name + (size ? '|' + size : ''), qty()); nav('checkout.html'); });
    sync();

    var rel = PRODUCTS.filter(function (x) { return x.cat === p.cat && x.id !== p.id; });
    if (rel.length < 4) rel = rel.concat(PRODUCTS.filter(function (x) { return x.cat !== p.cat; }));
    fillGrid($('#related-grid'), rel.slice(0, 4));
  }

  /* ================= bag page ================= */
  function initCart() {
    var mount = $('#cart'); if (!mount) return;
    var cpMsg = '';
    function sideHTML(s) {
      var t = calc(s.lines), need = t.free - (t.sub - t.disc);
      return '<aside class="summary" aria-label="Order summary"><h3>Order Summary</h3><div class="sum-row"><span>Items</span><span>' + s.units + '</span></div>' + sumRows(t) +
        (t.ship ? '<p class="count" style="margin:.5rem 0">Add ' + money(need) + ' more for free shipping.</p>' : '<p class="count" style="margin:.5rem 0">You get free shipping.</p>') +
        '<div class="coupon"><input id="cp" class="field" placeholder="Coupon code" value="' + esc(t.code) + '" aria-label="Coupon code"><button id="cp-apply" class="btn ghost sm" type="button">Apply</button></div><div class="count" id="cp-msg">' + esc(cpMsg) + '</div>' +
        '<a class="btn block" href="checkout.html" style="margin-top:1rem">Proceed to Checkout</a></aside>';
    }
    function render() {
      var s = Bag.summary();
      if (!s.lines.length) {
        mount.innerHTML = '<div class="empty" style="grid-column:1/-1"><h3>Your bag is empty</h3><p>Browse our collection and add your favourite pieces. You will place your order on WhatsApp.</p><a class="btn" href="shop.html">Continue Shopping</a></div>'; return;
      }
      var rows = s.lines.map(function (l) {
        return '<div class="line" data-id="' + esc(l.id) + '" data-colour="' + esc(l.key) + '">' +
          '<a href="product.html?id=' + encodeURIComponent(l.id) + '&colour=' + encodeURIComponent(l.colour) + '"><img src="' + esc(l.image) + '" alt="' + esc(l.p.name) + ' in ' + esc(l.colour) + '" width="96" height="120" loading="lazy"></a>' +
          '<div><h3><a href="product.html?id=' + encodeURIComponent(l.id) + '&colour=' + encodeURIComponent(l.colour) + '">' + esc(l.p.name) + '</a></h3><div class="meta">Colour: ' + esc(l.colour) + (l.size ? ' · Size: ' + esc(l.size) : '') + '</div><div class="meta">' + (l.price != null ? money(l.price) + ' each' : 'Price on enquiry') + '</div><button class="rm" type="button" data-act="rm">Remove</button></div>' +
          '<div class="line-right"><div class="qty"><button type="button" data-act="minus" aria-label="Decrease quantity of ' + esc(l.p.name) + '">−</button><input type="number" min="1" max="99" value="' + l.qty + '" data-act="set" aria-label="Quantity of ' + esc(l.p.name) + '"><button type="button" data-act="plus" aria-label="Increase quantity of ' + esc(l.p.name) + '">+</button></div>' +
          '<div class="price" style="margin-top:.5rem;text-align:right">' + (l.price != null ? money(l.price * l.qty) : '<span class="enq">On enquiry</span>') + '</div></div></div>';
      }).join('');
      mount.innerHTML = '<div><div id="lines">' + rows + '</div><p style="margin-top:1rem"><a href="shop.html">← Continue shopping</a> · <button class="rm" id="clear" type="button" style="background:none;border:0;text-decoration:underline;cursor:pointer;color:var(--muted);font:inherit">Clear bag</button></p></div>' +
        sideHTML(s);
    }
    mount.addEventListener('click', function (e) {
      if (e.target.id === 'cp-apply') {
        var v = $('#cp').value.trim().toUpperCase(), c = COUPONS().filter(function (x) { return x.code === v; })[0], sub = Bag.summary().total;
        if (!v) { lsw('nhh_coupon', ''); cpMsg = 'Coupon removed.'; } else if (!c || !c.on) cpMsg = 'Invalid coupon code.'; else if (sub < (c.min || 0)) cpMsg = 'Add items worth ' + money(c.min) + ' to use ' + v + '.'; else { lsw('nhh_coupon', v); cpMsg = 'Coupon ' + v + ' applied.'; }
        render(); return;
      }
      if (e.target.id === 'clear') { if (confirm('Remove all items from your bag?')) { Bag.clear(); render(); } return; }
      var b = e.target.closest('[data-act]'); if (!b) return;
      var row = b.closest('.line'), id = row.getAttribute('data-id'), col = row.getAttribute('data-colour'), act = b.getAttribute('data-act');
      var cur = parseInt($('input', row).value, 10) || 1;
      if (act === 'rm') Bag.remove(id, col); else if (act === 'plus') Bag.setQty(id, col, cur + 1); else if (act === 'minus') Bag.setQty(id, col, cur - 1);
      render();
    });
    mount.addEventListener('change', function (e) {
      if (e.target.getAttribute('data-act') !== 'set') return;
      var row = e.target.closest('.line'); Bag.setQty(row.getAttribute('data-id'), row.getAttribute('data-colour'), parseInt(e.target.value, 10) || 1); render();
    });
    render();
  }

  /* ================= checkout ================= */
  function buildOrderMessage(s, c) {
    var out = ['*New Order Request — ' + CONFIG.brand + '*', '', '*Items*'];
    s.lines.forEach(function (l, i) {
      out.push((i + 1) + '. ' + l.p.name);
      out.push('   Colour: ' + l.colour);
      out.push('   Qty: ' + l.qty);
      out.push('   Price: ' + (l.price != null ? money(l.price) + ' each = ' + money(l.price * l.qty) : 'Price on enquiry'));
    });
    out.push('');
    out.push(s.allPriced ? '*Estimated total: ' + money(s.total) + '* (shipping to be confirmed)' : '*Total:* to be confirmed by the store (some items are price on enquiry)');
    out.push('', '*Customer details*', 'Name: ' + c.name, 'Phone: ' + c.phone, 'Address: ' + c.address, 'City: ' + c.city, 'State: ' + c.state, 'PIN code: ' + c.pin);
    if (c.notes) out.push('Notes: ' + c.notes);
    out.push('', 'Please confirm availability, final price, shipping charges and delivery time. Thank you!');
    return out.join('\n');
  }

  function orderMsg(o) {
    var c = o.customer, out = ['*New Order ' + o.id + ' — ' + CONFIG.brand + '*', '', '*Items*'];
    o.items.forEach(function (i, n) { out.push((n + 1) + '. ' + i.name + ' (' + i.colour + (i.size ? ', ' + i.size : '') + ') x' + i.qty + ' = ' + money(i.price * i.qty)); });
    out.push('', 'Subtotal: ' + money(o.sub)); if (o.disc) out.push('Discount (' + o.coupon + '): -' + money(o.disc));
    out.push('Shipping: ' + (o.ship ? money(o.ship) : 'Free'), '*Total: ' + money(o.total) + '*', 'Payment: ' + o.pay, '', '*Customer*', 'Name: ' + c.name, 'Phone: ' + c.phone, 'Address: ' + c.address + ', ' + c.city + ', ' + c.state + ' - ' + c.pin);
    if (c.notes) out.push('Notes: ' + c.notes); return out.join('\n');
  }

  function initTrack() {
    var f = $('#tr-form'); if (!f) return;
    var steps = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered'];
    function show(id) {
      var o = ls('nhh_orders', []).filter(function (x) { return x.id === id.trim().toUpperCase(); })[0], out = $('#tr-out');
      if (!o) { out.innerHTML = '<p class="notice">No order found with that number on this device. Check the number or ask us on WhatsApp.</p>'; return; }
      var at = steps.indexOf(o.status);
      out.innerHTML = '<div class="panel"><h3>Order ' + esc(o.id) + '</h3><p class="count">Placed ' + new Date(o.date).toLocaleDateString('en-IN') + ' · ' + money(o.total) + ' · ' + esc(o.pay) + '</p>' +
        (at < 0 ? '<p><b>Status: ' + esc(o.status) + '</b></p>' : '<ol class="tl">' + steps.map(function (s, i) { return '<li class="' + (i <= at ? 'done' : '') + '">' + s + '</li>'; }).join('') + '</ol>') +
        o.items.map(function (i) { return '<div class="review-line"><span>' + esc(i.name) + ' <small>(' + esc(i.colour) + ') × ' + i.qty + '</small></span><span>' + money(i.price * i.qty) + '</span></div>'; }).join('') + '</div>';
    }
    f.addEventListener('submit', function (e) { e.preventDefault(); show($('#tr-id').value); });
    if (param('id')) { $('#tr-id').value = param('id'); show(param('id')); }
  }

  function initAdmin() {
    var root = $('#admin'); if (!root) return;
    var tab = 'overview', tabs = ['overview', 'products', 'orders', 'customers', 'coupons', 'settings'];
    function orders() { return ls('nhh_orders', []); }
    function savePs() { lsw('nhh_products', PRODUCTS); }
    function sample() {
      var os = [], names = ['Ayesha', 'Sana', 'Mariam', 'Zoya', 'Fatima', 'Nida'], cities = ['Patna', 'Lucknow', 'Delhi', 'Kolkata'], st = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Delivered'];
      for (var i = 0; i < 14; i++) {
        var p = PRODUCTS[(i * 5) % PRODUCTS.length], q = 1 + i % 3, sub = p.price * q, ship = sub >= 999 ? 0 : 60;
        os.push({ id: 'NHH9' + (100 + i), date: new Date(Date.now() - (i % 7) * 864e5).toISOString(), customer: { name: names[i % 6], phone: '+91 98' + (10000000 + i * 91731), city: cities[i % 4], state: '', address: '', pin: '' }, pay: i % 3 ? 'Cash on Delivery' : 'UPI', coupon: '', sub: sub, disc: 0, ship: ship, total: sub + ship, status: st[i % 6], items: [{ id: p.id, name: p.name, colour: p.colours[0].name, size: '', qty: q, price: p.price }] });
      }
      lsw('nhh_orders', os);
    }
    function overview() {
      var os = orders(); if (!os.length) return '<div class="panel"><h3>No orders yet</h3><p>Place a test order in the store, or load sample data to see the analytics.</p><button class="btn" id="ad-sample" type="button">Load sample data</button></div>';
      var rev = 0, days = {}, top = {}, stt = {}, cust = {};
      os.forEach(function (o) { rev += o.total; var d = new Date(o.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); days[d] = (days[d] || 0) + o.total; stt[o.status] = (stt[o.status] || 0) + 1; cust[o.customer.phone] = 1; o.items.forEach(function (i) { top[i.name] = (top[i.name] || 0) + i.qty; }); });
      function bars(obj, fmt) { var mx = Math.max.apply(null, Object.keys(obj).map(function (k) { return obj[k]; })); return Object.keys(obj).slice(0, 7).map(function (k) { return '<div class="bar"><span>' + esc(k) + '</span><div><i style="width:' + Math.round(obj[k] / mx * 100) + '%"></i></div><b>' + fmt(obj[k]) + '</b></div>'; }).join(''); }
      var topSorted = {}; Object.keys(top).sort(function (x, y) { return top[y] - top[x]; }).slice(0, 5).forEach(function (k) { topSorted[k] = top[k]; });
      var low = PRODUCTS.filter(function (p) { return p.stock <= 5; }).length;
      return '<div class="kpis"><div><small>Revenue</small><b>' + money(rev) + '</b></div><div><small>Orders</small><b>' + os.length + '</b></div><div><small>Avg. order</small><b>' + money(Math.round(rev / os.length)) + '</b></div><div><small>Customers</small><b>' + Object.keys(cust).length + '</b></div><div><small>Low stock</small><b>' + low + '</b></div></div>' +
        '<div class="two"><div class="panel"><h3>Sales by day</h3>' + bars(days, money) + '</div><div class="panel"><h3>Top products (units)</h3>' + bars(topSorted, String) + '</div></div><div class="panel"><h3>Orders by status</h3>' + bars(stt, String) + '</div>';
    }
    function products() {
      return '<div class="panel"><h3>Products and inventory</h3><div class="tbl"><table><tr><th></th><th>Name</th><th>Price ₹</th><th>MRP ₹</th><th>Stock</th><th></th></tr>' + PRODUCTS.map(function (p) {
        return '<tr data-id="' + esc(p.id) + '"><td><img src="' + esc(p.colours[0].image) + '" alt="" width="36" height="45"></td><td><input class="field" data-f="name" value="' + esc(p.name) + '"></td><td><input class="field" type="number" data-f="price" value="' + p.price + '"></td><td><input class="field" type="number" data-f="mrp" value="' + (p.mrp || '') + '"></td><td><input class="field" type="number" data-f="stock" value="' + p.stock + '"></td><td><button class="rm" data-del="1" type="button">Delete</button></td></tr>';
      }).join('') + '</table></div></div><form id="ad-addp" class="panel"><h3>Add product</h3><div class="form"><div><input class="field" id="np-name" placeholder="Product name" required></div><div><select class="field" id="np-cat"><option value="hijabs">Hijabs</option><option value="caps">Caps</option><option value="accessories">Accessories</option></select></div><div><input class="field" id="np-price" type="number" placeholder="Price ₹" required></div><div><input class="field" id="np-stock" type="number" placeholder="Stock" required></div></div><button class="btn" style="margin-top:.8rem">Add product</button></form>';
    }
    function ordersTab() {
      var os = orders(); if (!os.length) return '<div class="panel"><p>No orders yet.</p></div>';
      return '<div class="panel"><h3>Orders</h3><div class="tbl"><table><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr>' + os.map(function (o) {
        return '<tr data-oid="' + esc(o.id) + '"><td>' + esc(o.id) + '<br><small>' + new Date(o.date).toLocaleDateString('en-IN') + '</small></td><td>' + esc(o.customer.name) + '<br><small>' + esc(o.customer.phone) + '</small></td><td>' + o.items.map(function (i) { return esc(i.name) + ' ×' + i.qty; }).join('<br>') + '</td><td>' + money(o.total) + '</td><td>' + esc(o.pay) + '</td><td><select class="field" data-st="1">' + ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'].map(function (s) { return '<option' + (s === o.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></td></tr>';
      }).join('') + '</table></div></div>';
    }
    function customers() {
      var m = {}; orders().forEach(function (o) { var k = o.customer.phone, c = m[k] || (m[k] = { n: o.customer.name, ph: k, city: o.customer.city, o: 0, s: 0 }); c.o++; c.s += o.total; });
      var l = Object.keys(m).map(function (k) { return m[k]; }); if (!l.length) return '<div class="panel"><p>No customers yet.</p></div>';
      return '<div class="panel"><h3>Customers</h3><div class="tbl"><table><tr><th>Name</th><th>Phone</th><th>City</th><th>Orders</th><th>Spent</th></tr>' + l.map(function (c) { return '<tr><td>' + esc(c.n) + '</td><td>' + esc(c.ph) + '</td><td>' + esc(c.city) + '</td><td>' + c.o + '</td><td>' + money(c.s) + '</td></tr>'; }).join('') + '</table></div></div>';
    }
    function couponsTab() {
      return '<div class="panel"><h3>Discounts and coupons</h3><div class="tbl"><table><tr><th>Code</th><th>Discount</th><th>Min order</th><th>Active</th><th></th></tr>' + COUPONS().map(function (c, i) {
        return '<tr data-ci="' + i + '"><td>' + esc(c.code) + '</td><td>' + (c.pct ? c.pct + '%' : money(c.flat)) + '</td><td>' + money(c.min || 0) + '</td><td><input type="checkbox" data-on="1"' + (c.on ? ' checked' : '') + '></td><td><button class="rm" data-cdel="1" type="button">Delete</button></td></tr>';
      }).join('') + '</table></div></div><form id="ad-addc" class="panel"><h3>New coupon</h3><div class="form"><div><input class="field" id="nc-code" placeholder="CODE" required></div><div><select class="field" id="nc-type"><option value="pct">Percent off</option><option value="flat">Flat ₹ off</option></select></div><div><input class="field" id="nc-val" type="number" placeholder="Value" required></div><div><input class="field" id="nc-min" type="number" placeholder="Min order ₹"></div></div><button class="btn" style="margin-top:.8rem">Add coupon</button></form>';
    }
    function settingsTab() {
      var s = SETTINGS();
      return '<form id="ad-set" class="panel"><h3>Shipping and payment</h3><div class="form"><div><label>Shipping charge ₹</label><input class="field" id="s-ship" type="number" value="' + s.ship + '"></div><div><label>Free shipping above ₹</label><input class="field" id="s-free" type="number" value="' + s.free + '"></div></div><p><label><input type="checkbox" id="s-cod"' + (s.cod ? ' checked' : '') + '> Cash on delivery</label> &nbsp; <label><input type="checkbox" id="s-upi"' + (s.upi ? ' checked' : '') + '> UPI</label> &nbsp; <label><input type="checkbox" id="s-bank"' + (s.bank ? ' checked' : '') + '> Bank transfer</label></p><p class="count">Store WhatsApp: +' + esc(CONFIG.whatsapp) + '</p><button class="btn">Save settings</button> <span id="s-ok" class="count"></span></form>';
    }
    function draw() {
      var body = { overview: overview, products: products, orders: ordersTab, customers: customers, coupons: couponsTab, settings: settingsTab }[tab]();
      root.innerHTML = '<p class="notice">Demo admin. Data is saved only in this browser, and there is no login. A live store needs a secure backend.</p><div class="chips" style="margin:1rem 0">' + tabs.map(function (t) { return '<button class="chip" type="button" data-tab="' + t + '" aria-pressed="' + (t === tab) + '">' + t.charAt(0).toUpperCase() + t.slice(1) + '</button>'; }).join('') + '</div>' + body;
    }
    root.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tab]'); if (t) { tab = t.getAttribute('data-tab'); draw(); return; }
      if (e.target.id === 'ad-sample') { sample(); draw(); return; }
      if (e.target.getAttribute('data-del')) { var id = e.target.closest('tr').getAttribute('data-id'); if (confirm('Delete this product?')) { PRODUCTS.splice(PRODUCTS.indexOf(byId(id)), 1); savePs(); draw(); } }
      if (e.target.getAttribute('data-cdel')) { var cs = COUPONS(); cs.splice(+e.target.closest('tr').getAttribute('data-ci'), 1); lsw('nhh_coupons', cs); draw(); }
    });
    root.addEventListener('change', function (e) {
      var tr = e.target.closest('tr'), f = e.target.getAttribute('data-f');
      if (f && tr) { var p = byId(tr.getAttribute('data-id')); p[f] = f === 'name' ? e.target.value : (e.target.value === '' ? null : +e.target.value); savePs(); }
      if (e.target.getAttribute('data-st')) { var os = orders(); os.forEach(function (o) { if (o.id === tr.getAttribute('data-oid')) o.status = e.target.value; }); lsw('nhh_orders', os); }
      if (e.target.getAttribute('data-on')) { var cs = COUPONS(); cs[+tr.getAttribute('data-ci')].on = e.target.checked; lsw('nhh_coupons', cs); }
    });
    root.addEventListener('submit', function (e) {
      e.preventDefault();
      if (e.target.id === 'ad-addp') {
        var cat = $('#np-cat').value, ref = PRODUCTS.filter(function (p) { return p.cat === cat; })[0] || PRODUCTS[0], n = PRODUCTS.length + 1;
        PRODUCTS.push({ id: 'new-' + Date.now().toString().slice(-5), name: $('#np-name').value, cat: cat, catLabel: ref.catLabel, desc: 'New product.', featured: false, isNew: true, order: 100 + n, price: +$('#np-price').value, mrp: null, stock: +$('#np-stock').value, pop: 50, rating: 4.5, reviews: 0, sizes: cat === 'hijabs' ? ['Regular', 'Large'] : [], demo: true, colours: ref.colours.slice(0, 1), detailImage: ref.detailImage });
        savePs();
      }
      if (e.target.id === 'ad-addc') { var cs = COUPONS(), v = +$('#nc-val').value, c = { code: $('#nc-code').value.trim().toUpperCase(), min: +$('#nc-min').value || 0, on: true }; c[$('#nc-type').value] = v; cs.push(c); lsw('nhh_coupons', cs); }
      if (e.target.id === 'ad-set') { lsw('nhh_settings', { ship: +$('#s-ship').value, free: +$('#s-free').value, cod: $('#s-cod').checked, upi: $('#s-upi').checked, bank: $('#s-bank').checked }); draw(); $('#s-ok').textContent = 'Saved.'; return; }
      draw();
    });
    draw();
  }

  function initCheckout() {
    var mount = $('#checkout'); if (!mount) return;
    var s = Bag.summary();
    if (!s.lines.length) {
      mount.innerHTML = '<div class="empty" style="grid-column:1/-1"><h3>Your bag is empty</h3><p>Add something to your bag before checking out.</p><a class="btn" href="shop.html">Browse the Shop</a></div>'; return;
    }
    var form = $('#co-form'), review = $('#review');
    var items = s.lines.map(function (l) { return '<div class="review-line"><span>' + esc(l.p.name) + ' <small style="color:var(--muted)">(' + esc(l.colour) + ') × ' + l.qty + '</small></span><span>' + (l.price != null ? money(l.price * l.qty) : 'On enquiry') + '</span></div>'; }).join('');
    $('#co-items').innerHTML = items + sumRows(calc(s.lines));
    var stg = SETTINGS(); $$('input[name=pay]').forEach(function (r) { if (!stg[r.getAttribute('data-k')]) r.closest('label').remove(); });
    function val(id) { return $('#' + id).value.trim(); }
    function setErr(id, msg) { var f = $('#' + id); f.setAttribute('aria-invalid', msg ? 'true' : 'false'); $('#e-' + id).textContent = msg || ''; return !msg; }
    function validate() {
      var ok = true, ph = val('phone').replace(/[\s\-]/g, '').replace(/^(\+?91|0)/, '');
      ok = setErr('name', val('name').length < 2 ? 'Please enter your full name.' : '') && ok;
      ok = setErr('phone', !/^[6-9]\d{9}$/.test(ph) ? 'Enter a valid 10-digit Indian mobile number.' : '') && ok;
      ok = setErr('address', val('address').length < 10 ? 'Please enter your full delivery address.' : '') && ok;
      ok = setErr('city', val('city').length < 2 ? 'Please enter your city.' : '') && ok;
      ok = setErr('state', !val('state') ? 'Please choose your state.' : '') && ok;
      ok = setErr('pin', !/^[1-9]\d{5}$/.test(val('pin')) ? 'Enter a valid 6-digit PIN code.' : '') && ok;
      return ok ? { name: val('name'), phone: '+91 ' + ph, address: val('address'), city: val('city'), state: val('state'), pin: val('pin'), notes: val('notes') } : null;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var c = validate();
      if (!c) { var bad = $('[aria-invalid="true"]', form); if (bad) bad.focus(); return; }
      var sm = Bag.summary(), t = calc(sm.lines), pr = $('input[name=pay]:checked', form), pay = pr ? pr.value : 'Cash on Delivery';
      var order = { id: 'NHH' + Date.now().toString().slice(-6), date: new Date().toISOString(), customer: c, pay: pay, coupon: t.code, sub: t.sub, disc: t.disc, ship: t.ship, total: t.total, status: 'Pending',
        items: sm.lines.map(function (l) { return { id: l.id, name: l.p.name, colour: l.colour, size: l.size, qty: l.qty, price: l.price }; }) };
      var os = ls('nhh_orders', []); os.unshift(order); lsw('nhh_orders', os);
      order.items.forEach(function (i) { var p = byId(i.id); if (p && p.stock != null) p.stock = Math.max(0, p.stock - i.qty); }); lsw('nhh_products', PRODUCTS);
      Bag.clear(); lsw('nhh_coupon', '');
      mount.innerHTML = '<div class="panel" style="grid-column:1/-1;text-align:center"><h2>Order placed ✓</h2><p>Your order number is <b>' + order.id + '</b>.<br>Total ' + money(order.total) + ' · Payment: ' + esc(pay) + '</p><p>Send your order on WhatsApp so the store can confirm it.</p>' +
        '<a class="btn wa" target="_blank" rel="noopener" href="' + waLink(orderMsg(order)) + '">Send order on WhatsApp</a> <a class="btn ghost" href="track.html?id=' + order.id + '">Track order</a> <a class="btn" href="shop.html">Continue shopping</a></div>';
      window.scrollTo(0, 0);
    });
    $('#edit').addEventListener('click', function () { review.hidden = true; form.hidden = false; $('#after').hidden = true; window.scrollTo({ top: 0, behavior: 'smooth' }); });
    $('#send').addEventListener('click', function () { $('#after').hidden = false; });
  }

  /* ================= contact ================= */
  function initContact() {
    var f = $('#ct-form'); if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = $('#ct-name').value.trim(), m = $('#ct-msg').value.trim(), ph = $('#ct-phone').value.trim();
      var ok = true;
      $('#e-ct-name').textContent = n.length < 2 ? (ok = false, 'Please enter your name.') : '';
      $('#e-ct-msg').textContent = m.length < 5 ? (ok = false, 'Please write your message.') : '';
      if (!ok) return;
      var text = 'Hello ' + CONFIG.brand + ',\n\n' + m + '\n\n— ' + n + (ph ? '\nPhone: ' + ph : '');
      window.open(waLink(text), '_blank', 'noopener');
    });
  }

  /* ================= boot ================= */
  document.addEventListener('DOMContentLoaded', function () {
    initChrome();
    var page = document.body.getAttribute('data-page');
    if (page === 'home') initHome();
    if (page === 'listing') initListing();
    if (page === 'product') initProduct();
    if (page === 'cart') initCart();
    if (page === 'checkout') initCheckout();
    if (page === 'contact') initContact();
    if (page === 'track') initTrack();
    if (page === 'admin') initAdmin();
  });
  window.addEventListener('storage', function () { Bag.badge(); });
  window.KHH = { Bag: Bag, buildOrderMessage: buildOrderMessage, waLink: waLink, CONFIG: CONFIG };
})();
