/* The Nine Sport — Configuración */

const SUPABASE_URL = "https://tvqpgmbjngxncvtlputw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2cXBnbWJqbmd4bmN2dGxwdXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1OTk5MzksImV4cCI6MjEwNzE3NTkzOX0.0QC6NVmM8IcNVIiqqsOGVXHfh-pVKXXepC2GT9h8zMI";

const OWNER_EMAIL = "theninesport9@gmail.com";
const WHATSAPP_NUMBER = "5493364191019";
const SHIPPING_NOTE = "Hacemos envíos a todo el país. También podés retirar en el local (Quinquela Martín 1590, Villa Canto).";
const PAYMENT_NOTE = "Medios de pago: efectivo, transferencia o lo que coordinemos.";
const HOURS_NOTE = "Horarios de atención: 9:30–12:30 y 18:00–21:30.";

/* Crear el cliente sin pisar mal la librería del CDN */
(function initSupabase() {
  const lib = window.supabase;
  if (!lib || typeof lib.createClient !== "function") {
    console.error("Supabase SDK no cargó. Revisá la conexión o el script del CDN.");
    window.supabaseClient = null;
    return;
  }
  window.supabaseClient = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();

/* Alias global compatible con app.js y admin.js */
var supabase = window.supabaseClient;
