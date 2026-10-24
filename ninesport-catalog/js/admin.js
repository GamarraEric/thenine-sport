/* The Nine Sport — Panel de gestión */

let allOrders = [];
let allProducts = [];
let currentFilter = "activo";
let realtimeChannel = null;
let busyOrderIds = new Set(); // evita doble click

const MEDIOS_PAGO = "Efectivo, transferencia o lo que coordinemos";

const RETIRO = "Retiro en Quinquela Martín 1590, Villa Canto. Horarios: 9:30–12:30 y 18:00–21:30";

/* ----- Armador de nombre por categoría (chips opcionales) ----- */
const categoryLabels = {
  f11: "F11", f5: "F5", futsal: "Futsal", zapatillas: "Zapatillas",
  guantes: "Guantes", camisetas: "Camisetas", accesorios: "Accesorios"
};

/**
 * Modelos SOLO de su categoría.
 * Cascada: categoría → marca → modelo → color/detalle (opcional)
 */
const MODELS = {
  f11: {
    Nike: [
      "Mercurial Superfly", "Mercurial Superfly 9", "Mercurial Superfly 10",
      "Mercurial Vapor", "Mercurial Vapor 15", "Mercurial Vapor 16",
      "Mercurial Vapor Academy", "Zoom Mercurial", "Mercurial MDS",
      "Phantom GX", "Phantom GX 2", "Phantom Luna", "Phantom GT",
      "Tiempo Legend", "Tiempo Legend 10", "Premier 3"
    ],
    Adidas: [
      "Predator Elite", "Predator Accuracy", "Predator Edge", "Predator League", "Predator 24",
      "X Crazyfast", "X Speedportal", "X Crazyfast League", "F50",
      "Copa Pure", "Copa Pure 2", "Copa Mundial", "Copa Gloro", "Nemeziz"
    ],
    Puma: [
      "Future Ultimate", "Future Match", "Future Play",
      "Ultra Ultimate", "Ultra Match", "Ultra Play",
      "King Ultimate", "King Match", "King Top"
    ],
    "New Balance": ["Furon", "Furon v7", "Tekela", "442", "442 v2"],
    Umbro: ["Speciali", "Classico", "Tocco", "Velocita", "Medusae"],
    Penalty: ["Brasil", "Garra", "Max 500", "Storm", "Delta", "Victoria"],
    Topper: ["San Ciro", "Kaiser", "Sting", "Dribbling", "Letna"],
    Kelme: ["Precision", "Lince", "Imperator"],
    Diadora: ["Brasil", "Maximus", "Cattura", "Pichichi"],
    Olympikus: ["Arena", "Tropico"],
    Joma: ["Aguila", "Numero Uno", "Propulsion"]
  },
  f5: {
    Nike: [
      "Mercurial Vapor TF", "Mercurial Superfly TF", "Phantom GX TF",
      "Tiempo Legend TF", "Premier TF", "Streetgato"
    ],
    Adidas: [
      "Predator TF", "X Crazyfast TF", "Copa Pure TF", "Nemeziz TF", "Goletto"
    ],
    Puma: ["Future TF", "Ultra TF", "King TF", "Rapido TF"],
    Umbro: ["Speciali TF", "Classico TF", "Tocco TF"],
    Penalty: ["Brasil TF", "Garra TF", "Storm TF", "Delta TF"],
    Topper: ["San Ciro TF", "Kaiser TF", "Sting TF", "Letna TF"],
    Kelme: ["Precision TF", "Lince TF"],
    Dray: ["Society", "F5", "Indoor"],
    Joma: ["Aguila TF", "Dribling TF", "Top Flex"]
  },
  futsal: {
    Nike: ["React Gato", "Lunar Gato", "Streetgato", "Tiempo X Proximo", "MercurialX"],
    Adidas: ["Top Sala", "Copa Nacional", "Predator Sala", "X Sala"],
    Puma: ["Truco", "Pressing", "King Sala"],
    Umbro: ["Sala Pro", "Classico IC"],
    Penalty: ["Max 500 Futsal", "Storm Futsal", "Delta Futsal"],
    Topper: ["Letna Futsal", "Kaiser Futsal"],
    Kelme: ["Indoor Copa", "Precision Sala"],
    Joma: ["Top Flex", "Mundial", "Numéro Uno", "Dribling"],
    Dray: ["Indoor", "Futsal"]
  },
  guantes: {
    Adidas: [
      "Predator Pro", "Predator League", "Predator Training",
      "Copa Pro", "Copa League", "Tiro Club", "X Pro", "X League"
    ],
    Nike: [
      "Goalkeeper Vapor Grip", "Match", "Match Junior", "Grip3", "Phantom Elite"
    ],
    Rinat: [
      "Uno", "Egotiko", "Kronos", "Fenix", "Asimetrik", "Aries", "Kancerbero", "Meta"
    ],
    Reusch: [
      "Attrakt", "Attrakt Gold", "Pure Contact", "Fastgrip", "Legacy", "Arrow"
    ],
    Uhlsport: [
      "Absolutgrip", "Soft HN", "Prediction", "Ergonomic", "Hyperblack"
    ],
    Penalty: ["Delta", "Storm", "Max", "Training"],
    "Ho Soccer": ["SSG", "One Negative", "Pro", "Clone"],
    Archivo: ["Pro", "Training", "Niño"],
    Umbro: ["Neo", "Club", "Training"]
  },
  zapatillas: {
    Nike: ["Revolution", "Pegasus", "Downshifter", "Air Max", "Court Vision", "Dunk", "Air Force 1", "Run Swift"],
    Adidas: ["Ultraboost", "Response", "Galaxy", "Grand Court", "Forum", "Samba", "Gazelle", "Duramo"],
    Puma: ["Softride", "Transport", "Smash", "RS-X", "Velocity"],
    "New Balance": ["Fresh Foam", "410", "574", "327", "680"],
    "Under Armour": ["Charged", "HOVR", "Surge"],
    Topper: ["Rod", "Fast", "Street", "Nerv"],
    Olympikus: ["Cyber", "Index", "Challenger", "Trace"],
    Fila: ["Float", "Recovery", "Euro Jogger"]
  },
  camisetas: {
    Adidas: ["Local", "Visitante", "Alternativa", "Entrenamiento", "Retrô"],
    Nike: ["Local", "Visitante", "Alternativa", "Entrenamiento", "Retrô"],
    Puma: ["Local", "Visitante", "Entrenamiento"],
    Umbro: ["Local", "Visitante", "Entrenamiento"],
    Kelme: ["Local", "Visitante"],
    "Genérica": ["Club", "Selección", "Entrenamiento"]
  },
  accesorios: {
    "Tipo producto": [
      "Canilleras", "Medias", "Medias precortadas", "Pantorrilleras",
      "Cintas", "Tobilleras", "Muñequeras", "Bolso", "Botinera", "Pelota"
    ],
    Nike: ["Pro", "Academy", "Match"],
    Adidas: ["Tiro", "AeroReady", "Premium"],
    Penalty: ["Classic", "Training"],
    Topper: ["Training"],
    "Genérica": ["Básica", "Pack"]
  }
};

