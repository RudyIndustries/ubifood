import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function readLocalEnv() {
  const content = readFileSync(".env.local", "utf8");
  const env = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    env[key] = value;
  }

  return env;
}

const env = readLocalEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabaseSecretKey = env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  console.error("SUPABASE_ERROR: faltan variables en .env.local");
  process.exit(1);
}

const publicClient = createClient(supabaseUrl, supabasePublishableKey);
const { error: publicError } = await publicClient
  .from("profiles")
  .select("id", { count: "exact", head: true });

if (publicError) {
  console.error(`SUPABASE_ERROR: ${publicError.message}`);
  process.exit(1);
}

if (!supabaseSecretKey) {
  console.log("SUPABASE_OK: conexion publica lista");
  process.exit(0);
}

const adminClient = createClient(supabaseUrl, supabaseSecretKey);
const { data: adminProfile, error: adminError } = await adminClient
  .from("profiles")
  .select("id,role")
  .eq("email", "admin@ubifood.bo")
  .maybeSingle();

if (adminError) {
  console.error(`SUPABASE_ERROR: ${adminError.message}`);
  process.exit(1);
}

if (!adminProfile || adminProfile.role !== "admin") {
  console.log(
    "SUPABASE_OK: conexion lista, pero falta ejecutar seed_admin_profile.sql para admin@ubifood.bo",
  );
  process.exit(0);
}

console.log("SUPABASE_OK: conexion lista y admin configurado");
