# Banco de dados — Terra Viva

Após ativar o Lovable Cloud (Supabase), execute `db/schema.sql` no SQL Editor
para criar todas as tabelas, RLS, roles e seeds. Depois, crie os buckets
`avatars`, `products` e `store` no Storage.

Variáveis necessárias em `.env`:

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY (ou VITE_SUPABASE_ANON_KEY)
