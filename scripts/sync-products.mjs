/**
 * THE NINE SPORT – Sync de productos desde carpetas
 *
 * Escanea:
 *   assets/products/stock/{categoria}/*.{jpg,jpeg,png,webp}
 *   assets/products/proveedores/{categoria}/*.{jpg,jpeg,png,webp}
 *
 * Crea en Supabase productos borrador con:
 *   - name: nombre del archivo (sin extensión)
 *   - category: nombre de la subcarpeta
 *   - availability: stock | restock
 *   - images: ["assets/products/.../archivo.jpg"]  ← solo la ruta
 *
 * No sube archivos a Storage. No duplica si la ruta ya existe.
 *
 * Uso:
 *   1. cp .env.example .env  → completar SERVICE_ROLE o email/pass
 *   2. npm install
 *   3. npm run sync
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

config(); // lee .env

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const PRODUCTS_ROOT = path.join(ROOT, "assets", "products");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://tvqpgmbjngxncvtlputw.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const OWNER_EMAIL = process.env.OWNER_EMAIL || "";
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || "";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".JPG", ".JPEG", ".PNG", ".WEBP"]);

const VALID_CATEGORIES = new Set([
  "f11",
  "f5",
  "futsal",
  "camisetas",
  "zapatillas",
  "accesorios",
  "otros",
]);

async function main() {
  console.log("\n=== THE NINE SPORT – Sync productos ===\n");

  if (!fs.existsSync(PRODUCTS_ROOT)) {
    console.error("No existe assets/products/. Creala primero.");
    process.exit(1);
  }

  const supabase = await getClient();
  const files = scanImages(PRODUCTS_ROOT);
  console.log(`Fotos encontradas: ${files.length}`);

  if (!files.length) {
    console.log("\nNo hay JPG/PNG/WebP en stock/ o proveedores/.");
    console.log("Poné fotos en por ejemplo:");
    console.log("  assets/products/stock/f11/");
    console.log("  assets/products/proveedores/futsal/\n");
    process.exit(0);
  }

  // Productos actuales (para no duplicar por ruta de imagen)
  const { data: existing, error: loadErr } = await supabase
    .from("products")
    .select("id, name, images");

  if (loadErr) {
    console.error("Error leyendo products:", loadErr.message);
    console.error("¿Corriste sql/setup-completo.sql?");
    process.exit(1);
  }

  const existingPaths = new Set();
  for (const p of existing || []) {
    const imgs = Array.isArray(p.images) ? p.images : [];
    imgs.forEach((img) => existingPaths.add(normalizePath(img)));
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const rel = file.webPath; // assets/products/...
    if (existingPaths.has(normalizePath(rel))) {
      skipped++;
      continue;
    }

    const payload = {
      name: file.baseName,
      category: file.category,
      price: 0,
      badge: "",
      images: [rel],
      sizes: [],
      description: "",
      availability: file.availability,
      stock_qty: 0,
      active: false, // oculto hasta que el dueño complete y active
    };

    const { error } = await supabase.from("products").insert(payload);
    if (error) {
      console.error(`  ✗ ${rel}: ${error.message}`);
      errors++;
    } else {
      console.log(`  ✓ ${rel} → [${file.availability}] ${file.category}`);
      existingPaths.add(normalizePath(rel));
      created++;
    }
  }

  console.log("\n--- Resultado ---");
  console.log(`Creados:   ${created}`);
  console.log(`Ya existían: ${skipped}`);
  console.log(`Errores:  ${errors}`);
  console.log("\nLos nuevos quedan OCULTOS (active=false).");
  console.log("En el panel: Stock → Editar → completar precio/talles → marcar Visible.\n");
}

async function getClient() {
  if (SERVICE_KEY) {
    console.log("Auth: service_role key");
    return createClient(SUPABASE_URL, SERVICE_KEY);
  }

  if (OWNER_EMAIL && OWNER_PASSWORD) {
    console.log("Auth: login dueño (" + OWNER_EMAIL + ")");
    const anon =
      process.env.SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2cXBnbWJqbmd4bmN2dGxwdXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1OTk5MzksImV4cCI6MjEwNzE3NTkzOX0.0QC6NVmM8IcNVIiqqsOGVXHfh-pVKXXepC2GT9h8zMI";
    const client = createClient(SUPABASE_URL, anon);
    const { error } = await client.auth.signInWithPassword({
      email: OWNER_EMAIL,
      password: OWNER_PASSWORD,
    });
    if (error) {
      console.error("No se pudo iniciar sesión:", error.message);
      process.exit(1);
    }
    return client;
  }

  console.error("Falta autenticación.\n");
  console.error("Creá un archivo .env en la raíz del proyecto:");
  console.error("  1. Copiá .env.example → .env");
  console.error("  2. Pegá SUPABASE_SERVICE_ROLE_KEY (Settings → API → service_role)");
  console.error("     O usá OWNER_EMAIL + OWNER_PASSWORD del dueño\n");
  process.exit(1);
}

function scanImages(rootDir) {
  const results = [];

  for (const bucket of ["stock", "proveedores"]) {
    const bucketPath = path.join(rootDir, bucket);
    if (!fs.existsSync(bucketPath)) continue;

    const availability = bucket === "stock" ? "stock" : "restock";
    const categories = fs.readdirSync(bucketPath, { withFileTypes: true });

    for (const cat of categories) {
      if (!cat.isDirectory()) continue;
      const category = cat.name.toLowerCase();
      if (!VALID_CATEGORIES.has(category)) {
        console.warn(`  (omitida carpeta desconocida: ${bucket}/${cat.name})`);
        continue;
      }

      const catPath = path.join(bucketPath, category);
      const files = fs.readdirSync(catPath, { withFileTypes: true });

      for (const f of files) {
        if (!f.isFile()) continue;
        const ext = path.extname(f.name);
        if (!IMAGE_EXT.has(ext)) continue;

        const baseName = path.basename(f.name, ext);
        // Ruta web relativa a la raíz del sitio (Live Server / GitHub Pages)
        const webPath = ["assets", "products", bucket, category, f.name]
          .join("/")
          .replace(/\\/g, "/");

        results.push({
          baseName,
          category,
          availability,
          webPath,
          diskPath: path.join(catPath, f.name),
        });
      }
    }
  }

  return results;
}

function normalizePath(p) {
  return String(p || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .trim();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
