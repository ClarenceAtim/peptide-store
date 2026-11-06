/* Peptide Store — catalog, product page and shared helpers.
   Data comes from data/products.json. No account, no login anywhere. */

var RESEARCH_NOTICE = "For laboratory research use only. Not for human or animal use. Not a drug, food, dietary supplement, or cosmetic. Not intended to diagnose, treat, cure, or prevent any disease.";

var FALLBACK_IMAGES = {
  healing: "images/products/bpc-157-vial.png",
  growth: "images/products/ipamorelin-vial.png",
  cognitive: "images/products/semax-scene.webp",
  tanning: "images/products/tb-500-vial.png",
  cellular: "images/products/ara-290-vial.webp",
  bundles: "images/products/bpc-tb-500-blend.png"
};

function escAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function productImage(product) {
  var src = product.image || FALLBACK_IMAGES[product.category] || FALLBACK_IMAGES.healing;
  var fallback = FALLBACK_IMAGES[product.category] || FALLBACK_IMAGES.healing;
  return '<img src="' + src + '" alt="Photo of ' + escAttr(product.name) + ' vial" loading="lazy" onerror="this.onerror=null;this.src=\'' + fallback + '\'">';
}

function money(n) {
  return "$" + n.toFixed(2);
}

function loadProducts() {
  return fetch("data/products.json").then(function (r) { return r.json(); });
}

function categoryName(data, id) {
  var c = data.categories.filter(function (x) { return x.id === id; })[0];
  return c ? c.name : id;
}

function productCard(data, product) {
  var priceLine, priceNote;
  if (product.variants.length === 1) {
    priceLine = money(product.variants[0].price);
    priceNote = product.variants[0].label + " · prices in USD";
  } else {
    var from = Math.min.apply(null, product.variants.map(function (v) { return v.price; }));
    priceLine = "from " + money(from);
    priceNote = "per vial · prices in USD";
  }
  var html = '<article class="card">' +
    '<div class="vial">' + productImage(product) + "</div>" +
    '<div class="card-body">' +
    '<span class="category-tag">' + categoryName(data, product.category) + "</span>" +
    '<h3><a href="product.html?id=' + product.id + '">' + product.name + "</a></h3>" +
    "<p>" + product.form + "</p>" +
    '<div class="price">' + priceLine + "</div>" +
    '<div class="price-note">' + priceNote + "</div>" +
    '<div class="card-actions">' +
    '<a class="btn btn-outline" href="product.html?id=' + product.id + '">View</a>' +
    '<button class="btn" data-add="' + product.id + '">Add to cart</button>' +
    "</div></div></article>";
  return html;
}

function renderFeatured(data) {
  var el = document.getElementById("featured-grid");
  if (!el) return;
  var featured = data.products.filter(function (p) { return p.featured; });
  el.innerHTML = featured.map(function (p) { return productCard(data, p); }).join("");
}

function renderCategories(data) {
  var el = document.getElementById("category-grid");
  if (!el) return;
  el.innerHTML = data.categories.map(function (c) {
    var count = data.products.filter(function (p) { return p.category === c.id; }).length;
    return '<a class="cat-tile" href="shop.html?category=' + c.id + '"><h3>' + c.name + "</h3><p>" + count + " product" + (count === 1 ? "" : "s") + "</p></a>";
  }).join("");
}

function renderShop(data) {
  var grid = document.getElementById("shop-grid");
  if (!grid) return;
  var params = new URLSearchParams(window.location.search);
  var activeCat = params.get("category") || "all";
  var query = "";

  var searchInput = document.getElementById("shop-search");
  var filterRow = document.getElementById("filter-row");
  var countEl = document.getElementById("shop-count");

  function draw() {
    var list = data.products.filter(function (p) {
      var okCat = activeCat === "all" || p.category === activeCat;
      var okQ = !query || p.name.toLowerCase().indexOf(query) !== -1;
      return okCat && okQ;
    });
    grid.innerHTML = list.length ? list.map(function (p) { return productCard(data, p); }).join("") :
      "<p>No products match your search. Try a different name or category.</p>";
    if (countEl) countEl.textContent = list.length + " of " + data.products.length + " products";
  }

  if (filterRow) {
    var buttons = [{ id: "all", name: "All" }].concat(data.categories);
    filterRow.innerHTML = buttons.map(function (b) {
      return '<button class="filter-btn' + (b.id === activeCat ? " active" : "") + '" data-cat="' + b.id + '">' + b.name + "</button>";
    }).join("");
    filterRow.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-cat]");
      if (!btn) return;
      activeCat = btn.getAttribute("data-cat");
      filterRow.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.toggle("active", b === btn); });
      draw();
    });
  }
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      query = searchInput.value.trim().toLowerCase();
      draw();
    });
  }
  draw();
}

