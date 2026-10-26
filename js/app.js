/* The Nine Sport — Catálogo y pedidos */

/* Sesión de clientes (independiente del panel) */
if (typeof window !== "undefined" && window.supabaseStore) {
  window.supabase = window.supabaseStore;
  var supabase = window.supabaseStore;
}

const products = []; // se llena desde Supabase (tabla products)
const PRODUCTS_CACHE_KEY = "nine_products_v1";
const PRODUCTS_CACHE_MS = 3 * 60 * 1000; // 3 min

function readProductsCache() {
  try {
    const raw = sessionStorage.getItem(PRODUCTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items) || !parsed.at) return null;
    if (Date.now() - parsed.at > PRODUCTS_CACHE_MS) return null;
    return parsed.items;
  } catch {
    return null;
  }
}

function writeProductsCache(items) {
  try {
    sessionStorage.setItem(
      PRODUCTS_CACHE_KEY,
      JSON.stringify({ at: Date.now(), items })
    );
  } catch (_) {}
}

/** Miniatura más liviana si la foto está en Storage de Supabase */
function productThumb(url) {
  if (!url || typeof url !== "string") return "assets/logo.png";
  // Transform de imagen de Supabase (si el proyecto lo tiene activo)
  if (url.includes("/storage/v1/object/public/")) {
    return url.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/"
    ) + (url.includes("?") ? "&" : "?") + "width=480&quality=65&resize=contain";
  }
  return url;
}



const categoryLabels = {
  f11: "F11",
  f5: "F5",
  futsal: "Futsal",
  zapatillas: "Zapatillas",
  guantes: "Guantes",
  camisetas: "Camisetas",
  accesorios: "Accesorios"
};

let cart = [];
let currentMode = "all";
let currentCategory = "all";
let modalProduct = null;
let modalImgIndex = 0;
let currentUser = null;
let pendingCheckout = false;
let productsChannel = null;
let ordersChannel = null;

document.addEventListener("DOMContentLoaded", async () => {
  if (!supabase) {
    console.error("Supabase no disponible");
    applyFilters();
    updateCartUI();
    return;
  }

  // Pintar al toque con caché (si hay) mientras llega la red
  const cached = readProductsCache();
  if (cached && cached.length) {
    products.length = 0;
    cached.forEach((p) => products.push(p));
    applyFilters();
  }

  updateCartUI();
  // Productos y sesión en paralelo
  await Promise.all([loadProductsFromDB(), checkSession()]);
  applyFilters();
  subscribeProductsRealtime();
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    updateAuthUI();
    if (currentUser) {
      subscribeOrdersRealtime();
    } else {
      unsubscribeOrdersRealtime();
    }
    if (currentUser && pendingCheckout) {
      pendingCheckout = false;
      processOrder();
    }
  });
  if (currentUser) subscribeOrdersRealtime();
});

/** Catálogo en vivo: stock, precios, productos nuevos */
function subscribeProductsRealtime() {
  if (!supabase || productsChannel) return;
  productsChannel = supabase
    .channel("store-products")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "products" },
      async () => {
        await loadProductsFromDB();
        applyFilters();
        // Si el modal está abierto, refrescar datos del producto
        if (modalProduct) {
          const updated = products.find((p) => p.id === modalProduct.id);
          if (updated) {
            modalProduct = updated;
            renderModal();
          }
        }
      }
    )
    .subscribe();
}

/** Pedidos del cliente en vivo (estados) */
function subscribeOrdersRealtime() {
  if (!supabase || !currentUser) return;
  unsubscribeOrdersRealtime();
  ordersChannel = supabase
    .channel("my-orders-" + currentUser.id)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `user_id=eq.${currentUser.id}`,
      },
      () => {
        const panel = document.getElementById("account-panel-pedidos");
        if (panel && panel.classList.contains("active")) {
          loadMyOrders();
        }
        refreshOrdersBadge();
      }
    )
    .subscribe();
}


