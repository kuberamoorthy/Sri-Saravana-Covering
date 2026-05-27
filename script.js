// ═══════════════════════════════════════════════════════════
// Sri Saravana Chidambaram Fancy Covering — Core Logic
// Database: Firebase Firestore (localStorage fallback)
// ═══════════════════════════════════════════════════════════

const ADMIN_CREDENTIALS = { username: "mahesh", password: "mahesh123" };
const DEFAULT_PHONE = "919344889116";

const DEFAULT_PRODUCTS = [
  {
    id: "p1",
    name: "Classic Temple Gold Haram",
    category: "necklaces",
    price: 2450,
    image: "necklace.png",
    description: "Premium 24K gold plated traditional temple haram necklace, featuring exquisite classical engraving work and drop beads."
  },
  {
    id: "p2",
    name: "Brilliant Kundan Gold Jhumkas",
    category: "earrings",
    price: 650,
    image: "earrings.png",
    description: "Luxury micro-plated gold jhumka earrings set with stunning semi-precious Kundan stones and delicate pearl drops."
  },
  {
    id: "p3",
    name: "Antique Hand-Carved Bangles Set",
    category: "bangles",
    price: 1250,
    size: "2.6",
    image: "bangles.png",
    description: "A gorgeous set of 4 antique gold plated bangles, featuring highly detailed hand-carved classical Indian patterns."
  },
  {
    id: "p4",
    name: "Royal Peacock Pendant Chain",
    category: "chains",
    price: 950,
    image: "chain.png",
    description: "Elegant 24K gold micro-plated designer daily wear chain with a hand-enameled royal peacock designer pendant."
  },
  {
    id: "p5",
    name: "Adjustable Traditional Vanki Ring",
    category: "rings",
    price: 380,
    size: "Adjustable",
    image: "rings.png",
    description: "Traditional south Indian Vanki style chevron gold plated ring. Elegant structure with a comfortable adjustable band."
  }
];

// ─── FIREBASE INIT ───
let db = null;
let fbReady = false;

(function initFirebase() {
  try {
    if (
      typeof firebase !== "undefined" &&
      typeof firebaseConfig !== "undefined" &&
      firebaseConfig.apiKey !== "YOUR_API_KEY"
    ) {
      if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      console.log(
        "%c⏳ Checking Firebase Firestore accessibility...",
        "color:orange;font-weight:bold",
      );

      // Perform non-blocking write/read validation with a strict timeout to avoid blocking network delays
      const accessibilityCheck = db.collection("products").limit(1).get();
      const timeoutCheck = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Firebase connection timed out")),
          1500,
        ),
      );

      Promise.race([accessibilityCheck, timeoutCheck])
        .then(() => {
          fbReady = true;
          console.log(
            "%c✅ Firestore database is fully writeable & online",
            "color:#25D366;font-weight:bold",
          );
          const badge = document.getElementById("db-badge");
          if (badge) badge.style.display = "inline-flex";

          // Re-render dashboard/products with remote products now that we know Firebase is active
          const adminContainer = document.getElementById("admin-products");
          if (adminContainer) renderAdminProducts("admin-products");
          const publicContainer = document.getElementById("products-grid");
          if (publicContainer) {
            getProducts().then((products) =>
              renderProducts("products-grid", products),
            );
          }
        })
        .catch((err) => {
          console.warn(
            "⚠️ Firestore backend is unreachable or disabled in Console:",
            err.message,
          );
          console.warn(
            "%c🔌 Falling back instantly to LocalStorage to ensure high performance",
            "color:#E6C280;font-weight:bold",
          );
          fbReady = false;
          const badge = document.getElementById("db-badge");
          if (badge) badge.style.display = "none";
        });
    } else {
      console.warn(
        "%c⚠️ Firebase not configured — using localStorage",
        "color:orange",
      );
    }
  } catch (e) {
    console.warn("Firebase init failed:", e.message);
  }
})();

// ─── IMAGE COMPRESSION ───
function compressImage(file, maxW = 800, quality = 0.72) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width,
          h = img.height;
        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─── LOCAL STORAGE ───
