# Debug K8s – página Configurações falhando online

Quando a aplicação funciona em localhost mas falha no K8s (ex.: página Configurações), use este guia.

---

## 1. Habilitar exibição do erro real

Adicione temporariamente ao Secret `bfx-app-secrets`:

```yaml
NEXT_PUBLIC_SHOW_ERROR_DETAILS: "true"
```

Reaplique e recarregue a página com erro. O erro boundary mostrará "Mostrar detalhes do erro" com a mensagem real.

**Remova essa variável após o debug.**

---

## 2. Conferência rápida

| Item | Comando / Verificação |
|------|------------------------|
| Variáveis no pod | `kubectl exec -it deploy/bfx-app -n bfx -- env \| grep -E "DATABASE\|SESSION"` |
| Logs do app | `kubectl logs deploy/bfx-app -n bfx --tail=100` |
| Postgres acessível | `kubectl exec -it deploy/bfx-app -n bfx -- sh -c "nc -zv bfx-db 5432"` |
| Migrations aplicadas | Logs de startup: `prisma migrate deploy` deve terminar sem erro |

---

## 3. Variáveis obrigatórias no Secret

O `bfx-app-secrets` deve ter:

- `DATABASE_URL` – `postgresql://postgres:postgres@bfx-db:5432/bfx?schema=public` (ou URL do seu Postgres)
- `SESSION_SECRET` – mínimo 32 caracteres
- `NEXT_PUBLIC_APP_URL` – URL pública do app (ex.: `https://bfx.softlive.dev`)

Opcionais, conforme uso:

- `CRON_SECRET`, `ASAAS_API_KEY`, `ASAAS_ENV`
- `MINIO_*` – se usar MinIO para imagens
- `EVOLUTION_*` – se usar WhatsApp

---

## 4. Possíveis causas

1. **Banco inacessível** – Postgres pode não estar pronto ou o serviço `bfx-db` pode não resolver.
2. **Tabelas inexistentes** – Rodar `prisma migrate deploy` apontando para o mesmo Postgres (via `DATABASE_URL`).
3. **Sessão** – Se o erro ocorrer só em certas rotas, verificar `SESSION_SECRET` e cookies.
4. **Upload de logo** – O diretório `public/uploads` é criado automaticamente; em ambiente read-only pode falhar apenas no upload, não no carregamento da página.

---

## 5. Migrations no Postgres do cluster

```bash
# Do seu ambiente local, com DATABASE_URL do cluster
DATABASE_URL="postgresql://postgres:SENHA@HOST:5432/bfx?schema=public" npx prisma migrate deploy
```

Se o Postgres estiver só dentro do cluster, use port-forward:

```bash
kubectl port-forward svc/bfx-db 5432:5432 -n bfx
# Em outro terminal:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bfx?schema=public" npx prisma migrate deploy
```