async function refreshOrdersBadge() {
  const badge = document.getElementById("orders-badge");
  const btn = document.getElementById("orders-btn");
  if (!badge) return;
  if (!supabase || !currentUser) {
    badge.hidden = true;
    badge.textContent = "";
    return;
  }
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("id, estado")
      .eq("user_id", currentUser.id)
      .in("estado", ["nuevo", "confirmado", "preparado"]);
    if (error) throw error;
    const n = (data || []).length;
    if (n > 0) {
      badge.hidden = false;
      badge.textContent = String(n);
      if (btn) btn.hidden = false;
    } else {
      badge.hidden = true;
      badge.textContent = "";
    }
  } catch (e) {
    badge.hidden = true;
  }
}

function unsubscribeOrdersRealtime() {
  if (ordersChannel && supabase) {
    supabase.removeChannel(ordersChannel);
    ordersChannel = null;
  }
}

function showProductSkeletons(n = 8) {
  const container = document.getElementById("product-grid");
  if (!container) return;
  container.innerHTML = Array.from({ length: n }, () =>
    `<article class="product-card skeleton-card" aria-hidden="true">
      <div class="skel skel-img"></div>
      <div class="card-body">
        <div class="skel skel-line short"></div>
        <div class="skel skel-line"></div>
        <div class="skel skel-line price"></div>
      </div>
    </article>`
  ).join("");
}

async function loadProductsFromDB() {
  showProductSkeletons();

  try {
    const { data, error } = await supabase
      .from("products")
      .select("id,name,category,price,badge,images,sizes,description,stock_qty,availability,supplier,supplier_code,drive_folder_url,active")
      .eq("active", true)
      .order("id");

    products.length = 0;

    if (error) {
      console.error("Error cargando productos:", error.message);
      return;
    }

    if (!data || !data.length) {
      console.warn(
        "No hay productos activos. En el panel marcá Visible, o SQL: UPDATE products SET active = true;"
      );
      return;
    }

    const seen = new Set();
    data.forEach((p) => {
      if (seen.has(p.id)) return;
      seen.add(p.id);
      const sizes = Array.isArray(p.sizes) && p.sizes.length ? p.sizes : ["Único"];
      products.push({
        id: p.id,
        availability: p.availability || "stock",
        name: p.name,
        category: p.category,
        price: Number(p.price) || 0,
        badge: p.badge || "",
        images: Array.isArray(p.images) ? p.images : [],
        sizes,
        description: p.description || "",
        stock_qty: Number(p.stock_qty) || 0,
        supplier: p.supplier || "",
        supplier_code: p.supplier_code || "",
        drive_folder_url: p.drive_folder_url || "",
      });
    });
    writeProductsCache(products);
    console.log("Productos cargados desde Supabase:", products.length);
  } catch (e) {
    console.error("loadProductsFromDB", e);
  }
}

/* ---------- Auth ---------- */
async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;
  updateAuthUI();
}

function updateAuthUI() {
  const btn = document.getElementById("auth-btn");
  const ordersBtn = document.getElementById("orders-btn");
  if (btn) {
    if (currentUser) {
      const name = currentUser.user_metadata?.nombre || currentUser.email?.split("@")[0] || "Cuenta";
      btn.textContent = "Cuenta";
      refreshOrdersBadge();
      btn.title = name;
      btn.setAttribute("data-auth", "account");
      btn.setAttribute("aria-label", "Mi cuenta");
    } else {
      btn.textContent = "Ingresar";
      btn.title = "";
      btn.setAttribute("data-auth", "login");
      btn.setAttribute("aria-label", "Ingresar");
    }
  }
  if (ordersBtn) {
    ordersBtn.hidden = !currentUser;
  }
}

// Binding único y confiable del botón de auth
document.addEventListener("click", (e) => {
  const btn = e.target.closest("#auth-btn");
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const mode = btn.getAttribute("data-auth");
  if (mode === "account") {
    openAccountModal();
  } else {
    openAuthModal("login");
  }
});