function getProductsLocal() {
  const s = localStorage.getItem("sscc_products");
  if (!s) {
    localStorage.setItem("sscc_products", JSON.stringify([]));
    return [];
  }
  let parsed = JSON.parse(s);
  if (parsed.length > 0) {
    const filtered = parsed.filter(
      (p) => !["p1", "p2", "p3", "p4", "p5", "p6"].includes(p.id),
    );
    if (filtered.length !== parsed.length) {
      localStorage.setItem("sscc_products", JSON.stringify(filtered));
      return filtered;
    }
  }
  return parsed;
}
function saveProductsLocal(products) {
  localStorage.setItem("sscc_products", JSON.stringify(products));
}
function getPhoneLocal() {
  return localStorage.getItem("sscc_phone") || DEFAULT_PHONE;
}
function setPhoneLocal(p) {
  localStorage.setItem("sscc_phone", p);
}

// ─── TIMEOUT HELPER ───
function withTimeout(
  promise,
  ms = 1500,
  errorMsg = "Firebase connection timeout",
) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), ms),
    ),
  ]);
}

// ─── FIREBASE OPERATIONS ───
async function fbGetProducts() {
  const snap = await withTimeout(
    db.collection("products").orderBy("createdAt", "desc").get(),
    1800,
  );
  if (snap.empty) {
    return [];
  }
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
async function fbAddProduct(p) {
  return (
    await withTimeout(
      db
        .collection("products")
        .add({
          ...p,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        }),
      1800,
    )
  ).id;
}
async function fbUpdateProduct(id, d) {
  await withTimeout(
    db
      .collection("products")
      .doc(id)
      .update({
        ...d,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }),
    1800,
  );
}
async function fbDeleteProduct(id) {
  await withTimeout(db.collection("products").doc(id).delete(), 1800);
}
async function fbGetPhone() {
  const d = await withTimeout(
    db.collection("settings").doc("general").get(),
    1800,
  );
  return d.exists ? d.data().phone || DEFAULT_PHONE : DEFAULT_PHONE;
}
async function fbSetPhone(phone) {
  await withTimeout(
    db.collection("settings").doc("general").set({ phone }, { merge: true }),
    1800,
  );
}

// ─── UNIFIED API ───
async function getProducts() {
  if (fbReady) {
    try {
      const fbProducts = await fbGetProducts();
      if (fbProducts && fbProducts.length > 0) {
        return fbProducts;
      }
    } catch (e) {
      console.warn("FB read failed:", e.message);
    }
  }
  const localProducts = getProductsLocal();
  if (localProducts && localProducts.length > 0) {
    return localProducts;
  }
  return DEFAULT_PRODUCTS;
}
async function getPhone() {
  if (fbReady) {
    try {
      return await fbGetPhone();
    } catch (e) {}
  }
  return getPhoneLocal();
}
async function setPhone(phone) {
  setPhoneLocal(phone);
  if (fbReady) {
    try {
      await fbSetPhone(phone);
    } catch (e) {}
  }
}

// ─── AUTH ───
function isLoggedIn() {
  return sessionStorage.getItem("sscc_admin") === "true";
}
function login(user, pass) {
  if (
    user === ADMIN_CREDENTIALS.username &&
    pass === ADMIN_CREDENTIALS.password
  ) {
    sessionStorage.setItem("sscc_admin", "true");
    return true;
  }
  return false;
}
function logout() {
  sessionStorage.removeItem("sscc_admin");
  window.location.href = "admin.html";
}

// ─── WHATSAPP ───
async function bookViaWhatsAppById(productId) {
  const products = await getProducts();
  const product = products.find((p) => p.id === productId);
  if (!product) return;
  const phone = "919344889116";
  const sizeStr = product.size ? ` (Size: ${product.size})` : "";
  const msg = `🛒 *Order Enquiry — Sri Saravana Covering*\n\n📦 Item: ${product.name}${sizeStr}\n💰 Price: ₹${Number(product.price).toLocaleString("en-IN")}\n🏷️ Category: ${product.category}\n\nI would like to book this item. Please confirm availability.`;

  // Try sharing image + text via Web Share API (works on mobile)
  if (navigator.share && navigator.canShare) {
    try {
      const imageFile = await getImageFile(product.image, product.name);
      if (imageFile && navigator.canShare({ files: [imageFile] })) {
        await navigator.share({
          text: msg,
          files: [imageFile],
        });
        return;
      }
    } catch (e) {
      // User cancelled or share failed — fall through to WhatsApp link
      if (e.name === "AbortError") return;
    }
  }

  // Fallback: open WhatsApp with text + image link
  let imgUrl = "";
  if (product.image && !product.image.startsWith("data:")) {
    imgUrl = new URL(product.image, window.location.href).href;
  }
  const fallbackMsg = imgUrl
    ? msg + `\n\n📸 Product Image: ${imgUrl}`
    : msg;
  window.open(
    `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(fallbackMsg)}`,
    "_blank",
  );
}

// Convert image source (base64 or URL) to a File object for sharing
async function getImageFile(imageSrc, productName) {
  try {
    let blob;
    if (imageSrc.startsWith("data:")) {
      // Base64 image — convert to blob
      const res = await fetch(imageSrc);
      blob = await res.blob();
    } else {
      // URL image — fetch it
      const res = await fetch(imageSrc);
      if (!res.ok) return null;
      blob = await res.blob();
    }
    const ext = blob.type.split("/")[1] || "jpeg";
    const safeName = productName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
    return new File([blob], `${safeName}.${ext}`, { type: blob.type });
  } catch (e) {
    console.warn("Could not create image file for sharing:", e.message);
    return null;
  }
}

// ─── RENDER PRODUCTS (public) ───
function renderProducts(containerId, products) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!products || !products.length) {
    container.innerHTML =
      '<div style="text-align:center;grid-column:1/-1;padding:60px 20px;"><p style="color:var(--text-medium);">No products found</p></div>';
    return;
  }
  container.innerHTML = products
    .map(
      (p) => `
        <div class="product-card animate-in">
            <div class="card-img-wrap">
                <img class="card-img" src="${p.image}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/400x300/0F2647/D4AF37?text=No+Image'">
                <span class="card-badge">${p.category}</span>
            </div>
            <div class="card-body">
                <h3>${p.name}</h3>
                <p class="category-tag">${p.category}</p>
                <p class="price">
                    ₹${Number(p.price).toLocaleString("en-IN")}
                    ${p.size ? `<span style="font-size:0.8rem;background:rgba(26,86,219,0.06);color:var(--text-dark);padding:2px 8px;border-radius:4px;margin-left:10px;border:1px solid rgba(26,86,219,0.15);">Size: ${p.size}</span>` : ""}
                </p>
                <p class="desc">${p.description}</p>
                <div class="card-actions">
                    <button class="btn btn-whatsapp" onclick="bookViaWhatsAppById('${p.id}')">📱 WhatsApp Book</button>
                </div>
            </div>
        </div>`,
    )
    .join("");
  observeAnimations();
}

