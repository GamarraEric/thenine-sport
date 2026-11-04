/* The Nine Sport — Configuración */

const SUPABASE_URL = "https://tvqpgmbjngxncvtlputw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2cXBnbWJqbmd4bmN2dGxwdXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1OTk5MzksImV4cCI6MjEwNzE3NTkzOX0.0QC6NVmM8IcNVIiqqsOGVXHfh-pVKXXepC2GT9h8zMI";

/** Solo este email puede entrar al panel */
const OWNER_EMAIL = "theninesport9@gmail.com";

const WHATSAPP_NUMBER = "5493364191019";
const SHIPPING_NOTE = "Hacemos envíos a todo el país. También podés retirar en el local (Quinquela Martín 1590, Villa Canto).";
const PAYMENT_NOTE = "Medios de pago: efectivo, transferencia o lo que coordinemos.";
const HOURS_NOTE = "Horarios de atención: 9:30–12:30 y 18:00–21:30.";

/**
 * Dos clientes Supabase con sesiones separadas:
 * - Tienda (index): cuenta de clientes
 * - Panel (admin): solo el dueño
 * Así podés estar logueado como cliente en la tienda y como dueño en el panel a la vez.
 */
(function initSupabase() {
  const lib = window.supabase;
  if (!lib || typeof lib.createClient !== "function") {
    console.error("Supabase SDK no cargó.");
    window.supabaseStore = null;
    window.supabaseAdmin = null;
    window.supabase = null;
    return;
  }

  const common = {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  };

  window.supabaseStore = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    ...common,
    auth: { ...common.auth, storageKey: "nine-sport-store-auth" }
  });

  window.supabaseAdmin = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    ...common,
    auth: { ...common.auth, storageKey: "nine-sport-admin-auth" }
  });

  // Por defecto la tienda; admin.js reasigna a supabaseAdmin
  window.supabase = window.supabaseStore;
})();

function isOwnerEmail(email) {
  if (!email) return false;
  return String(email).trim().toLowerCase() === String(OWNER_EMAIL).trim().toLowerCase();
}





/* Guía de talles The Nine Sport (tabla oficial del local) */
const SIZE_GUIDE = [
  { arg: 35, eur: 36, us: "4", cm: "23" },
  { arg: 36, eur: 37, us: "5", cm: "23,5" },
  { arg: 37, eur: 38, us: "5,5", cm: "24" },
  { arg: 38, eur: 39, us: "6,5", cm: "24,5" },
  { arg: 39, eur: 40, us: "7", cm: "25" },
  { arg: 40, eur: 41, us: "8", cm: "26" },
  { arg: 41, eur: 42, us: "8,5", cm: "26,5" },
  { arg: 42, eur: 43, us: "9,5", cm: "27,5" },
  { arg: 43, eur: 44, us: "10", cm: "28" },
  { arg: 44, eur: 45, us: "11", cm: "29" }
];
const SIZE_SYSTEM_LABEL = { arg: "ARG", eur: "EUR", us: "US" };

function findSizeRow(value, system) {
  const v = String(value).trim().replace(",", ".");
  const num = parseFloat(v);
  const sys = (system || "arg").toLowerCase();
  return SIZE_GUIDE.find((row) => {
    if (sys === "arg") return row.arg === parseInt(v, 10);
    if (sys === "eur") return row.eur === parseInt(v, 10);
    if (sys === "us") {
      return String(row.us).replace(",", ".") === v || parseFloat(String(row.us).replace(",", ".")) === num;
    }
    return false;
  }) || null;
}

function formatSizeLabel(raw, sizeSystem) {
  const s = String(raw || "").trim();
  if (!s) return s;
  const sys = (sizeSystem || "arg").toLowerCase();
  if (!/^\d+([.,]\d+)?$/.test(s)) return s;
  const row = findSizeRow(s, sys);
  if (!row) return s + " " + (SIZE_SYSTEM_LABEL[sys] || sys.toUpperCase());
  if (sys === "arg") {
    return row.arg + " ARG · " + row.eur + " EUR · US " + row.us + " · " + row.cm + " cm";
  }
  if (sys === "eur") {
    return s + " EUR · " + row.arg + " ARG · US " + row.us + " · " + row.cm + " cm";
  }
  return s + " US · " + row.arg + " ARG · " + row.eur + " EUR · " + row.cm + " cm";
}

function formatSizeChip(raw, sizeSystem) {
  const s = String(raw || "").trim();
  const sys = (sizeSystem || "arg").toLowerCase();
  if (!/^\d+([.,]\d+)?$/.test(s)) return s;
  const row = findSizeRow(s, sys);
  if (!row) return s + " " + (SIZE_SYSTEM_LABEL[sys] || "ARG");
  if (sys === "arg") return s + " ARG (" + row.eur + " EUR)";
  if (sys === "eur") return s + " EUR (" + row.arg + " ARG)";
  return s + " US (" + row.arg + " ARG)";
}