/* ---------- Cuenta del cliente ---------- */
function openAccountModal() {
  if (!currentUser) {
    openAuthModal("login");
    return;
  }
  const modal = document.getElementById("account-modal");
  if (!modal) return;
  modal.classList.add("show");
  document.body.style.overflow = "hidden";
  switchAccountTab("perfil");
  loadMyProfile();
}

function closeAccountModal() {
  const modal = document.getElementById("account-modal");
  if (modal) modal.classList.remove("show");
  document.body.style.overflow = "";
  const err = document.getElementById("account-error");
  const ok = document.getElementById("account-ok");
  if (err) err.textContent = "";
  if (ok) ok.textContent = "";
}

function switchAccountTab(tab) {
  if (tab === "pedidos") {
    const badge = document.getElementById("orders-badge");
    if (badge) { badge.hidden = true; badge.textContent = ""; }
  }

  document.querySelectorAll(".account-tab").forEach((t) => t.classList.toggle("active", t.dataset.atab === tab));
  document.querySelectorAll(".account-panel").forEach((p) => p.classList.remove("active"));
  const panel = document.getElementById(`account-panel-${tab}`);
  if (panel) panel.classList.add("active");
  if (tab === "pedidos") loadMyOrders();
}

async function loadMyProfile() {
  if (!currentUser || !supabase) return;
  const { data } = await supabase.from("profiles").select("*").eq("id", currentUser.id).maybeSingle();
  const p = data || {};
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.value = v || "";
  };
  set("prof-nombre", p.nombre || currentUser.user_metadata?.nombre || "");
  set("prof-apellido", p.apellido || currentUser.user_metadata?.apellido || "");
  set("prof-telefono", p.telefono || currentUser.user_metadata?.telefono || "");
  set("prof-email", p.email || currentUser.email || "");
}

async function saveMyProfile(e) {
  e.preventDefault();
  const errEl = document.getElementById("account-error");
  const okEl = document.getElementById("account-ok");
  if (errEl) errEl.textContent = "";
  if (okEl) okEl.textContent = "";
  if (!currentUser) return;

  const nombre = document.getElementById("prof-nombre").value.trim();
  const apellido = document.getElementById("prof-apellido").value.trim();
  const telefono = normalizePhoneAR(document.getElementById("prof-telefono").value);
  if (!nombre || !apellido || !telefono) {
    if (errEl) errEl.textContent = "Completá nombre, apellido y WhatsApp.";
    return;
  }
  if (telefono.replace(/\D/g, "").length < 10) {
    if (errEl) errEl.textContent = "El teléfono parece incompleto.";
    return;
  }

  const { error } = await supabase.from("profiles").upsert({
    id: currentUser.id,
    nombre,
    apellido,
    telefono,
    email: currentUser.email,
  });
  if (error) {
    if (errEl) errEl.textContent = error.message;
    return;
  }
  await supabase.auth.updateUser({ data: { nombre, apellido, telefono } });
  if (okEl) okEl.textContent = "Datos guardados.";
  showToast("Perfil actualizado");
  updateAuthUI();
}

async function loadMyOrders() {
  const list = document.getElementById("my-orders-list");
  if (!list || !currentUser) return;
  list.innerHTML = `<p class="empty-grid">Cargando pedidos...</p>`;

  const { data, error } = await supabase
    .from("orders")
    .select("id, items, total, estado, created_at, notas")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    list.innerHTML = `<p class="empty-grid">Error: ${error.message}</p>`;
    return;
  }
  if (!data || !data.length) {
    list.innerHTML = `<p class="empty-grid">Todavía no tenés pedidos.</p>`;
    return;
  }

  const labels = {
    nuevo: "Nuevo",
    confirmado: "Tomado",
    preparado: "Preparado",
    entregado: "Entregado",
    cancelado: "Cancelado",
  };

  list.innerHTML = data
    .map((o) => {
      const items = Array.isArray(o.items) ? o.items : [];
      const itemsHtml = items
        .map(
          (i) =>
            `<li>${escapeClient(i.nombre)} · Talle ${escapeClient(i.talle)} ×${i.cantidad}${
              i.availability === "restock" ? " <em>(encargar)</em>" : ""
            }</li>`
        )
        .join("");
      return `
      <article class="my-order-card">
        <div class="my-order-head">
          <span>${new Date(o.created_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</span>
          <em class="estado-badge estado-${o.estado}">${labels[o.estado] || o.estado}</em>
        </div>
        <ul class="my-order-items">${itemsHtml}</ul>
        <p class="my-order-total"><strong>Total:</strong> $${Number(o.total || 0).toLocaleString("es-AR")}</p>
      </article>`;
    })
    .join("");
}

