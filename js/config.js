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