const COLORS = [
  "Negro", "Blanco", "Rojo", "Azul", "Verde", "Amarillo", "Naranja",
  "Gris", "Dorado", "Plateado", "Rosa", "Violeta", "Celeste", "Fucsia",
  "Volt", "Multicolor", "Fluor"
];
const SURFACES = ["FG", "MG", "AG", "TF", "IC", "Sala", "Society"];

function brandsForCategory(cat) {
  const block = MODELS[cat];
  if (!block) return [];
  return Object.keys(block);
}

function modelsForBrand(cat, brand) {
  if (!brand) return [];
  const block = MODELS[cat];
  if (!block) return [];
  return block[brand] || [];
}

const SIZE_PRESETS = {
  f11: ["35","36","37","38","39","40","41","42","43","44","45","46"],
  f5: ["35","36","37","38","39","40","41","42","43","44","45"],
  futsal: ["35","36","37","38","39","40","41","42","43","44","45"],
  zapatillas: ["35","36","37","38","39","40","41","42","43","44","45","46"],
  guantes: ["5","6","7","8","9","10","11","Único"],
  camisetas: ["XS","S","M","L","XL","XXL","Único"],
  accesorios: ["Único","S","M","L","XS","XL","Par"]
};

const nameBuilderState = { marca: "", modelo: "", extras: [] };

function resetNameBuilderState() {
  nameBuilderState.marca = "";
  nameBuilderState.modelo = "";
  nameBuilderState.extras = [];
}

function buildNameFromChips() {
  const parts = [];
  if (nameBuilderState.marca) parts.push(nameBuilderState.marca);
  if (nameBuilderState.modelo) parts.push(nameBuilderState.modelo);
  (nameBuilderState.extras || []).forEach(e => parts.push(e));
  return parts.join(" ").trim();
}

function syncNameInputFromChips() {
  const input = document.getElementById("pf-name");
  if (!input) return;
  const built = buildNameFromChips();
  if (built) input.value = built;
}

function escapeChip(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderNameBuilder() {
  const wrap = document.getElementById("pf-name-builder");
  const hint = document.getElementById("pf-name-hint");
  const cat = document.getElementById("pf-category")?.value || "f11";
  if (!wrap) return;

  const brands = brandsForCategory(cat);
  const marca = nameBuilderState.marca;
  const models = modelsForBrand(cat, marca);
  const isBoot = ["f11", "f5", "futsal"].includes(cat);

  if (hint) {
    hint.textContent = !marca
      ? "Seleccioná marca, luego modelo y, si querés, color o detalle."
      : (!nameBuilderState.modelo
        ? "Seleccioná el modelo. El color o detalle es opcional."
        : "Podés agregar color o detalle, o modificar el nombre manualmente.");
  }

  let html = "";

  html += `<div class="nb-group"><span class="nb-label">1 · Marca</span><div class="nb-chips">`;
  html += brands.map(b => {
    const on = marca === b;
    return `<button type="button" class="nb-chip${on ? " active" : ""}" data-nb-step="marca" data-nb-val="${escapeChip(b)}">${escapeChip(b)}</button>`;
  }).join("");
  html += `</div></div>`;

  if (marca) {
    html += `<div class="nb-group"><span class="nb-label">2 · Modelo (${escapeChip(marca)})</span><div class="nb-chips">`;
    if (!models.length) {
      html += `<span class="nb-empty">No hay modelos cargados para esta marca. Completá el nombre manualmente.</span>`;
    } else {
      html += models.map(m => {
        const on = nameBuilderState.modelo === m;
        return `<button type="button" class="nb-chip${on ? " active" : ""}" data-nb-step="modelo" data-nb-val="${escapeChip(m)}">${escapeChip(m)}</button>`;
      }).join("");
    }
    html += `</div></div>`;

    html += `<div class="nb-group"><span class="nb-label">3 · Color / detalle (opcional)</span><div class="nb-chips">`;
    const extras = isBoot ? [...SURFACES, ...COLORS] : (cat === "guantes" ? ["Negro", "Blanco", "Fluor", "Rojo", "Azul", "Fingersave", "Niño", "Adulto"] : COLORS);
    html += extras.map(c => {
      const on = nameBuilderState.extras.includes(c);
      return `<button type="button" class="nb-chip${on ? " active" : ""}" data-nb-step="extra" data-nb-val="${escapeChip(c)}">${escapeChip(c)}</button>`;
    }).join("");
    html += `</div></div>`;
  }

  html += `<div class="nb-actions"><button type="button" class="nb-clear" id="pf-name-clear">Quitar selección</button></div>`;
  wrap.innerHTML = html;
}

function renderSizeBuilder() {
  const wrap = document.getElementById("pf-size-builder");
  if (!wrap) return;
  const cat = document.getElementById("pf-category")?.value || "f11";
  const sizes = SIZE_PRESETS[cat] || SIZE_PRESETS.f11;
  const current = (document.getElementById("pf-sizes")?.value || "")
    .split(/[,;\s]+/)
    .map(s => s.trim())
    .filter(Boolean);

  wrap.innerHTML = `<div class="nb-group"><span class="nb-label">Talles rápidos</span><div class="nb-chips">` +
    sizes.map(s => {
      const on = current.includes(s);
      return `<button type="button" class="nb-chip${on ? " active" : ""}" data-size-chip="${escapeChip(s)}">${escapeChip(s)}</button>`;
    }).join("") + `</div></div>`;
}

function toggleNameChip(step, val) {
  if (step === "marca") {
    if (nameBuilderState.marca === val) {
      nameBuilderState.marca = "";
      nameBuilderState.modelo = "";
      nameBuilderState.extras = [];
    } else {
      nameBuilderState.marca = val;
      nameBuilderState.modelo = "";
      nameBuilderState.extras = [];
    }
  } else if (step === "modelo") {
    nameBuilderState.modelo = nameBuilderState.modelo === val ? "" : val;
  } else if (step === "extra") {
    const i = nameBuilderState.extras.indexOf(val);
    if (i >= 0) nameBuilderState.extras.splice(i, 1);
    else nameBuilderState.extras.push(val);
  }
  syncNameInputFromChips();
  renderNameBuilder();
}

function toggleSizeChip(size) {
  const input = document.getElementById("pf-sizes");
  if (!input) return;
  let list = input.value.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
  if (list.includes(size)) list = list.filter(s => s !== size);
  else list.push(size);
  list.sort((a, b) => {
    const na = parseInt(a, 10), nb = parseInt(b, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return String(a).localeCompare(String(b));
  });
  input.value = list.join(", ");
  renderSizeBuilder();
}

function onCategoryChange() {
  const editing = !!(document.getElementById("pf-id")?.value);
  const nameInput = document.getElementById("pf-name");
  const prevName = nameInput ? nameInput.value.trim() : "";

  resetNameBuilderState();
  renderNameBuilder();
  renderSizeBuilder();

  // Solo vaciar nombre en producto NUEVO sin texto
  if (!editing && nameInput && !prevName) {
    nameInput.placeholder = "Ej: Nike Mercurial Superfly Negro";
  }
}


document.addEventListener("DOMContentLoaded", async () => {
  bindAdminUi();

  if (!supabase) {
    const err = document.getElementById("admin-login-error");
    if (err) err.textContent = "Error de conexión Supabase.";
    return;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) showDashboard(session.user);
  else showLogin();

  supabase.auth.onAuthStateChange((_e, session) => {
    if (session?.user) showDashboard(session.user);
    else showLogin();
  });
});

/** Listeners sin depender solo de onclick (más confiable en celular) */
function bindAdminUi() {
  const loginForm = document.getElementById("admin-login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      adminLogin(e);
    });
  }

  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) btnLogout.addEventListener("click", () => adminLogout());

  document.querySelectorAll(".admin-nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchAdminTab(btn.dataset.tab, btn));
  });

  document.querySelectorAll("#order-filters .filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => filterOrders(btn.dataset.estado, btn));
  });

  const btnAdd = document.getElementById("btn-add-product");
  if (btnAdd) {
    btnAdd.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openProductForm();
    });
  }

  document.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", () => closeProductForm());
  });

  const productForm = document.getElementById("product-form");
  if (productForm) {
    productForm.addEventListener("submit", (e) => saveProduct(e));
  }

  const catSel = document.getElementById("pf-category");
  if (catSel) catSel.addEventListener("change", () => onCategoryChange());

  document.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-nb-step]");
    if (chip) {
      e.preventDefault();
      toggleNameChip(chip.dataset.nbStep, chip.dataset.nbVal);
      return;
    }
    const sc = e.target.closest("[data-size-chip]");
    if (sc) {
      e.preventDefault();
      toggleSizeChip(sc.getAttribute("data-size-chip"));
      return;
    }
    if (e.target.id === "pf-name-clear" || e.target.closest("#pf-name-clear")) {
      e.preventDefault();
      resetNameBuilderState();
      const ni = document.getElementById("pf-name");
      if (ni) ni.value = "";
      renderNameBuilder();
    }
  });

  const sizesInput = document.getElementById("pf-sizes");
  if (sizesInput) sizesInput.addEventListener("input", () => renderSizeBuilder());


  // Delegación: stock + cerrar modales
  document.addEventListener("click", (e) => {
    const openBtn = e.target.closest("[data-open-product]");
    if (openBtn) {
      e.preventDefault();
      const id = openBtn.getAttribute("data-open-product");
      openProductForm(id ? Number(id) : undefined);
      return;
    }
    if (e.target.closest("[data-close-order-detail]")) {
      e.preventDefault();
      closeOrderDetail();
    }
  });
}