function escapeClient(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Normaliza teléfono argentino a dígitos útiles */
function normalizePhoneAR(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("54") && d.length > 10) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.startsWith("15") && d.length >= 10) d = d.slice(2);
  return d;
}

function openAuthModal(tab) {
  document.getElementById("auth-modal").classList.add("show");
  document.body.style.overflow = "hidden";
  switchAuthTab(tab || "login");
  document.getElementById("auth-error").textContent = "";
}

function closeAuthModal() {
  document.getElementById("auth-modal").classList.remove("show");
  document.body.style.overflow = "";
  pendingCheckout = false;
}

function switchAuthTab(tab) {
  document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));
  const tabBtn = document.querySelector(`.auth-tab[data-tab="${tab}"]`);
  const form = document.getElementById(`form-${tab}`);
  if (tabBtn) tabBtn.classList.add("active");
  if (form) form.classList.add("active");
  document.getElementById("auth-error").textContent = "";
}

async function handleRegister(e) {
  e.preventDefault();
  const errEl = document.getElementById("auth-error");
  errEl.textContent = "";
  const nombre = document.getElementById("reg-nombre").value.trim();
  const apellido = document.getElementById("reg-apellido").value.trim();
  const telefonoRaw = document.getElementById("reg-telefono").value.trim();
  const telefono = normalizePhoneAR(telefonoRaw);
  const email = document.getElementById("reg-email").value.trim().toLowerCase();
  const password = document.getElementById("reg-password").value;
  const password2 = document.getElementById("reg-password2")?.value || "";

  if (!nombre || !apellido || !telefonoRaw || !email || password.length < 6) {
    errEl.textContent = "Completá todos los campos. La contraseña debe tener al menos 6 caracteres.";
    return;
  }
  if (password !== password2) {
    errEl.textContent = "Las contraseñas no coinciden.";
    return;
  }
  if (telefono.replace(/\D/g, "").length < 10) {
    errEl.textContent = "Ingresá un WhatsApp válido con código de área (ej. 3364…).";
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errEl.textContent = "El email no parece válido.";
    return;
  }

  if (!supabase) {
    errEl.textContent = "No hay conexión con el servidor. Actualizá la página e intentá de nuevo.";
    return;
  }

  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.textContent = "Creando cuenta...";

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, apellido, telefono },
      },
    });

    if (error) {
      const msg = error.message || "";
      if (/already|registered|exists/i.test(msg)) {
        errEl.textContent = "Ese email ya tiene cuenta. Ingresá con tu contraseña.";
        switchAuthTab("login");
      } else {
        errEl.textContent = msg;
      }
      return;
    }

    if (!data.user) {
      errEl.textContent = "No se pudo crear la cuenta. Probá de nuevo.";
      return;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      nombre,
      apellido,
      telefono,
      email,
    });

    if (profileError) {
      console.warn("Perfil:", profileError.message);
    }

    if (!data.session) {
      errEl.textContent = "Cuenta creada. Si pide confirmar email, desactivá Confirm email en Supabase.";
      showToast("Cuenta creada");
      return;
    }

    currentUser = data.user;
    updateAuthUI();
    showToast("¡Cuenta creada!");
    closeAuthModal();
  } catch (err) {
    console.error(err);
    errEl.textContent = err.message || "Error de red. Revisá la consola (F12).";
  } finally {
    btn.disabled = false;
    btn.textContent = "Crear cuenta";
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const errEl = document.getElementById("auth-error");
  errEl.textContent = "";
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!supabase) {
    errEl.textContent = "Error de conexión. Recargá la página.";
    return;
  }

  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.textContent = "Ingresando...";

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      errEl.textContent = error.message;
      return;
    }
    currentUser = data.user;
    updateAuthUI();
    showToast("¡Bienvenido!");
    closeAuthModal();
  } catch (err) {
    console.error(err);
    errEl.textContent = err.message || "Error de red.";
  } finally {
    btn.disabled = false;
    btn.textContent = "Ingresar";
  }
}