// ─── RENDER ADMIN LIST ───
function renderAdminProducts(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML =
    '<p style="text-align:center;padding:30px;color:var(--text-medium);">⏳ Loading...</p>';
  getProducts()
    .then((products) => {
      const countEl = document.getElementById("product-count");
      if (countEl) countEl.textContent = products.length;
      if (!products.length) {
        container.innerHTML =
          '<p style="color:var(--text-medium);text-align:center;padding:30px;">No products yet. Add your first product above!</p>';
        return;
      }
      container.innerHTML = products
        .map(
          (p) => `
            <div class="admin-item">
                <img src="${p.image}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/100/0F2647/D4AF37?text=No+Img'">
                <div class="admin-item-info">
                    <h4>${p.name}</h4>
                    <span class="cat">${p.category}</span>
                    ${p.size ? `<span style="font-size:0.75rem;background:rgba(26,86,219,0.06);color:var(--text-dark);padding:2px 6px;border-radius:4px;margin-left:8px;border:1px solid rgba(26,86,219,0.15);display:inline-block;">Size: ${p.size}</span>` : ""}
                    <p class="price">₹${Number(p.price).toLocaleString("en-IN")}</p>
                </div>
                <div class="admin-item-actions">
                    <button class="btn-edit" onclick="editProduct('${p.id}')">✏️ Edit</button>
                    <button class="btn-delete" onclick="deleteProduct('${p.id}')">🗑️</button>
                </div>
            </div>`,
        )
        .join("");
      // Show DB badge
      const badge = document.getElementById("db-badge");
      if (badge) badge.style.display = fbReady ? "inline-flex" : "none";
    })
    .catch(() => {
      container.innerHTML =
        '<p style="color:red;text-align:center;padding:30px;">⚠️ Failed to load products.</p>';
    });
}