function showLogin() {
  document.getElementById("admin-login").style.display = "flex";
  document.getElementById("admin-dashboard").style.display = "none";
  document.getElementById("btn-logout").style.display = "none";
  document.getElementById("admin-user").textContent = "";
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}

function showDashboard(user) {
  document.getElementById("admin-login").style.display = "none";
  document.getElementById("admin-dashboard").style.display = "block";
  document.getElementById("btn-logout").style.display = "inline-flex";
  document.getElementById("admin-user").textContent = user.email || "";
  loadOrders();
  loadStock();
  loadClients();
  subscribeRealtime();
}

async function adminLogin(e) {
  e.preventDefault();
  const errEl = document.getElementById("admin-login-error");
  errEl.textContent = "";
  const email = document.getElementById("admin-email").value.trim();
  const password = document.getElementById("admin-password").value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) errEl.textContent = error.message;
}

async function adminLogout() {
  await supabase.auth.signOut();
}

function switchAdminTab(tab, btn) {
  document.querySelectorAll(".admin-nav-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
  if (btn) btn.classList.add("active");
  const section = document.getElementById(`tab-${tab}`);
  if (section) section.classList.add("active");
  if (tab === "stock") loadStock();
  if (tab === "clientes") loadClients();
  if (tab === "pedidos") loadOrders();
}

function subscribeRealtime() {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  realtimeChannel = supabase
    .channel("admin-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
      loadOrders();
      loadClients();
      loadStock();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => loadStock())
    .subscribe();
}

/* ---------- PEDIDOS ---------- */
async function loadOrders() {
  const list = document.getElementById("orders-list");
  if (!list) return;
  list.innerHTML = `<p class="empty-grid">Cargando...</p>`;

  const { data, error } = await supabase
    .from("orders")
    .select(`id, items, total, estado, notas, created_at, user_id, profiles ( nombre, apellido, telefono, email )`)
    .order("created_at", { ascending: false });

  if (error) {
    list.innerHTML = `<p class="empty-grid">No se pudieron cargar los pedidos. Actualizá la página.</p>`;
    return;
  }
  allOrders = data || [];
  updateStats();
  renderOrders();
}

function updateStats() {
  const count = (s) => allOrders.filter(o => o.estado === s).length;
  const set = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = n; };
  set("stat-nuevo", count("nuevo"));
  set("stat-confirmado", count("confirmado"));
  set("stat-preparado", count("preparado"));
  set("stat-entregado", count("entregado"));
}