async function logout() {
  await supabase.auth.signOut();
  currentUser = null;
  updateAuthUI();
  closeAccountModal();
  showToast("Sesión cerrada");
}

/* ---------- Catálogo ---------- */
function setMode(mode, btn) {
  currentMode = mode;
  document.querySelectorAll(".mode-tab").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  const titles = {
    all: "Catálogo",
    stock: "En el local",
    restock: "Para encargar"
  };
  document.getElementById("section-title").textContent = titles[mode] || "Catálogo";
  applyFilters();
}

function filterCategory(cat, btn) {
  currentCategory = cat;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  applyFilters();
}

function applyFilters() {
  let list = products.slice();
  // "all" = toda la tienda (stock + encargar)
  if (currentMode === "stock" || currentMode === "restock") {
    list = list.filter(p => (p.availability || "stock") === currentMode);
  }
  if (currentCategory !== "all") {
    list = list.filter(p => p.category === currentCategory);
  }
  renderProducts(list);
}

function renderProducts(items) {
  const container = document.getElementById("product-grid");
  const countEl = document.getElementById("product-count");
  if (!container) return;

  countEl.textContent = items.length === 1 ? "1 producto" : `${items.length} productos`;

  if (!items.length) {
    container.innerHTML = `<p class="empty-grid">No hay productos en esta sección.</p>`;
    return;
  }

  container.innerHTML = items.map((p, idx) => {
    const isRestock = (p.availability || "stock") === "restock";
    const isAgotado = !isRestock && Number(p.stock_qty) <= 0;
    const rawImg = (p.images && p.images[0]) || "assets/logo.png";
    const thumb = productThumb(rawImg);
    const eager = idx < 6;
    let badge = "";
    if (isAgotado) badge = `<span class="badge badge-agotado">Agotado</span>`;
    else if (p.badge) badge = `<span class="badge">${p.badge}</span>`;
    else if (isRestock) badge = `<span class="badge restock">Para encargar</span>`;

    const cartBtn = isAgotado
      ? `<button class="btn-primary btn-restock" onclick="quickAddAsRestock(${p.id})">Encargar restock</button>`
      : isRestock
        ? `<button class="btn-primary btn-restock" onclick="quickAddToCart(${p.id})">Encargar</button>`
        : `<button class="btn-primary" onclick="quickAddToCart(${p.id})">+ Carrito</button>`;

    return `
    <article class="product-card ${isAgotado ? "is-agotado" : ""} ${isRestock ? "is-restock" : ""}" style="--i:${idx}">
      ${badge}
      <div class="card-img-wrapper" onclick="openProductModal(${p.id})">
        <img src="${thumb}" alt="${p.name}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" class="card-img" onload="this.classList.add('loaded')" onerror="this.onerror=null;this.src='${rawImg.replace(/'/g, "\'")}';this.classList.add('loaded')" />
        <span class="card-img-hint">Ver fotos</span>
        ${isAgotado ? `<span class="agotado-overlay">Agotado · podés encargar</span>` : ""}
      </div>
      <div class="card-body">
        <span class="category-tag">${categoryLabels[p.category] || p.category}</span>
        <h3>${p.name}</h3>
        <p class="price">${Number(p.price) > 0 ? "$" + Number(p.price).toLocaleString("es-AR") : "Consultar"}</p>
        ${isAgotado ? `<p class="card-hint">Sin stock en el local · encargá para la próxima llegada</p>` : ""}
        <div class="card-actions">
          <button class="btn-secondary" onclick="openProductModal(${p.id})">Ver</button>
          ${cartBtn}
        </div>
      </div>
    </article>`;
  }).join("");
}

