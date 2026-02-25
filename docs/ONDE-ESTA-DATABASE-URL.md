# Banco de dados – DATABASE_URL e migrações

O app usa **Postgres** com **Prisma**. A connection string é a variável **`DATABASE_URL`**.

---

## Onde está a DATABASE_URL?

### Produção (Vercel)

A `DATABASE_URL` fica nas **Environment Variables** do projeto na Vercel.

**Como achar:**

1. Abra **[vercel.com](https://vercel.com)** e faça login.
2. Clique no projeto **sitema-bfx**.
3. **Settings** → **Environment Variables**.
4. Procure a linha **`DATABASE_URL`**.
5. Para copiar: três pontinhos (⋮) ou ícone de olho para revelar e copiar a URL (`postgresql://` ou `postgres://`).

Use essa mesma URL quando for rodar **migrações** no banco de produção (ver seção abaixo).

---

### Desenvolvimento local

Arquivo **`.env`** ou **`.env.local`** na raiz do projeto (mesma pasta do `package.json`).

Exemplo para Docker:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bfx?schema=public"
```

Se não existir, copie o `.env.example` para `.env.local` e preencha a `DATABASE_URL`.

---

## Configurar o banco na Vercel (primeira vez)

Se ainda não tem Postgres para produção:

1. **Vercel Postgres** (integrado):  
   [vercel.com](https://vercel.com) → projeto → **Storage** → **Create Database** → **Postgres**.  
   A Vercel cria a database e adiciona **`POSTGRES_URL`** (e às vezes `POSTGRES_URL_NON_POOLING`).  
   Use a URL **com pooler** para serverless: em **Environment Variables** defina `DATABASE_URL` com o valor de `POSTGRES_URL` (ou a connection string que o painel indicar para uso em serverless).

2. **Neon**:  
   [neon.tech](https://neon.tech) → crie um projeto → copie a **connection string** (preferir a que usa **pooler**). Defina na Vercel como `DATABASE_URL`.

3. **Supabase**:  
   [supabase.com](https://supabase.com) → projeto → **Settings** → **Database** → **Connection string** (modo **Transaction** ou **Session** conforme a doc). Defina na Vercel como `DATABASE_URL`.

**Recomendação:** Em produção na Vercel use sempre connection string **com pooler** (ex.: `?pgbouncer=true` ou a URL “pooled” do provedor) para evitar esgotar conexões no serverless.

---

## Atualizar o banco (rodar migrações)

Sempre que houver novas migrações em `prisma/migrations`, rode **uma vez** apontando para o banco de produção:

1. **Copie a `DATABASE_URL`** do ambiente de produção (Vercel → Settings → Environment Variables → `DATABASE_URL`).

2. **Na pasta do projeto**, rode:

   **PowerShell (Windows):**
   ```powershell
   $env:DATABASE_URL = "postgresql://usuario:senha@host:5432/bfx?schema=public"
   npx prisma migrate deploy
   ```

   **Cmd (Windows):**
   ```cmd
   set DATABASE_URL=postgresql://usuario:senha@host:5432/bfx?schema=public
   npx prisma migrate deploy
   ```

   **Linux/macOS:**
   ```bash
   DATABASE_URL="postgresql://usuario:senha@host:5432/bfx?schema=public" npx prisma migrate deploy
   ```

   Substitua pela sua `DATABASE_URL` real.

3. **Ou**, com `DATABASE_URL` já definida no ambiente:
   ```bash
   npm run db:migrate
   ```

Se der erro *"Could not find Prisma Schema"*, execute na pasta do projeto (onde está `prisma/schema.prisma`).

---

## Resumo

| Onde usar              | Onde está a DATABASE_URL |
|------------------------|---------------------------|
| **Produção (Vercel)**  | Vercel → sitema-bfx → Settings → Environment Variables → `DATABASE_URL` |
| **Rodar migrações**    | Use a mesma URL das Environment Variables da Vercel (copie e use no comando acima). |
| **Desenvolvimento**    | Arquivo `.env` ou `.env.local` na pasta do projeto |

**Importante:** não compartilhe a `DATABASE_URL` e não suba esse valor no Git (`.env` e `.env.local` estão no `.gitignore`).