function filterOrders(estado, btn) {
  currentFilter = estado;
  document.querySelectorAll("#order-filters .filter-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderOrders();
}

function labelEstado(e) {
  return {
    nuevo: "Nuevo",
    confirmado: "Tomado",
    preparado: "Preparado",
    entregado: "Entregado",
    cancelado: "Cancelado"
  }[e] || e;
}

function orderImg(i) {
  return i.imagen || (Array.isArray(i.images) && i.images[0]) || "assets/logo.png";
}

function filterOrderList(orders) {
  if (currentFilter === "all") return orders;
  if (currentFilter === "activo") {
    return orders.filter(o => ["nuevo", "confirmado", "preparado"].includes(o.estado));
  }
  if (currentFilter === "cerrado") {
    return orders.filter(o => o.estado === "entregado" || o.estado === "cancelado");
  }
  return orders.filter(o => o.estado === currentFilter);
}

function renderOrders() {
  const list = document.getElementById("orders-list");
  if (!list) return;

  let orders = filterOrderList(allOrders);

  if (!orders.length) {
    const hint = currentFilter === "activo"
      ? "No hay pedidos pendientes. Cuando un cliente confirme, va a aparecer acá."
      : `No hay pedidos${currentFilter !== "all" ? " en este filtro" : ""}.`;
    list.innerHTML = `<p class="empty-grid">${hint}</p>`;
    return;
  }

  // Separar: primero activos, después historial si estamos en "all"
  if (currentFilter === "all") {
    const activos = orders.filter(o => ["nuevo", "confirmado", "preparado"].includes(o.estado));
    const cerrados = orders.filter(o => o.estado === "entregado" || o.estado === "cancelado");
    let html = "";
    if (activos.length) {
      html += `<h3 class="orders-section-title">En curso (${activos.length})</h3>`;
      html += activos.map(o => renderOrderCard(o)).join("");
    }
    if (cerrados.length) {
      html += `<h3 class="orders-section-title orders-section-old">Historial (${cerrados.length})</h3>`;
      html += cerrados.map(o => renderOrderCard(o)).join("");
    }
    list.innerHTML = html;
    return;
  }

  list.innerHTML = orders.map(o => renderOrderCard(o)).join("");
}

function renderOrderCard(o) {
  const p = o.profiles || {};
  const nombre = [p.nombre, p.apellido].filter(Boolean).join(" ") || "Sin nombre";
  const fecha = new Date(o.created_at).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit"
  });
  const items = o.items || [];
  const thumbs = items.slice(0, 4).map(i => {
    const src = escapeHtml(orderImg(i));
    return `<img class="order-card-thumb" src="${src}" alt="" loading="lazy" onerror="this.src='assets/logo.png'" />`;
  }).join("");
  const extra = items.length > 4 ? `<span class="order-card-more">+${items.length - 4}</span>` : "";
  const locked = o.estado !== "nuevo";
  const busy = busyOrderIds.has(o.id);

  let actions = "";
  if (o.estado === "nuevo") {
    actions = `
      <button type="button" class="btn-primary" ${busy ? "disabled" : ""} onclick="tomarPedido('${o.id}')">${busy ? "Tomando..." : "Tomar pedido"}</button>
      <button type="button" class="btn-secondary" onclick="openOrderDetail('${o.id}')">Ver detalle</button>
      <button type="button" class="btn-ghost" ${busy ? "disabled" : ""} onclick="setEstado('${o.id}', 'cancelado')">Cancelar</button>
    `;
  } else if (o.estado === "confirmado") {
    actions = `
      <button type="button" class="btn-primary" onclick="openOrderDetail('${o.id}')">Ver detalle</button>
      <button type="button" class="btn-secondary" onclick="setEstado('${o.id}', 'preparado')">Marcar preparado</button>
    `;
  } else if (o.estado === "preparado") {
    actions = `
      <button type="button" class="btn-primary" onclick="openOrderDetail('${o.id}')">Ver detalle</button>
      <button type="button" class="btn-secondary" onclick="setEstado('${o.id}', 'entregado')">Entregado</button>
    `;
  } else {
    actions = `
      <button type="button" class="btn-secondary" onclick="openOrderDetail('${o.id}')">Ver detalle</button>
    `;
  }

  return `
    <article class="order-card estado-${o.estado} ${locked ? "is-locked" : ""}">
      <div class="order-top">
        <div>
          <h3>${escapeHtml(nombre)}</h3>
          <small>${fecha}</small>
        </div>
        <span class="estado-badge estado-${o.estado}">${labelEstado(o.estado)}</span>
      </div>
      <div class="order-thumbs-row">${thumbs}${extra}</div>
      <p class="order-summary-line">${items.length} producto${items.length === 1 ? "" : "s"} · Total <strong>${Number(o.total || 0) > 0 ? "$" + Number(o.total || 0).toLocaleString("es-AR") : "A coordinar"}</strong></p>
      <div class="order-contact">
        ${p.telefono ? `<a href="tel:${escapeHtml(p.telefono)}">📞 ${escapeHtml(p.telefono)}</a>` : ""}
        ${p.email ? `<a href="mailto:${escapeHtml(p.email)}">✉️ ${escapeHtml(p.email)}</a>` : ""}
      </div>
      <div class="order-actions">${actions}</div>
    </article>
  `;
}