// ─── ADMIN CRUD ───
async function addProduct(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  const fileInput = document.getElementById("pimage");
  let image = "necklace.png";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Saving...";
  }
  try {
    if (fileInput.files && fileInput.files[0])
      image = await compressImage(fileInput.files[0]);
    let cat = form.pcategory.value;
    if (cat === "other") {
      const customCat = document.getElementById("pcustom-cat");
      if (customCat && customCat.value.trim()) {
        cat = customCat.value.trim().toLowerCase();
      } else {
        showToast("❌ Please enter a custom category name");
        if (btn) { btn.disabled = false; btn.textContent = "➕ Add Product"; }
        return;
      }
    }
    const product = {
      name: form.pname.value.trim(),
      category: cat,
      price: parseInt(form.pprice.value),
      image,
      description: form.pdesc.value.trim(),
    };
    if (cat === "rings" || cat === "bangles") {
      const sizeEl = document.getElementById("psize");
      if (sizeEl) product.size = sizeEl.value;
    }
    if (fbReady) {
      try {
        product.id = await fbAddProduct(product);
      } catch (e) {
        product.id = "p" + Date.now();
        const loc = getProductsLocal();
        loc.push(product);
        saveProductsLocal(loc);
      }
    } else {
      product.id = "p" + Date.now();
      const loc = getProductsLocal();
      loc.push(product);
      saveProductsLocal(loc);
    }
    form.reset();
    const prev = document.getElementById("pimage-preview");
    if (prev) prev.style.display = "none";
    // Reset size field display
    const sizeGroup = document.getElementById("psize-group");
    if (sizeGroup) sizeGroup.style.display = "none";
    // Reset custom category field
    const customGroup = document.getElementById("pcustom-cat-group");
    if (customGroup) customGroup.style.display = "none";
    const customInput = document.getElementById("pcustom-cat");
    if (customInput) customInput.value = "";
    renderAdminProducts("admin-products");
    showToast(
      "✅ Product saved to " + (fbReady ? "Firebase!" : "local storage!"),
    );
  } catch (err) {
    showToast("❌ Error: " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "➕ Add Product";
    }
  }
}

async function deleteProduct(id) {
  if (!confirm("Delete this product?")) return;
  try {
    if (fbReady) {
      try {
        await fbDeleteProduct(id);
      } catch (e) {
        const loc = getProductsLocal().filter((p) => p.id !== id);
        saveProductsLocal(loc);
      }
    } else {
      const loc = getProductsLocal().filter((p) => p.id !== id);
      saveProductsLocal(loc);
    }
    renderAdminProducts("admin-products");
    showToast("🗑️ Product deleted");
  } catch (e) {
    showToast("❌ Delete failed");
  }
}

async function editProduct(id) {
  try {
    const products = await getProducts();
    const p = products.find((x) => x.id === id);
    if (!p) return;
    const modal = document.getElementById("editModal");
    if (!modal) return;
    document.getElementById("edit-id").value = p.id;
    document.getElementById("edit-name").value = p.name;
    document.getElementById("edit-price").value = p.price;
    document.getElementById("edit-desc").value = p.description;

    // Handle custom category for Edit Modal
    const editCatSelect = document.getElementById("edit-category");
    const editCustomGroup = document.getElementById("edit-custom-cat-group");
    const editCustomInput = document.getElementById("edit-custom-cat");
    const standardCats = ["necklaces", "earrings", "bangles", "bridal", "chains", "rings"];
    if (standardCats.includes(p.category)) {
      editCatSelect.value = p.category;
      if (editCustomGroup) editCustomGroup.style.display = "none";
      if (editCustomInput) editCustomInput.value = "";
    } else {
      editCatSelect.value = "other";
      if (editCustomGroup) editCustomGroup.style.display = "block";
      if (editCustomInput) editCustomInput.value = p.category;
    }

    // Handle Size rendering for Edit Modal
    const editSizeGroup = document.getElementById("edit-size-group");
    const editSizeSelect = document.getElementById("edit-size");
    if (editCatSelect && editSizeGroup && editSizeSelect) {
      handleCategoryChange(editCatSelect, editSizeGroup, editSizeSelect);
      if (p.size) {
        editSizeSelect.value = p.size;
      }
    }

    const prev = document.getElementById("edit-image-preview");
    if (prev) {
      prev.src = p.image;
      prev.style.display = "block";
    }
    document.getElementById("edit-image").value = "";
    modal.classList.add("active");
  } catch (e) {
    showToast("❌ Error loading product");
  }
}