function openProductModal(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  modalProduct = product;
  modalImgIndex = 0;
  renderModal();
  document.getElementById("product-modal").classList.add("show");
  document.body.style.overflow = "hidden";
}

function renderModal() {
  const product = modalProduct;
  if (!product) return;
  const total = product.images.length;
  const modalBody = document.getElementById("modal-body");

  modalBody.innerHTML = `
    <div class="modal-gallery">
      <div class="main-img-wrap">
        <button class="gallery-arrow prev" onclick="galleryNav(-1)" ${modalImgIndex === 0 ? "disabled" : ""} aria-label="Anterior">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <img id="main-modal-img" src="${product.images[modalImgIndex]}" alt="${product.name}" />
        <button class="gallery-arrow next" onclick="galleryNav(1)" ${modalImgIndex >= total - 1 ? "disabled" : ""} aria-label="Siguiente">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
        <span class="img-counter">${modalImgIndex + 1} / ${total}</span>
      </div>
      <div class="thumbnails" id="thumbnails">
        ${product.images.map((img, idx) => `
          <img src="${img}" class="${idx === modalImgIndex ? "active" : ""}" data-idx="${idx}" onclick="goToImage(${idx})" alt="" />
        `).join("")}
      </div>
    </div>
    <div class="modal-info">
      <h2>${product.name}</h2>
      <p class="modal-price">$${product.price.toLocaleString("es-AR")}</p>
      <p class="description">${product.description}</p>
      <label for="modal-size">Talle / Opción</label>
      <select id="modal-size">
        ${product.sizes.map(s => `<option value="${s}">${s}</option>`).join("")}
      </select>
      ${(() => {
        const isRestock = (product.availability || "stock") === "restock";
        const isAgotado = !isRestock && Number(product.stock_qty) <= 0;
        if (isAgotado) {
          return `<p class="agotado-msg">Sin stock en el local. Podés encargarlo para la próxima llegada.</p>
          <button class="btn-primary btn-full" onclick="addModalAsRestock(${product.id})">Encargar para restock</button>`;
        }
        if (isRestock) {
          return `<button class="btn-primary btn-full" onclick="addModalToCart(${product.id})">Encargar para restock</button>`;
        }
        return `<button class="btn-primary btn-full" onclick="addModalToCart(${product.id})">Agregar al carrito</button>`;
      })()}
    </div>
  `;

  const wrap = modalBody.querySelector(".main-img-wrap");
  let startX = 0;
  wrap.addEventListener("touchstart", e => { startX = e.touches[0].clientX; }, { passive: true });
  wrap.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) galleryNav(dx < 0 ? 1 : -1);
  }, { passive: true });
}

function galleryNav(dir) {
  if (!modalProduct) return;
  const next = modalImgIndex + dir;
  if (next < 0 || next >= modalProduct.images.length) return;
  modalImgIndex = next;
  const img = document.getElementById("main-modal-img");
  const counter = document.querySelector(".img-counter");
  const thumbs = document.querySelectorAll("#thumbnails img");
  const prevBtn = document.querySelector(".gallery-arrow.prev");
  const nextBtn = document.querySelector(".gallery-arrow.next");
  if (img) img.src = modalProduct.images[modalImgIndex];
  if (counter) counter.textContent = `${modalImgIndex + 1} / ${modalProduct.images.length}`;
  thumbs.forEach((t, i) => t.classList.toggle("active", i === modalImgIndex));
  if (prevBtn) prevBtn.disabled = modalImgIndex === 0;
  if (nextBtn) nextBtn.disabled = modalImgIndex >= modalProduct.images.length - 1;
  if (thumbs[modalImgIndex]) thumbs[modalImgIndex].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
}