function openOrderDetail(orderId) {
  const o = allOrders.find(x => x.id === orderId);
  if (!o) return;
  const p = o.profiles || {};
  const nombre = [p.nombre, p.apellido].filter(Boolean).join(" ") || "Sin nombre";
  const fecha = new Date(o.created_at).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
  const modal = document.getElementById("order-detail-modal");
  const body = document.getElementById("od-body");
  const actions = document.getElementById("od-actions");
  const title = document.getElementById("od-title");
  if (title) title.textContent = nombre;

  const folderMap = new Map();
  (o.items || []).forEach(i => {
    const url = (i.drive_folder_url || "").trim();
    if (!url) return;
    if (!folderMap.has(url)) folderMap.set(url, { url, supplier: i.supplier || "", names: [] });
    folderMap.get(url).names.push(i.nombre || i.name || "");
  });

  const itemsHtml = (o.items || []).map(i => {
    const src = escapeHtml(orderImg(i));
    return `
      <div class="od-item">
        <img src="${src}" alt="" loading="lazy" onerror="this.src='assets/logo.png'" />
        <div>
          <strong>${escapeHtml(i.nombre || i.name || "Producto")}</strong>
          <p>Talle ${escapeHtml(String(i.talle || i.size || "—"))} · ×${i.cantidad || i.quantity || 1}
            ${i.availability === "restock" ? " · <em>Para encargar</em>" : ""}
            ${i.supplier ? ` · Prov. ${escapeHtml(i.supplier)}` : ""}
          </p>
          <p class="od-price">$${Number((i.precio || i.price || 0) * (i.cantidad || i.quantity || 1)).toLocaleString("es-AR")}</p>
        </div>
      </div>`;
  }).join("");

  const foldersHtml = folderMap.size
    ? `<div class="order-folders"><p class="order-folders-title">📁 Carpetas proveedor</p><ul>` +
      [...folderMap.values()].map(f =>
        `<li><a href="${escapeHtml(f.url)}" target="_blank" rel="noopener">Abrir carpeta${f.supplier ? " · Prov. " + escapeHtml(f.supplier) : ""}</a>
        <small> · ${escapeHtml([...new Set(f.names)].join(", "))}</small></li>`
      ).join("") + `</ul></div>`
    : "";

  const precioLinea = (i) => {
    const n = Number((i.precio || i.price || 0) * (i.cantidad || i.quantity || 1));
    return n > 0 ? `$${n.toLocaleString("es-AR")}` : "Consultar";
  };

  body.innerHTML = `
    <div class="od-header-block">
      <div class="od-status-row">
        <span class="estado-badge estado-${o.estado}">${labelEstado(o.estado)}</span>
        <time>${fecha}</time>
      </div>
      <div class="od-contact-block">
        ${p.telefono ? `<a class="od-chip" href="https://wa.me/549${String(p.telefono).replace(/\\D/g, "").replace(/^549/, "").replace(/^54/, "")}" target="_blank" rel="noopener">${escapeHtml(p.telefono)}</a>` : ""}
        ${p.telefono ? `<a class="od-chip" href="tel:${escapeHtml(p.telefono)}">Llamar</a>` : ""}
        ${p.email ? `<a class="od-chip" href="mailto:${escapeHtml(p.email)}">Email</a>` : ""}
      </div>
    </div>
    <h3 class="od-section-label">Productos (${(o.items || []).length})</h3>
    <div class="od-items">${(o.items || []).map(i => {
      const src = escapeHtml(orderImg(i));
      return `
      <div class="od-item">
        <img src="${src}" alt="" loading="lazy" onerror="this.src='assets/logo.png'" />
        <div class="od-item-text">
          <strong>${escapeHtml(i.nombre || i.name || "Producto")}</strong>
          <p class="od-item-meta">Talle <b>${escapeHtml(String(i.talle || i.size || "—"))}</b> · ×${i.cantidad || i.quantity || 1}</p>
          <p class="od-item-tags">
            ${i.availability === "restock" ? '<span class="tag-restock">Para encargar</span>' : '<span class="tag-stock">En local</span>'}
            ${i.supplier ? `<span class="tag-prov">Prov. ${escapeHtml(i.supplier)}</span>` : ""}
          </p>
          <p class="od-price">${precioLinea(i)}</p>
        </div>
      </div>`;
    }).join("")}</div>
    ${foldersHtml}
    <div class="od-total-bar">
      <span>Total del pedido</span>
      <strong>${Number(o.total || 0) > 0 ? "$" + Number(o.total || 0).toLocaleString("es-AR") : "A coordinar"}</strong>
    </div>
  `;

  let act = "";
  if (o.estado === "nuevo") {
    act = `
      <button type="button" class="btn-primary btn-full" onclick="tomarPedido('${o.id}'); closeOrderDetail();">Tomar pedido pedido</button>
      <div class="od-btn-row">
        <button type="button" class="btn-secondary" onclick="setEstado('${o.id}', 'cancelado'); closeOrderDetail();">Cancelar</button>
        <button type="button" class="btn-ghost" onclick="closeOrderDetail()">Cerrar</button>
      </div>`;
  } else if (o.estado === "confirmado") {
    act = `
      <button type="button" class="btn-primary btn-full" onclick="confirmarYAvisar('${o.id}')"><svg class="wa-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> Confirmar y enviar por WhatsApp</button>
      <p class="od-wa-hint">Se abre WhatsApp con el mensaje listo. Revisá foto, talle y proveedor arriba antes de enviar.</p>
      <div class="od-btn-row">
        <button type="button" class="btn-secondary" onclick="setEstado('${o.id}', 'preparado'); closeOrderDetail();">Marcar preparado</button>
        <button type="button" class="btn-ghost" onclick="closeOrderDetail()">Cerrar</button>
      </div>`;
  } else if (o.estado === "preparado") {
    act = `
      <button type="button" class="btn-primary btn-full" onclick="setEstado('${o.id}', 'entregado'); closeOrderDetail();">Marcar entregado</button>
      <div class="od-btn-row">
        <button type="button" class="btn-secondary" onclick="abrirWhatsAppCliente('${o.id}')"><svg class="wa-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> WhatsApp</button>
        <button type="button" class="btn-ghost" onclick="closeOrderDetail()">Cerrar</button>
      </div>`;
  } else {
    act = `
      <div class="od-btn-row">
        <button type="button" class="btn-secondary" onclick="abrirWhatsAppCliente('${o.id}')"><svg class="wa-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> WhatsApp</button>
        <button type="button" class="btn-ghost" onclick="closeOrderDetail()">Cerrar</button>
      </div>`;
  }
  act += `<button type="button" class="btn-delete-order" onclick="eliminarPedido('${o.id}')">Eliminar pedido</button>`;
  actions.innerHTML = act;


  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeOrderDetail() {
  const modal = document.getElementById("order-detail-modal");
  if (modal) modal.hidden = true;
  document.body.style.overflow = "";
}

async function eliminarPedido(orderId) {
  if (!confirm("¿Eliminar este pedido? No se puede deshacer.")) return;
  const { error } = await supabase.from("orders").delete().eq("id", orderId);
  if (error) {
    alert("No se pudo eliminar el pedido. Si el problema continúa, contactá al soporte técnico.\n\n" + error.message);
    return;
  }
  allOrders = allOrders.filter(o => o.id !== orderId);
  closeOrderDetail();
  updateStats();
  renderOrders();
}

async function tomarPedido(orderId) {
  if (busyOrderIds.has(orderId)) return;
  const order = allOrders.find(o => o.id === orderId);
  if (!order || order.estado !== "nuevo") {
    alert("Este pedido ya fue tomado o no está disponible.");
    loadOrders();
    return;
  }

  busyOrderIds.add(orderId);
  renderOrders();

  // Update condicional: solo si sigue en 'nuevo' (bloqueo optimista)
  const { data, error } = await supabase
    .from("orders")
    .update({ estado: "confirmado" })
    .eq("id", orderId)
    .eq("estado", "nuevo")
    .select();

  busyOrderIds.delete(orderId);

  if (error) {
    alert("No se pudo tomar: " + error.message);
    loadOrders();
    return;
  }
  if (!data || !data.length) {
    alert("Otro operador ya tomó este pedido.");
    loadOrders();
    return;
  }

  // Actualizar local
  order.estado = "confirmado";
  updateStats();
  renderOrders();
}

async function setEstado(orderId, estado) {
  if (busyOrderIds.has(orderId)) return;
  busyOrderIds.add(orderId);

  const { error } = await supabase.from("orders").update({ estado }).eq("id", orderId);
  busyOrderIds.delete(orderId);

  if (error) {
    alert("No se pudo actualizar: " + error.message);
    return;
  }
  const order = allOrders.find(o => o.id === orderId);
  if (order) order.estado = estado;
  updateStats();
  renderOrders();
}

async function confirmarYAvisar(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;
  // Si aún está solo "tomado", puede pasar a preparado después del aviso
  abrirWhatsAppCliente(orderId, true);
}

function abrirWhatsAppCliente(orderId, esConfirmacion) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;
  const p = order.profiles || {};
  if (!p.telefono) {
    alert("Este cliente no tiene teléfono cargado.");
    return;
  }

  const nombre = p.nombre || "cliente";
  const items = (order.items || []).map(i =>
    `• ${i.nombre} (talle ${i.talle}) ×${i.cantidad}`
  ).join("\n");
  const total = Number(order.total || 0).toLocaleString("es-AR");

  let msg;
  if (esConfirmacion) {
    msg =
      `Hola ${nombre},\n\n` +
      `Somos *The Nine Sport*. Confirmamos tu pedido:\n\n` +
      `${items}\n\n` +
      `*Total: $${total}*\n\n` +
      `*Envíos a todo el país*\n` +
      `*Retiro en local:* Quinquela Martín 1590, Villa Canto\n` +
      `*Horarios:* 9:30 a 12:30 y 18:00 a 21:30\n\n` +
      `*Medios de pago:* efectivo, transferencia o lo que coordinemos.\n\n` +
      `Respondé este mensaje para coordinar el pago y si preferís envío o retiro.\n` +
      `¡Gracias!`;
  } else {
    msg =
      `Hola ${nombre},\n\n` +
      `Te escribimos de *The Nine Sport* por tu pedido:\n\n` +
      `${items}\n\n` +
      `Total: $${total}\n\n` +
      `Hacemos *envíos a todo el país* y también retiro en el local (Quinquela Martín 1590).\n` +
      `¿Cómo preferís coordinarlo?`;
  }

  let tel = String(p.telefono).replace(/\D/g, "");
  if (tel.startsWith("0")) tel = tel.slice(1);
  if (!tel.startsWith("54")) tel = "54" + tel;

  window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, "_blank");
}