async function saveEdit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Saving...";
  }
  try {
    const id = document.getElementById("edit-id").value;
    const fileInput = document.getElementById("edit-image");
    const products = await getProducts();
    const existing = products.find((p) => p.id === id);
    let image = existing ? existing.image : "necklace.png";
    if (fileInput.files && fileInput.files[0])
      image = await compressImage(fileInput.files[0]);
    let cat = document.getElementById("edit-category").value;
    if (cat === "other") {
      const customCat = document.getElementById("edit-custom-cat");
      if (customCat && customCat.value.trim()) {
        cat = customCat.value.trim().toLowerCase();
      } else {
        showToast("❌ Please enter a custom category name");
        if (btn) { btn.disabled = false; btn.textContent = "💾 Save Changes"; }
        return;
      }
    }
    const data = {
      name: document.getElementById("edit-name").value.trim(),
      category: cat,
      price: parseInt(document.getElementById("edit-price").value),
      image,
      description: document.getElementById("edit-desc").value.trim(),
    };
    if (cat === "rings" || cat === "bangles") {
      const sizeEl = document.getElementById("edit-size");
      if (sizeEl) data.size = sizeEl.value;
    } else {
      // Delete size property if category is changed to a non-sized category
      data.size = firebase.firestore.FieldValue.delete();
    }
    if (fbReady) {
      try {
        await fbUpdateProduct(id, data);
      } catch (e) {
        const loc = getProductsLocal();
        const i = loc.findIndex((p) => p.id === id);
        if (i !== -1) {
          loc[i] = { ...loc[i], ...data };
          delete loc[i].size;
          saveProductsLocal(loc);
        }
      }
    } else {
      const loc = getProductsLocal();
      const i = loc.findIndex((p) => p.id === id);
      if (i !== -1) {
        loc[i] = { ...loc[i], ...data };
        if (cat !== "rings" && cat !== "bangles") delete loc[i].size;
        saveProductsLocal(loc);
      }
    }
    document.getElementById("editModal").classList.remove("active");
    renderAdminProducts("admin-products");
    showToast("✅ Product updated!");
  } catch (err) {
    showToast("❌ Save failed: " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "💾 Save Changes";
    }
  }
}

async function updatePhone() {
  const input = document.getElementById("phone-input");
  if (!input) return;
  const val = input.value.trim().replace(/\D/g, "");
  if (val.length < 10) {
    alert("Enter a valid phone number");
    return;
  }
  const phone = val.startsWith("91") ? val : "91" + val;
  await setPhone(phone);
  showToast("📱 WhatsApp number updated!");
}

// ─── FILTERING & SEARCH ───
async function filterProducts(category) {
  const products = await getProducts();
  const filtered =
    category === "all"
      ? products
      : products.filter((p) => p.category === category);
  renderProducts("products-grid", filtered);
  document
    .querySelectorAll(".filter-btn")
    .forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.cat === category),
    );
}
async function searchProducts(query) {
  const products = await getProducts();
  const q = query.toLowerCase();
  renderProducts(
    "products-grid",
    products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    ),
  );
}

// ─── UTILITIES ───
function showToast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3500);
}
function observeAnimations() {
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.1 },
  );
  document.querySelectorAll(".animate-in").forEach((el) => obs.observe(el));
}