function goToImage(idx) {
  modalImgIndex = idx;
  const img = document.getElementById("main-modal-img");
  const counter = document.querySelector(".img-counter");
  const thumbs = document.querySelectorAll("#thumbnails img");
  const prevBtn = document.querySelector(".gallery-arrow.prev");
  const nextBtn = document.querySelector(".gallery-arrow.next");
  if (img) img.src = modalProduct.images[modalImgIndex];
  if (counter) counter.textContent = `${modalImgIndex + 1} / ${modalProduct.images.length}`;
  thumbs.forEach((t, i) => t.classList.toggle("active", i === modalImgIndex));
  if (prevBtn) prevBtn.disabled = modalImgIndex === 0;
  if (nextBtn) nextBtn.disabled = modalImgIndex >= modalProduct.images.length - 1;
}

function closeModal() {
  document.getElementById("product-modal").classList.remove("show");
  document.body.style.overflow = "";
  modalProduct = null;
}

/* ---------- Carrito ---------- */
function toggleCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("cart-overlay");
  const isOpen = drawer.classList.toggle("open");
  overlay.classList.toggle("open", isOpen);
  document.body.style.overflow = isOpen ? "hidden" : "";
}

function addModalToCart(productId) {
  const product = products.find(p => p.id === productId);
  const size = document.getElementById("modal-size").value;
  addToCart(product, size);
  closeModal();
  showToast(product.availability === "restock" ? "Encargo agregado" : "Agregado al carrito");
}

function quickAddToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  if (isProductAgotado(product)) {
    quickAddAsRestock(productId);
    return;
  }
  const size = (product.sizes && product.sizes[0]) || "Único";
  addToCart(product, size);
  showToast(product.availability === "restock" ? "Encargo agregado" : "Agregado al carrito");
}


function isProductAgotado(product) {
  if (!product) return false;
  if ((product.availability || "stock") === "restock") return false;
  return Number(product.stock_qty) <= 0;
}

function quickAddAsRestock(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  const size = (product.sizes && product.sizes[0]) || "Único";
  addToCart({ ...product, availability: "restock" }, size);
  showToast("Encargo agregado (próximo restock)");
}

function addModalAsRestock(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  const sizeEl = document.getElementById("modal-size");
  const size = sizeEl ? sizeEl.value : ((product.sizes && product.sizes[0]) || "Único");
  addToCart({ ...product, availability: "restock" }, size);
  showToast("Encargo agregado (próximo restock)");
}

function addToCart(product, size) {
  if (!product) return;
  const sizeVal = size || (product.sizes && product.sizes[0]) || "Único";
  const availability = product.availability || "stock";
  const existing = cart.find(
    (item) => item.id === product.id && item.size === sizeVal && item.availability === availability
  );
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      images: product.images || [],
      size: sizeVal,
      quantity: 1,
      availability,
      supplier: product.supplier || "",
      supplier_code: product.supplier_code || "",
      drive_folder_url: product.drive_folder_url || "",
    });
  }
  updateCartUI();
}

function changeQty(index, delta) {
  if (!cart[index]) return;
  cart[index].quantity += delta;
  if (cart[index].quantity <= 0) cart.splice(index, 1);
  updateCartUI();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartUI();
}