/* ---------- STOCK + PRODUCTOS ---------- */
let pendingPhotoFile = null;
let pendingPhotoUrl = null; // URL ya guardada al editar

async function loadStock() {
  const list = document.getElementById("stock-list");
  if (!list) return;
  list.innerHTML = `<p class="empty-grid">Cargando stock...</p>`;

  const { data, error } = await supabase.from("products").select("*").order("name");

  if (error) {
    list.innerHTML = `<p class="empty-grid">Error: ${error.message}<br><small>Corré sql/setup-completo.sql</small></p>`;
    return;
  }

  // Evitar duplicados visuales si la query o el realtime repiten filas
  const seen = new Set();
  allProducts = (data || []).filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  if (!allProducts.length) {
    list.innerHTML = `
      <div class="empty-products">
        <p>Todavía no hay productos.</p>
        <button type="button" class="btn-primary" data-open-product="">+ Cargar el primero</button>
      </div>`;
    return;
  }

  list.innerHTML = allProducts.map(p => {
    const img = (Array.isArray(p.images) && p.images[0]) || "";
    const low = p.availability === "stock" && Number(p.stock_qty) <= 2;
    const agotado = p.availability === "stock" && Number(p.stock_qty) <= 0;
    const hidden = p.active === false;
    const where = p.availability === "restock" ? "Para encargar" : "En local";
    const prov = (p.supplier && String(p.supplier).trim()) || "—";
    return `
      <article class="stock-card ${low ? "stock-low" : ""} ${agotado ? "stock-out" : ""} ${hidden ? "stock-hidden" : ""}">
        <img src="${img || "assets/logo.png"}" alt="" class="stock-img" loading="lazy" onerror="this.src='assets/logo.png'" />
        <div class="stock-info">
          <h3>${escapeHtml(p.name)}</h3>
          <small>${escapeHtml(p.category)} · ${where}${hidden ? " · Oculto" : ""}</small>
          <p class="stock-supplier">Proveedor: <strong>${escapeHtml(prov)}</strong>${p.supplier_code ? " · Cód: " + escapeHtml(p.supplier_code) : ""}</p>
          ${p.drive_folder_url ? `<p class="stock-drive"><a href="${escapeHtml(p.drive_folder_url)}" target="_blank" rel="noopener">📁 Carpeta Drive</a></p>` : ""}
          <p class="stock-price">${Number(p.price) > 0 ? "$" + Number(p.price).toLocaleString("es-AR") : "Consultar"}</p>
          ${agotado ? `<span class="stock-badge-out">Agotado</span>` : ""}
        </div>
        <div class="stock-qty-box">
          <label>Cantidad en local</label>
          <div class="stock-qty-row">
            <button type="button" class="qty-btn" onclick="adjustStock(${p.id}, -1)">−</button>
            <input type="number" id="stock-input-${p.id}" value="${p.stock_qty}" min="0" />
            <button type="button" class="qty-btn" onclick="adjustStock(${p.id}, 1)">+</button>
          </div>
          <div class="stock-actions">
            <button type="button" class="btn-secondary btn-sm" onclick="saveStock(${p.id})">Guardar qty</button>
            <button type="button" class="btn-secondary btn-sm" data-open-product="${p.id}">Editar</button>
            <button type="button" class="btn-danger-sm" onclick="deleteProduct(${p.id}, '${escapeHtml(p.name).replace(/'/g, "\\'")}')">Borrar</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function adjustStock(id, delta) {
  const input = document.getElementById(`stock-input-${id}`);
  if (!input) return;
  input.value = Math.max(0, (parseInt(input.value, 10) || 0) + delta);
}

async function saveStock(id) {
  const input = document.getElementById(`stock-input-${id}`);
  if (!input) return;
  const qty = Math.max(0, parseInt(input.value, 10) || 0);
  const { error } = await supabase.from("products").update({ stock_qty: qty }).eq("id", id);
  if (error) alert("Error al guardar: " + error.message);
  else {
    const p = allProducts.find(x => x.id === id);
    if (p) p.stock_qty = qty;
    loadStock();
  }
}

function openProductForm(editId) {
  const modal = document.getElementById("product-modal");
  if (!modal) {
    console.error("No se encontró #product-modal");
    alert("No se pudo abrir el formulario. Actualizá la página e intentá de nuevo.");
    return;
  }

  const title = document.getElementById("product-form-title");
  const err = document.getElementById("pf-error");
  if (err) err.textContent = "";
  pendingPhotoFile = null;
  pendingPhotoUrl = null;

  const form = document.getElementById("product-form");
  if (form) form.reset();

  const idEl = document.getElementById("pf-id");
  if (idEl) idEl.value = "";

  const activeEl = document.getElementById("pf-active");
  if (activeEl) activeEl.checked = true;

  const prev = document.getElementById("pf-preview");
  const ph = document.getElementById("pf-photo-placeholder");
  if (prev) {
    prev.hidden = true;
    prev.removeAttribute("src");
  }
  if (ph) ph.hidden = false;

  if (editId) {
    const p = allProducts.find((x) => String(x.id) === String(editId));
    if (!p) {
      console.warn("Producto no encontrado:", editId);
      return;
    }
    if (title) title.textContent = "Editar producto";
    if (idEl) idEl.value = p.id;
    setVal("pf-name", p.name || "");
    setVal("pf-category", p.category || "accesorios");
    setVal("pf-availability", p.availability || "stock");
    setVal("pf-price", p.price || 0);
    setVal("pf-stock", p.stock_qty || 0);
    setVal("pf-sizes", Array.isArray(p.sizes) ? p.sizes.join(", ") : "");
    setVal("pf-supplier", p.supplier || "");
    setVal("pf-supplier-code", p.supplier_code || "");
    setVal("pf-drive-url", p.drive_folder_url || "");
    setVal("pf-badge", p.badge || "");
    setVal("pf-desc", p.description || "");
    if (activeEl) activeEl.checked = p.active !== false;
    if (Array.isArray(p.images) && p.images[0] && prev) {
      pendingPhotoUrl = p.images[0];
      prev.src = p.images[0];
      prev.hidden = false;
      if (ph) ph.hidden = true;
    }
  } else if (title) {
    title.textContent = "Agregar producto";
  }

  // Chips: en edición NO tocamos el nombre ya cargado
  if (!editId) {
    resetNameBuilderState();
  } else {
    // dejar chips en blanco; el nombre del input se respeta
    resetNameBuilderState();
  }
  renderNameBuilder();
  renderSizeBuilder();

  modal.hidden = false;
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function closeProductForm() {
  const modal = document.getElementById("product-modal");
  if (modal) {
    modal.hidden = true;
    modal.style.display = "none";
  }
  document.body.style.overflow = "";
  pendingPhotoFile = null;
}

document.addEventListener("change", (e) => {
  if (e.target?.id !== "pf-file") return;
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 4 * 1024 * 1024) {
    document.getElementById("pf-error").textContent = "La foto debe pesar menos de 4 MB.";
    e.target.value = "";
    return;
  }
  pendingPhotoFile = file;
  const url = URL.createObjectURL(file);
  const prev = document.getElementById("pf-preview");
  prev.src = url;
  prev.hidden = false;
  document.getElementById("pf-photo-placeholder").hidden = true;
});

async function uploadProductPhoto(file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("products").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg"
  });
  if (error) throw error;
  const { data } = supabase.storage.from("products").getPublicUrl(path);
  return data.publicUrl;
}

function parseSizes(str) {
  if (!str || !String(str).trim()) return [];
  return String(str)
    .split(/[,;]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => (/^\d+$/.test(s) ? parseInt(s, 10) : s));
}

async function saveProduct(e) {
  e.preventDefault();
  const errEl = document.getElementById("pf-error");
  const btn = document.getElementById("pf-submit");
  errEl.textContent = "";
  btn.disabled = true;
  btn.textContent = "Guardando...";

  try {
    const id = document.getElementById("pf-id").value;
    // Nombre opcional: permite cargar solo foto (borrador desde Drive) y completar después
    let name = document.getElementById("pf-name").value.trim();
    if (!name) name = "Producto sin nombre";

    let images = pendingPhotoUrl ? [pendingPhotoUrl] : [];
    if (pendingPhotoFile) {
      const url = await uploadProductPhoto(pendingPhotoFile);
      images = [url];
    }
    if (!images.length && !id) {
      images = [];
    }

    const payload = {
      name,
      category: document.getElementById("pf-category").value,
      availability: document.getElementById("pf-availability").value,
      price: Math.max(0, parseFloat(document.getElementById("pf-price").value) || 0),
      stock_qty: Math.max(0, parseInt(document.getElementById("pf-stock").value, 10) || 0),
      sizes: parseSizes(document.getElementById("pf-sizes").value),
      badge: document.getElementById("pf-badge").value.trim(),
      description: document.getElementById("pf-desc").value.trim(),
      supplier: (document.getElementById("pf-supplier")?.value || "").trim(),
      supplier_code: (document.getElementById("pf-supplier-code")?.value || "").trim(),
      drive_folder_url: (document.getElementById("pf-drive-url")?.value || "").trim(),
      active: document.getElementById("pf-active").checked,
      images
    };

    // Si edita y no cambió foto, no pisar images vacías
    if (id && !pendingPhotoFile && pendingPhotoUrl) {
      payload.images = [pendingPhotoUrl];
    }
    if (id && !pendingPhotoFile && !pendingPhotoUrl) {
      delete payload.images;
    }

    let error;
    if (id) {
      ({ error } = await supabase.from("products").update(payload).eq("id", id));
    } else {
      ({ error } = await supabase.from("products").insert(payload));
    }

    if (error) throw error;

    closeProductForm();
    await loadStock();
  } catch (err) {
    console.error(err);
    let msg = err.message || "No se pudo guardar.";
    if (/bucket|storage|not found/i.test(msg)) {
      msg = "Falta crear el bucket de fotos en Supabase. Corré sql/storage-products.sql";
    }
    errEl.textContent = msg;
  } finally {
    btn.disabled = false;
    btn.textContent = "Guardar producto";
  }
}

async function deleteProduct(id, name) {
  if (!confirm(`¿Borrar "${name}"?\nSe saca del catálogo y del stock.`)) return;
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) alert("Error: " + error.message);
  else loadStock();
}

/* ---------- CLIENTES (profesional) ---------- */
let clientsCache = [];

async function loadClients() {
  const list = document.getElementById("clients-list");
  if (!list) return;
  list.innerHTML = `<p class="empty-grid">Cargando clientes...</p>`;

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    list.innerHTML = `<p class="empty-grid">No se pudieron cargar los pedidos. Actualizá la página.</p>`;
    return;
  }

  const { data: orders } = await supabase
    .from("orders")
    .select("id, user_id, total, estado, created_at, items")
    .order("created_at", { ascending: false });

  const byId = new Map();
  (profiles || []).forEach((p) => {
    if (!p?.id) return;
    if (!byId.has(p.id)) byId.set(p.id, p);
  });

  const ordersByUser = {};
  (orders || []).forEach((o) => {
    if (!ordersByUser[o.user_id]) ordersByUser[o.user_id] = [];
    ordersByUser[o.user_id].push(o);
  });

  clientsCache = Array.from(byId.values()).map((p) => {
    const userOrders = ordersByUser[p.id] || [];
    const seen = new Set();
    const dedupOrders = userOrders.filter((o) => {
      if (!o.id || seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });
    const totalGastado = dedupOrders
      .filter((o) => o.estado !== "cancelado")
      .reduce((s, o) => s + Number(o.total || 0), 0);
    return { profile: p, orders: dedupOrders, totalGastado };
  });

  clientsCache.sort((a, b) => b.totalGastado - a.totalGastado);

  // Stats
  const totalClients = clientsCache.length;
  const totalOrders = clientsCache.reduce((s, c) => s + c.orders.length, 0);
  const revenue = clientsCache.reduce((s, c) => s + c.totalGastado, 0);
  const elC = document.getElementById("stat-clients");
  const elO = document.getElementById("stat-clients-orders");
  const elR = document.getElementById("stat-clients-revenue");
  if (elC) elC.textContent = String(totalClients);
  if (elO) elO.textContent = String(totalOrders);
  if (elR) elR.textContent = "$" + revenue.toLocaleString("es-AR");

  const searchEl = document.getElementById("clients-search");
  if (searchEl && !searchEl._bound) {
    searchEl._bound = true;
    searchEl.addEventListener("input", () => renderClientsList());
  }

  renderClientsList();
}

function renderClientsList() {
  const list = document.getElementById("clients-list");
  if (!list) return;

  const q = (document.getElementById("clients-search")?.value || "").trim().toLowerCase();
  let rows = clientsCache;
  if (q) {
    rows = clientsCache.filter(({ profile: p }) => {
      const blob = [p.nombre, p.apellido, p.email, p.telefono].filter(Boolean).join(" ").toLowerCase();
      return blob.includes(q);
    });
  }

  if (!rows.length) {
    list.innerHTML = `<p class="empty-grid">${q ? "Ningún cliente coincide con la búsqueda." : "Todavía no hay clientes registrados."}</p>`;
    return;
  }

  list.innerHTML = rows
    .map(({ profile: p, orders: dedupOrders, totalGastado }) => {
      const nombre = [p.nombre, p.apellido].filter(Boolean).join(" ") || "Sin nombre";
      let wa = p.telefono ? String(p.telefono).replace(/\D/g, "") : "";
      if (wa.startsWith("0")) wa = wa.slice(1);
      if (wa && !wa.startsWith("54")) wa = "54" + wa;
      const last = dedupOrders[0];
      const lastLabel = last
        ? `Último: ${new Date(last.created_at).toLocaleDateString("es-AR")}`
        : "Sin pedidos";

      return `
      <article class="client-card">
        <div class="client-top">
          <div>
            <h3>${escapeHtml(nombre)}</h3>
            <small>${escapeHtml(p.email || "")}</small>
          </div>
          <div class="client-spent">
            <span class="spent-num">$${Number(totalGastado).toLocaleString("es-AR")}</span>
            <span class="spent-label">Total gastado</span>
          </div>
        </div>
        <p class="client-meta">${dedupOrders.length} pedido${dedupOrders.length !== 1 ? "s" : ""} · ${escapeHtml(lastLabel)}${p.telefono ? ` · ${escapeHtml(p.telefono)}` : ""}</p>
        <div class="order-actions client-actions">
          ${wa ? `<a class="btn-secondary" href="https://wa.me/${wa}" target="_blank" rel="noopener"><svg class="wa-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> WhatsApp</a>` : ""}
          ${p.telefono ? `<a class="btn-secondary" href="tel:${p.telefono}">Llamar</a>` : ""}
          ${p.email ? `<a class="btn-secondary" href="mailto:${escapeHtml(p.email)}">Email</a>` : ""}
        </div>
        ${
          dedupOrders.length
            ? `
          <details class="client-orders">
            <summary>Ver pedidos (${dedupOrders.length})</summary>
            <ul>
              ${dedupOrders
                .map(
                  (o) => `
                <li>
                  <span>${new Date(o.created_at).toLocaleDateString("es-AR")}</span>
                  <strong>$${Number(o.total).toLocaleString("es-AR")}</strong>
                  <em class="estado-badge estado-${o.estado}">${labelEstado(o.estado)}</em>
                </li>`
                )
                .join("")}
            </ul>
          </details>`
            : `<p class="client-meta">Sin pedidos todavía</p>`
        }
      </article>`;
    })
    .join("");
}


/* ========== API global para onclick ========== */
window.closeOrderDetail = closeOrderDetail;
window.openOrderDetail = openOrderDetail;
window.tomarPedido = tomarPedido;
window.setEstado = setEstado;
window.confirmarYAvisar = confirmarYAvisar;
window.abrirWhatsAppCliente = abrirWhatsAppCliente;
window.eliminarPedido = eliminarPedido;
window.openProductForm = openProductForm;
window.closeProductForm = closeProductForm;
window.deleteProduct = deleteProduct;
window.filterOrders = filterOrders;
window.adminLogin = adminLogin;
window.adminLogout = adminLogout;
window.switchAdminTab = switchAdminTab;
window.saveProduct = saveProduct;
window.onCategoryChange = onCategoryChange;
