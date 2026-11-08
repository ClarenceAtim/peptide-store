/* Peptide Store — cart, guest checkout and order confirmation.
   The cart lives in localStorage. There is no account and no login:
   checkout is a guest order request, and no payment is taken here. */

var CART_KEY = "peptide-store-cart";
var ORDER_KEY = "peptide-store-last-order";

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch (e) { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function addToCart(productId, variantLabel, qty) {
  var cart = getCart();
  var found = null;
  cart.forEach(function (item) {
    if (item.id === productId && item.variant === variantLabel) found = item;
  });
  if (found) {
    found.qty = Math.min(99, found.qty + qty);
  } else {
    cart.push({ id: productId, variant: variantLabel, qty: qty });
  }
  saveCart(cart);
}

function cartCount() {
  return getCart().reduce(function (n, item) { return n + item.qty; }, 0);
}

function updateCartCount() {
  document.querySelectorAll("[data-cart-count]").forEach(function (el) {
    el.textContent = cartCount();
  });
}

function money(n) {
  return "\u20ac" + n.toFixed(2);
}

function renderCart() {
  var wrap = document.getElementById("cart-wrap");
  if (!wrap) return;
  var cart = getCart();
  if (!cart.length) {
    wrap.innerHTML = "<p>Your cart is empty. <a href='shop.html'>Browse the shop</a>.</p>";
    return;
  }
  fetch("data/products.json").then(function (r) { return r.json(); }).then(function (data) {
    var rows = "";
    var total = 0;
    cart.forEach(function (item, i) {
      var product = data.products.filter(function (p) { return p.id === item.id; })[0];
      if (!product) return;
      var variant = product.variants.filter(function (v) { return v.label === item.variant; })[0] || product.variants[0];
      var line = variant.price * item.qty;
      total += line;
      rows += "<tr>" +
        "<td><strong>" + product.name + "</strong><br><span class='price-note'>" + variant.label + "</span></td>" +
        "<td>" + money(variant.price) + "</td>" +
        "<td><input type='number' min='1' max='99' value='" + item.qty + "' data-qty='" + i + "' aria-label='Quantity'></td>" +
        "<td>" + money(line) + "</td>" +
        "<td><button class='remove-link' data-remove='" + i + "'>Remove</button></td>" +
        "</tr>";
    });
    wrap.innerHTML =
      '<table class="cart-table"><thead><tr><th>Product</th><th>Price</th><th>Quantity</th><th>Subtotal</th><th></th></tr></thead><tbody>' + rows + "</tbody></table>" +
      '<div class="cart-summary"><div class="row"><span>Subtotal</span><span>' + money(total) + '</span></div>' +
      '<div class="row"><span>Shipping</span><span>Confirmed by email</span></div>' +
      '<div class="row total"><span>Total</span><span>' + money(total) + '</span></div>' +
      '<p class="price-note">Prices are shown in euros (EUR). Shipping costs are confirmed by email when your order is confirmed.</p>' +
      '<p style="margin-top:12px"><a class="btn" href="checkout.html">Continue to checkout</a></p>' +
      '<p style="margin-top:10px"><a href="shop.html">Continue shopping</a></p></div>';

    wrap.querySelectorAll("[data-qty]").forEach(function (input) {
      input.addEventListener("change", function () {
        var cart2 = getCart();
        var idx = parseInt(input.getAttribute("data-qty"), 10);
        var q = Math.max(1, Math.min(99, parseInt(input.value, 10) || 1));
        cart2[idx].qty = q;
        saveCart(cart2);
        renderCart();
      });
    });
    wrap.querySelectorAll("[data-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cart2 = getCart();
        cart2.splice(parseInt(btn.getAttribute("data-remove"), 10), 1);
        saveCart(cart2);
        renderCart();
      });
    });
  });
}

function orderReference() {
  var digits = "";
  for (var i = 0; i < 6; i++) digits += Math.floor(Math.random() * 10);
  return "PEP-2026-" + digits;
}