function updateCartUI() {
  const badge = document.getElementById("cart-count");
  const itemsEl = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  const btnCheckout = document.getElementById("btn-checkout");

  const totalCount = cart.reduce((a, i) => a + i.quantity, 0);
  const totalPrice = cart.reduce((a, i) => a + i.price * i.quantity, 0);

  if (badge) {
    badge.textContent = totalCount || "";
    badge.dataset.empty = totalCount ? "0" : "1";
  }
  if (totalEl) totalEl.textContent = `$${totalPrice.toLocaleString("es-AR")}`;
  if (btnCheckout) btnCheckout.disabled = totalCount === 0;

  if (!itemsEl) return;
  if (!cart.length) {
    itemsEl.innerHTML = `<p class="empty-cart">El carrito está vacío.</p>`;
    return;
  }

  itemsEl.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <img src="${item.images[0]}" alt="${item.name}" />
      <div class="item-details">
        <h4>${item.name}</h4>
        <small>Talle: ${item.size}${item.availability === "restock" ? " · Restock" : ""}</small>
        <p class="item-price">$${(item.price * item.quantity).toLocaleString("es-AR")}</p>
        <div class="qty-row">
          <button class="qty-btn" onclick="changeQty(${index}, -1)" aria-label="Menos">−</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="qty-btn" onclick="changeQty(${index}, 1)" aria-label="Más">+</button>
        </div>
      </div>
      <button class="btn-remove" onclick="removeFromCart(${index})" aria-label="Quitar">✕</button>
    </div>
  `).join("");
}

function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg || "Agregado al carrito";
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 1800);
}

/* ---------- Checkout: Auth obligatorio + guardar pedido + WhatsApp ---------- */
async function checkoutWhatsApp() {
  if (!cart.length) return;

  if (!currentUser) {
    pendingCheckout = true;
    toggleCartDrawer();
    openAuthModal("register");
    showToast("Ingresá o creá tu cuenta para confirmar el pedido");
    return;
  }

  await processOrder();
}

async function processOrder() {
  if (!cart.length || !currentUser) return;

  const btn = document.getElementById("btn-checkout");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Enviando…";
  }

  const total = cart.reduce((a, i) => a + i.price * i.quantity, 0);
  const items = cart.map((i) => ({
    id: i.id,
    nombre: i.name,
    talle: String(i.size),
    cantidad: i.quantity,
    precio: i.price,
    availability: i.availability,
    supplier: i.supplier || "",
    supplier_code: i.supplier_code || "",
    drive_folder_url: i.drive_folder_url || "",
    imagen: (i.images && i.images[0]) || ""
  }));

  try {
    const { error } = await supabase.from("orders").insert({
      user_id: currentUser.id,
      items,
      total,
      estado: "nuevo"
    });

    if (error) {
      console.error(error);
      showToast("No se pudo guardar el pedido. Intentá de nuevo.");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Confirmar pedido";
      }
      return;
    }

    cart = [];
    updateCartUI();
    if (document.getElementById("cart-drawer")?.classList.contains("open")) {
      toggleCartDrawer();
    }
    showToast("¡Pedido enviado!");
    showOrderSuccess(total);
  } catch (err) {
    console.error(err);
    showToast("Error de red.");
  } finally {
    if (btn) {
      btn.disabled = cart.length === 0;
      btn.textContent = "Confirmar pedido";
    }
  }
}

/** Pantalla clara después del pedido + acceso al seguimiento */
function showOrderSuccess(total) {
  const overlay = document.getElementById("order-success");
  if (!overlay) {
    // Fallback: abrir Mis pedidos
    openAccountModal();
    switchAccountTab("pedidos");
    return;
  }
  const totalEl = document.getElementById("order-success-total");
  if (totalEl) totalEl.textContent = "$" + Number(total || 0).toLocaleString("es-AR");
  overlay.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeOrderSuccess() {
  const overlay = document.getElementById("order-success");
  if (overlay) overlay.classList.remove("show");
  document.body.style.overflow = "";
}

function goToMyOrders() {
  closeOrderSuccess();
  const badge = document.getElementById("orders-badge");
  if (badge) {
    badge.hidden = true;
    badge.textContent = "";
  }
  if (!currentUser) {
    openAuthModal("login");
    showToast("Ingresá para ver tus pedidos");
    return;
  }
  openAccountModal();
  switchAccountTab("pedidos");
}

