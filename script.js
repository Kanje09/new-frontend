let cart = [];
let orderNumber = 1;
let isLocked = true;
let currentPickupCode = null;
let orders = JSON.parse(localStorage.getItem("turonOrders")) || {};

// Initialize Lockscreen
function initLockscreen() {
  const lockscreen = document.getElementById("lockscreen");

  // Unlock on any touch or click
  document.addEventListener("click", unlockScreen);
  document.addEventListener("touchstart", unlockScreen);
  document.addEventListener("keydown", unlockScreen);
}

// Fullscreen on first click only
document.addEventListener(
  "click",
  () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    }
  },
  { once: true }
);

function unlockScreen(e) {
  if (!isLocked) return;

  isLocked = false;
  const lockscreen = document.getElementById("lockscreen");

  // Add unlock animation
  lockscreen.classList.remove("lock-animation");
  lockscreen.classList.add("unlock-animation");

  // Remove lockscreen after animation
  setTimeout(() => {
    lockscreen.style.display = "none";
    // Remove event listeners to prevent accidental unlocking
    document.removeEventListener("click", unlockScreen);
    document.removeEventListener("touchstart", unlockScreen);
    document.removeEventListener("keydown", unlockScreen);
  }, 600);
}

function lockScreen() {
  isLocked = true;
  const lockscreen = document.getElementById("lockscreen");
  lockscreen.style.display = "flex";
  lockscreen.classList.remove("unlock-animation");
  lockscreen.classList.add("lock-animation");

  document.addEventListener("click", unlockScreen);
  document.addEventListener("touchstart", unlockScreen);
  document.addEventListener("keydown", unlockScreen);
}

// Initialize lockscreen when page loads
window.addEventListener("load", initLockscreen);

// Generate unique 4-digit pickup code
function generatePickupCode() {
  let code;
  let isUnique = false;
  while (!isUnique) {
    code = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    if (!orders[code]) {
      isUnique = true;
    }
  }
  return code;
}

// Category Filtering
function filterProducts(category) {
  const productItems = document.querySelectorAll(".product-item");
  const categoryBtns = document.querySelectorAll(".category-btn");

  // Update active button
  categoryBtns.forEach((btn) => btn.classList.remove("active"));
  event.target.classList.add("active");

  // Filter products
  productItems.forEach((item) => {
    if (category === "all") {
      item.style.display = "block";
    } else {
      const itemId = item.getAttribute("onclick");
      if (itemId.includes(`'${category}'`)) {
        item.style.display = "block";
      } else {
        item.style.display = "none";
      }
    }
  });
}

// ========== REMOVED: Pickup functions now only in POS-System ==========

function updateDateTime() {
  const now = new Date();
  document.getElementById("current-date").textContent = now.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );
  document.getElementById("current-time").textContent = now.toLocaleTimeString(
    "en-US",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}
updateDateTime();
setInterval(updateDateTime, 1000);

function addToCart(id, name, price) {
  const existingItem = cart.find((item) => item.id === id);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ id, name, price, quantity: 1 });
  }

  updateCartDisplay();
  showNotification(`${name} added to order`);
}

function updateQuantity(id, change) {
  const item = cart.find((item) => item.id === id);
  if (item) {
    item.quantity += change;
    if (item.quantity <= 0) {
      removeFromCart(id);
    } else {
      updateCartDisplay();
    }
  }
}

function removeFromCart(id) {
  cart = cart.filter((item) => item.id !== id);
  updateCartDisplay();
}

function updateCartDisplay() {
  const cartItems = document.getElementById("cart-items");
  const cartSummary = document.getElementById("cart-summary");
  const checkoutBtn = document.getElementById("checkout-btn");
  const cartBadge = document.getElementById("cart-badge");

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (totalItems > 0) {
    cartBadge.textContent = totalItems;
    cartBadge.style.display = "flex";
  } else {
    cartBadge.style.display = "none";
  }

  if (cart.length === 0) {
    cartItems.innerHTML = `
            <div class="cart-empty">
                <div class="cart-empty-icon">🛒</div>
                <p>No items in order</p>
                <p style="font-size: 0.85rem; margin-top: 0.5rem;">Select products to begin</p>
            </div>
        `;
    cartSummary.style.display = "none";
    checkoutBtn.disabled = true;
  } else {
    cartItems.innerHTML = cart
      .map(
        (item) => `
            <div class="cart-item">
                <div class="cart-item-header">
                    <div class="cart-item-name">${item.name}</div>
                    <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">×</button>
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-price">₱${item.price.toFixed(2)} each</div>
                    <div class="qty-controls">
                        <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)">−</button>
                        <span class="qty-display">${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                    </div>
                </div>
            </div>
        `,
      )
      .join("");

    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    document.getElementById("subtotal").textContent = `₱${subtotal.toFixed(2)}`;
    document.getElementById("total").textContent = `₱${subtotal.toFixed(2)}`;

    cartSummary.style.display = "block";
    checkoutBtn.disabled = false;
  }
}

function clearCart() {
  if (cart.length === 0) return;
  if (confirm("Clear all items from order?")) {
    cart = [];
    updateCartDisplay();
    showNotification("Order cleared");
  }
}

function checkout() {
  if (cart.length === 0) return;

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Payment: assume exact payment (no customer input required)
  const cash = total;
  const change = 0;

  // Generate pickup code
  const pickupCode = generatePickupCode();

  // Store order
  orders[pickupCode] = {
    orderNumber: orderNumber,
    items: [...cart],
    total: total,
    timestamp: new Date().toLocaleString(),
  };
  localStorage.setItem("turonOrders", JSON.stringify(orders));

  // Prepare Receipt Data
  const now = new Date();
  document.getElementById("r-date-time").textContent = now.toLocaleString();
  document.getElementById("r-order-no").textContent = String(
    orderNumber,
  ).padStart(4, "0");
  document.getElementById("r-pickup-code").textContent = pickupCode;

  const itemsList = document.getElementById("r-items-list");
  itemsList.innerHTML = cart
    .map(
      (item) => `
        <div class="receipt-line">
            <span>${item.quantity}x ${item.name}</span>
            <span>₱${(item.price * item.quantity).toFixed(2)}</span>
        </div>
    `,
    )
    .join("");

  document.getElementById("r-subtotal").textContent = `₱${total.toFixed(2)}`;
  document.getElementById("r-total").textContent = `₱${total.toFixed(2)}`;
  document.getElementById("r-cash").textContent = `₱${cash.toFixed(2)}`;
  document.getElementById("r-change").textContent = `₱${change.toFixed(2)}`;

  // Show Receipt Modal
  document.getElementById("receipt-modal").style.display = "flex";
}

function closeReceipt() {
  document.getElementById("receipt-modal").style.display = "none";
  cart = [];
  orderNumber++;
  document.getElementById("order-number").textContent = String(
    orderNumber,
  ).padStart(4, "0");
  updateCartDisplay();
  showNotification("Thank you for your order!");

  // Lock the screen after a short delay
  setTimeout(() => {
    lockScreen();
  }, 1000);
}

function showNotification(message) {
  const notification = document.getElementById("notification");
  const notificationText = document.getElementById("notification-text");
  notificationText.textContent = message;
  notification.classList.add("show");
  setTimeout(() => {
    notification.classList.remove("show");
  }, 3000);
}

function toggleCart() {
  const cartSection = document.getElementById("cart-section");
  cartSection.classList.toggle("open");
}

function goBack() {
  const cartSection = document.getElementById("cart-section");
  if (cartSection.classList.contains("open")) {
    cartSection.classList.remove("open");
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

