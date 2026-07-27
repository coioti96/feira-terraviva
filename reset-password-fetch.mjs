// reset-password-fetch.mjs
// ============================================================
// RESET DE SENHA VIA API REST DO SUPABASE (sem SDK, sem ws)
// Resolve o bug: Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)
//
// INSTRUÇÕES:
// 1. Pegue sua SERVICE_ROLE_KEY no Supabase Dashboard:
//    Settings → API → Project API keys → service_role
// 2. Substitua os valores abaixo
// 3. Rode: node reset-password-fetch.mjs
// ============================================================

const SUPABASE_URL = "https://myvjgaglliedejwotwwe.supabase.co";  // <-- SUBSTITUA (ex: https://abc123.supabase.co)
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dmpnYWdsbGllZGVqd290d3dlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDkyNTE0OCwiZXhwIjoyMTAwNTAxMTQ4fQ.vWTI2tvYJl_tRcRf8oomF4owT7f30BGV7-ERcdoMci4";                         // <-- SUBSTITUA (service_role key)

const ADMIN_EMAIL = "vivafeiraadminviva20@gmail.com";
const NEW_PASSWORD = "NoisVivaSK813@20";  // <-- MUDE SE QUISER

async function supabaseRequest(path, method, body = null) {
  const url = `${SUPABASE_URL}/auth/v1/admin${path}`;
  const options = {
    method,
    headers: {
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "apikey": SUPABASE_SERVICE_KEY,
      "Content-Type": "application/json",
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || data?.error_description || `HTTP ${res.status}`);
  }
  return data;
}

async function main() {
  console.log("🔍 Buscando usuário:", ADMIN_EMAIL);

  // Lista todos os usuários
  const listData = await supabaseRequest("/users", "GET");
  const users = listData.users || [];
  const user = users.find((u) => u.email === ADMIN_EMAIL);

  if (!user) {
    console.error("❌ Usuário não encontrado:", ADMIN_EMAIL);
    console.log("Usuários existentes:", users.map((u) => u.email));
    process.exit(1);
  }

  console.log("✅ Usuário encontrado:", user.id);
  console.log("🔄 Resetando senha...");

  // Atualiza a senha
  await supabaseRequest(`/users/${user.id}`, "PUT", {
    password: NEW_PASSWORD,
    email_confirm: true,
  });

  console.log("✅ Senha resetada com sucesso!");
  console.log("");
  console.log("📧 Email:", ADMIN_EMAIL);
  console.log("🔑 Nova senha:", NEW_PASSWORD);
  console.log("");
  console.log("🚀 Agora faça login na aplicação.");
  console.log("⚠️  Apague este arquivo após usar (contém service_role key).");
}

main().catch((err) => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