function renderProduct(data) {
  var el = document.getElementById("product-detail");
  if (!el) return;
  var params = new URLSearchParams(window.location.search);
  var product = data.products.filter(function (p) { return p.id === params.get("id"); })[0];
  if (!product) {
    el.innerHTML = "<p>Product not found. <a href='shop.html'>Back to the shop</a>.</p>";
    return;
  }
  var selected = product.variants[0];
  var qtyInput;

  function perMg(v) {
    return v.mg ? money(v.price / v.mg) + " per mg" : "";
  }

  function drawPrice() {
    document.getElementById("pd-price").textContent = money(selected.price);
    document.getElementById("pd-per-mg").textContent = perMg(selected);
    document.getElementById("pd-variant-name").textContent = selected.label;
  }

  var variantBtns = product.variants.map(function (v, i) {
    return '<button type="button" class="variant-btn' + (i === 0 ? " active" : "") + '" data-variant="' + i + '">' + v.label + " — " + money(v.price) + "</button>";
  }).join("");

  var variantSection = "";
  if (product.variants.length > 1) {
    variantSection = "<p><strong>Choose a size:</strong></p>" +
      '<div class="variant-list">' + variantBtns + "</div>";
  }

  el.innerHTML =
    '<div class="vial">' + productImage(product) + "</div>" +
    '<div>' +
    '<span class="category-tag">' + categoryName(data, product.category) + "</span>" +
    "<h1>" + product.name + "</h1>" +
    "<p>" + product.description + "</p>" +
    '<table class="spec-table">' +
    "<tr><th>Form</th><td>" + product.form + "</td></tr>" +
    "<tr><th>Size</th><td id=\"pd-variant-name\">" + selected.label + "</td></tr>" +
    "<tr><th>Price</th><td><strong id=\"pd-price\">" + money(selected.price) + "</strong> <span class=\"price-note\" id=\"pd-per-mg\">" + perMg(selected) + "</span></td></tr>" +
    (product.testing ? "<tr><th>Testing</th><td>" + product.testing + "</td></tr>" : "") +
    "</table>" +
    variantSection +
    '<div class="qty-row"><label for="pd-qty"><strong>Quantity</strong></label>' +
    '<input type="number" id="pd-qty" value="1" min="1" max="99">' +
    '<button class="btn" id="pd-add">Add to cart</button></div>' +
    '<p class="currency-note">Prices are shown in US dollars (USD). Euro (EUR) pricing will be set by the store.</p>' +
    '<div class="notice"><strong>Research use only.</strong> ' + RESEARCH_NOTICE + "</div>" +
    "</div>";

  qtyInput = document.getElementById("pd-qty");
  el.querySelectorAll("[data-variant]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      el.querySelectorAll("[data-variant]").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      selected = product.variants[parseInt(btn.getAttribute("data-variant"), 10)];
      drawPrice();
    });
  });
  document.getElementById("pd-add").addEventListener("click", function () {
    var qty = Math.max(1, Math.min(99, parseInt(qtyInput.value, 10) || 1));
    addToCart(product.id, selected.label, qty);
    window.location.href = "cart.html";
  });
}

function renderCurrencyNotes(data) {
  document.querySelectorAll("[data-currency-note]").forEach(function (el) {
    el.textContent = data.currencyNote;
  });
}

function initShop() {
  loadProducts().then(function (data) {
    renderCurrencyNotes(data);
    renderFeatured(data);
    renderCategories(data);
    renderShop(data);
    renderProduct(data);
    updateCartCount();
  }).catch(function () {
    var grid = document.getElementById("shop-grid") || document.getElementById("featured-grid");
    if (grid) grid.innerHTML = "<p>The catalog could not be loaded. Please refresh the page.</p>";
  });

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-add]");
    if (!btn) return;
    var id = btn.getAttribute("data-add");
    loadProducts().then(function (data) {
      var product = data.products.filter(function (p) { return p.id === id; })[0];
      if (product) addToCart(product.id, product.variants[0].label, 1);
    });
  });
}

document.addEventListener("DOMContentLoaded", initShop);