// ─── DYNAMIC SIZING FOR RINGS & BANGLES ───
function handleCategoryChange(selectEl, groupEl, sEl) {
  if (!selectEl || !groupEl || !sEl) return;
  const cat = selectEl.value;
  if (cat === "bangles") {
    groupEl.style.display = "block";
    sEl.innerHTML = `
            <option value="2.2">2.2</option>
            <option value="2.4">2.4</option>
            <option value="2.6" selected>2.6</option>
            <option value="2.8">2.8</option>
            <option value="2.10">2.10</option>
            <option value="Adjustable">Adjustable</option>
            <option value="All Sizes">All Sizes</option>
        `;
  } else if (cat === "rings") {
    groupEl.style.display = "block";
    sEl.innerHTML = `
            <option value="Adjustable" selected>Adjustable</option>
            <option value="10">10</option>
            <option value="12">12</option>
            <option value="14">14</option>
            <option value="16">16</option>
            <option value="18">18</option>
            <option value="20">20</option>
            <option value="All Sizes">All Sizes</option>
        `;
  } else {
    groupEl.style.display = "none";
    sEl.innerHTML = "";
  }
}

// ─── CUSTOM CATEGORY TOGGLE ───
function handleCustomCategory(selectEl, groupEl, inputEl) {
  if (!selectEl || !groupEl || !inputEl) return;
  if (selectEl.value === "other") {
    groupEl.style.display = "block";
    inputEl.setAttribute("required", "true");
  } else {
    groupEl.style.display = "none";
    inputEl.removeAttribute("required");
    inputEl.value = "";
  }
}

// ─── WHATSAPP FLOAT CARD ───
function toggleWACard() {
  const popup = document.getElementById("waPopup");
  if (popup) popup.classList.toggle("open");
}
setTimeout(() => {
  const popup = document.getElementById("waPopup");
  if (popup && !sessionStorage.getItem("waShown")) {
    popup.classList.add("open");
    sessionStorage.setItem("waShown", "1");
    setTimeout(() => popup.classList.remove("open"), 6000);
  }
}, 3000);

// ─── HAMBURGER MENU ───
function toggleMenu() {
  const nav = document.querySelector(".nav-links");
  const btn = document.querySelector(".hamburger");
  if (nav) nav.classList.toggle("open");
  if (btn) btn.classList.toggle("open");
}

// ─── INIT ───
document.addEventListener("DOMContentLoaded", () => {
  // Close menu on link click or outside click
  document.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", () => {
      document.querySelector(".nav-links")?.classList.remove("open");
      document.querySelector(".hamburger")?.classList.remove("open");
    });
  });
  document.addEventListener("click", (e) => {
    const nav = document.querySelector(".nav-links");
    const ham = document.querySelector(".hamburger");
    if (nav && ham && !nav.contains(e.target) && !ham.contains(e.target)) {
      nav.classList.remove("open");
      ham.classList.remove("open");
    }
  });

  // Scroll animations
  observeAnimations();

  // Navbar scroll effect
  window.addEventListener("scroll", () => {
    const nb = document.querySelector(".navbar");
    if (nb)
      nb.style.background =
        window.scrollY > 50
          ? "rgba(255, 255, 255, 0.98)"
          : "rgba(255, 255, 255, 0.95)";
  });

  // Image preview — Add form
  const addImg = document.getElementById("pimage");
  if (addImg)
    addImg.addEventListener("change", function () {
      const prev = document.getElementById("pimage-preview");
      if (this.files && this.files[0] && prev) {
        const r = new FileReader();
        r.onload = (e) => {
          prev.src = e.target.result;
          prev.style.display = "block";
        };
        r.readAsDataURL(this.files[0]);
      }
    });

  // Image preview — Edit form
  const editImg = document.getElementById("edit-image");
  if (editImg)
    editImg.addEventListener("change", function () {
      const prev = document.getElementById("edit-image-preview");
      if (this.files && this.files[0] && prev) {
        const r = new FileReader();
        r.onload = (e) => {
          prev.src = e.target.result;
          prev.style.display = "block";
        };
        r.readAsDataURL(this.files[0]);
      }
    });
});