function renderCheckout() {
  var form = document.getElementById("checkout-form");
  if (!form) return;
  var cart = getCart();
  var summary = document.getElementById("checkout-summary");
  if (!cart.length) {
    form.innerHTML = "<p>Your cart is empty. <a href='shop.html'>Browse the shop</a>.</p>";
    if (summary) summary.innerHTML = "";
    return;
  }
  fetch("data/products.json").then(function (r) { return r.json(); }).then(function (data) {
    var total = 0;
    var lines = cart.map(function (item) {
      var product = data.products.filter(function (p) { return p.id === item.id; })[0];
      if (!product) return "";
      var variant = product.variants.filter(function (v) { return v.label === item.variant; })[0] || product.variants[0];
      total += variant.price * item.qty;
      return "<tr><td>" + product.name + " — " + variant.label + " × " + item.qty + "</td><td>" + money(variant.price * item.qty) + "</td></tr>";
    }).join("");
    summary.innerHTML = "<h2>Your order</h2><div class='order-lines'><table>" + lines +
      "<tr><td><strong>Total</strong></td><td><strong>" + money(total) + "</strong></td></tr></table></div>" +
      "<p class='price-note'>Prices are shown in euros (EUR). Shipping costs are confirmed by email when your order is confirmed.</p>";
    form.dataset.total = total;
  });

  var errorEl = document.getElementById("checkout-error");
  var emailEl = document.getElementById("email");
  var detailsEl = document.getElementById("checkout-details");
  var payStep = document.getElementById("payment-step");
  var continueRow = document.getElementById("checkout-continue-row");
  var continueBtn = document.getElementById("checkout-continue");
  var backBtn = document.getElementById("payment-back");

  function showDetailsStep() {
    if (detailsEl) detailsEl.style.display = "";
    if (continueRow) continueRow.style.display = "";
    if (payStep) payStep.style.display = "none";
    if (detailsEl) detailsEl.scrollIntoView();
  }

  function validateDetails() {
    var required = ["full-name", "email", "address-1", "city", "postcode", "country"];
    var missing = required.filter(function (id) {
      var el = document.getElementById(id);
      return !el || !el.value.trim();
    });
    var emailOk = emailEl && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim());
    var termsOk = document.getElementById("terms-agree") && document.getElementById("terms-agree").checked;
    if (missing.length || !emailOk || !termsOk) {
      errorEl.style.display = "block";
      errorEl.textContent = "Please complete all required fields, enter a valid email address, and tick the research-use agreement.";
      return false;
    }
    errorEl.style.display = "none";
    return true;
  }

  if (continueBtn) {
    continueBtn.addEventListener("click", function () {
      if (!validateDetails()) return;
      if (detailsEl) detailsEl.style.display = "none";
      if (continueRow) continueRow.style.display = "none";
      if (payStep) {
        payStep.style.display = "block";
        payStep.scrollIntoView();
      }
    });
  }
  if (backBtn) {
    backBtn.addEventListener("click", function () {
      showDetailsStep();
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validateDetails()) {
      showDetailsStep();
      return;
    }
    var chosen = form.querySelector('input[name="payment-method"]:checked');
    var payError = document.getElementById("payment-error");
    if (!chosen) {
      payError.style.display = "block";
      payError.textContent = "Please choose a payment method.";
      return;
    }
    if (payError) payError.style.display = "none";
    var order = {
      ref: orderReference(),
      date: new Date().toISOString(),
      name: document.getElementById("full-name").value.trim(),
      email: emailEl.value.trim(),
      phone: (document.getElementById("phone").value || "").trim(),
      address1: document.getElementById("address-1").value.trim(),
      address2: (document.getElementById("address-2").value || "").trim(),
      city: document.getElementById("city").value.trim(),
      postcode: document.getElementById("postcode").value.trim(),
      country: document.getElementById("country").value,
      notes: (document.getElementById("notes").value || "").trim(),
      paymentMethod: chosen.value,
      items: getCart(),
      total: parseFloat(form.dataset.total || "0")
    };
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));
    localStorage.removeItem(CART_KEY);
    updateCartCount();
    window.location.href = "confirmation.html?ref=" + order.ref;
  });
}

var PAY_METHODS = {
  bank: { label: "Bank transfer (SEPA)", detail: "the bank details" },
  paypal: { label: "PayPal", detail: "the PayPal payment details" },
  card: { label: "Credit / Debit card", detail: "the card payment link" },
  klarna: { label: "Klarna", detail: "the Klarna payment details" },
  applepay: { label: "Apple Pay", detail: "the Apple Pay payment details" },
  googlepay: { label: "Google Pay", detail: "the Google Pay payment details" },
  revolut: { label: "Revolut", detail: "the Revolut payment details" },
  chime: { label: "Chime", detail: "the Chime payment details" },
  btc: { label: "Bitcoin (BTC)", detail: "the Bitcoin wallet address" },
  usdt: { label: "USDT (Tether)", detail: "the USDT wallet address" }
};

function payMethodLabel(code) {
  return (PAY_METHODS[code] && PAY_METHODS[code].label) || "your chosen method";
}

function payDetailText(code) {
  return (PAY_METHODS[code] && PAY_METHODS[code].detail) || "the payment details";
}

function renderConfirmation() {
  var box = document.getElementById("confirmation-box");
  if (!box) return;
  var order = null;
  try { order = JSON.parse(localStorage.getItem(ORDER_KEY)); } catch (e) { order = null; }
  var params = new URLSearchParams(window.location.search);
  var ref = params.get("ref");
  if (!order || (ref && order.ref !== ref)) {
    box.innerHTML = "<h1>No order found</h1><p>We could not find an order for this page. <a href='shop.html'>Browse the shop</a>.</p>";
    return;
  }
  fetch("data/products.json").then(function (r) { return r.json(); }).then(function (data) {
    var lines = order.items.map(function (item) {
      var product = data.products.filter(function (p) { return p.id === item.id; })[0];
      if (!product) return "";
      var variant = product.variants.filter(function (v) { return v.label === item.variant; })[0] || product.variants[0];
      return "<tr><td>" + product.name + " — " + variant.label + " × " + item.qty + "</td><td>" + money(variant.price * item.qty) + "</td></tr>";
    }).join("");
    box.innerHTML =
      "<h1>Thank you, " + order.name.split(" ")[0] + "</h1>" +
      "<p>Your order request has been received. The store will email " + payDetailText(order.paymentMethod) + " to <strong>" + order.email + "</strong>.</p>" +
      '<div class="order-ref">' + order.ref + "</div>" +
      "<p><strong>Payment method:</strong> " + payMethodLabel(order.paymentMethod) + "</p>" +
      '<div class="order-lines"><table>' + lines +
      "<tr><td><strong>Total</strong></td><td><strong>" + money(order.total) + "</strong></td></tr></table></div>" +
      "<p style='margin-top:16px'><strong>Deliver to:</strong><br>" + order.address1 + (order.address2 ? ", " + order.address2 : "") + "<br>" + order.city + ", " + order.postcode + ", " + order.country + "</p>" +
      "<p style='margin-top:16px'>This is an order request — no payment has been taken. The store will email you " + payDetailText(order.paymentMethod) + " and confirm shipping. Please keep your order reference above.</p>" +
      "<p style='margin-top:16px'><a class='btn' href='shop.html'>Continue shopping</a></p>";
  });
}

document.addEventListener("DOMContentLoaded", function () {
  updateCartCount();
  renderCart();
  renderCheckout();
  renderConfirmation();
});

