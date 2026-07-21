import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function readLocalEnv() {
  const env = {};
  for (const rawLine of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const separatorIndex = rawLine.indexOf("=");
    if (separatorIndex <= 0 || rawLine.trim().startsWith("#")) continue;
    env[rawLine.slice(0, separatorIndex).trim()] = rawLine
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = readLocalEnv();
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
  console.error("AUTH_DIAGNOSIS_ERROR: faltan URL o clave secreta en .env.local");
  process.exit(1);
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const { data, error } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});

if (error) {
  console.error(`AUTH_DIAGNOSIS_ERROR: ${error.message}`);
  process.exit(1);
}

console.log(`AUTH_USERS: ${data.users.length}`);
for (const user of data.users) {
  const blocked = Boolean(
    user.banned_until && new Date(user.banned_until).getTime() > Date.now(),
  );
  console.log(
    `${user.email ?? "sin-correo"} | confirmado=${Boolean(user.email_confirmed_at)} | bloqueado=${blocked}`,
  );
}
