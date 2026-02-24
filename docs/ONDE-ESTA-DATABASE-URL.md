# Onde está minha DATABASE_URL?

A `DATABASE_URL` é a connection string do banco Postgres que o app usa. Ela pode estar em **dois lugares**:

---

## 1. Na Vercel (banco de produção)

Se o app está no ar na Vercel, você já configurou essa variável no painel.

**Como achar:**

1. Abra **[vercel.com](https://vercel.com)** e faça login.
2. Clique no projeto **sitema-bfx**.
3. No topo, clique em **Settings** (Configurações).
4. No menu da esquerda, clique em **Environment Variables**.
5. Na lista, procure a linha **`DATABASE_URL`**.
6. O valor fica oculto (••••••). Para **copiar**:
   - Clique nos **três pontinhos** (⋮) no final da linha **ou** no ícone de **olho** para revelar.
   - Copie a URL (começa com `postgresql://` ou `postgres://`).

Essa é a URL do **banco de produção**. Use essa mesma URL quando for rodar `npx prisma migrate deploy` para atualizar o banco (no README tem o comando).

---

## 2. No seu PC (desenvolvimento local)

Se você roda o app na sua máquina (`npm run dev` ou Docker), a URL costuma estar em um arquivo de ambiente na pasta do projeto.

**Onde olhar:**

- **`.env`** ou **`.env.local`** na raiz do projeto (na mesma pasta do `package.json`).

Abra o arquivo com um editor e procure a linha:

```bash
DATABASE_URL="postgresql://..."
```

Se não existir, copie o `.env.example` para `.env.local` e preencha a `DATABASE_URL` (por exemplo, do Docker: `postgresql://postgres:postgres@localhost:5432/bfx`).

---

## Resumo

| Onde você quer usar      | Onde está a DATABASE_URL        |
|-------------------------|----------------------------------|
| **Produção (Vercel)**   | Vercel → sitema-bfx → Settings → Environment Variables → `DATABASE_URL` |
| **Migrar o banco da Vercel** | Use a mesma URL que está nas Environment Variables da Vercel (copie e use no comando do README). |
| **Desenvolvimento local** | Arquivo `.env` ou `.env.local` na pasta do projeto |

**Importante:** não compartilhe a `DATABASE_URL` com ninguém e não suba esse valor no Git (os arquivos `.env` e `.env.local` já estão no `.gitignore`).
