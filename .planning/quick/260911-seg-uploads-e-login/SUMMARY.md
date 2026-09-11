# Segurança: uploads e login — SUMMARY

Data: 2026-09-11 · Spec: `SPEC.md` (nesta pasta)

## Entregue

- **Uploads de produto e de logo** (`src/lib/upload-imagem.ts`): o tipo vem dos bytes (PNG, JPEG,
  WebP); qualquer outra coisa — HTML, SVG com script, binário — recebe 415 e nada é gravado. Acima
  de 5 MB: 413, antes de ler o arquivo. Content-Type e extensão gravados são os do tipo real. Nome
  sem `/`, `\`, `..` ou espaço, até 80 caracteres. Os formulários passam a oferecer só PNG, JPG e WebP.
- **Login** (`src/lib/limite-tentativas.ts` + `api/auth/login`): três limites em 15 min, conferidos
  antes da senha — 5 falhas por IP+usuário, 20 por IP, 10 por usuário real. IP só pelo
  `cf-connecting-ip`. 429 com `Retry-After` e a mensagem "Muitas tentativas. Tente de novo em N minutos."

## Não mexido (motivo na SPEC)

- Cache do `resolverEscopo` do MCP e CORS explícito no middleware.
- ~~Senha do Postgres em `deploy/bfx/secrets.yaml`~~ — **feito** (autorizado pelo André): ver abaixo.

## Verificação

- TDD: 13 falhas no RED (as 6 dos testes antigos eram histórico de mock acumulado entre testes —
  corrigido com `vi.clearAllMocks()`); GREEN com 58 testes em 8 arquivos.
- `tsc` sem erro fora de `__tests__`; `eslint` limpo nos arquivos tocados.

## Revisão por subagente — aplicado

- **Alta — requisições simultâneas furavam o limite**: a tentativa agora conta antes do primeiro
  `await` (JS não intercala esse trecho); no login certo, par e usuário zeram e o IP devolve só a
  própria tentativa (`desfazerFalha`). Teste: 8 simultâneas → 5 chegam à senha, 3 recebem 429.
- **Enumeração pelo 429**: o limite por usuário conta qualquer nome, existente ou não.
- **Tailnet sem Cloudflare**: o limite por IP não se aplica (todos dividiriam "sem-cloudflare").
- **Memória**: nome de usuário acima de 100 caracteres → 400.
- **Retry-After**: a espera mais longa entre os limites bloqueados.
- **Logo WebP sumiria dos PDFs**: logo aceita só PNG e JPEG (`MIMES_LOGO`).
- **Objetos antigos no bucket**: `/produtos/<chave>` só serve raster como imagem; o resto sai como
  download (`application/octet-stream` + `attachment`), sempre com `CSP: default-src 'none'; sandbox`.
- **Corpo grande**: `Content-Length` acima de 5 MB + folga → 413 antes de ler o formulário.
- **Logo só por admin**: `/api/upload-logo` exige perfil admin (403).
- Aceito: com 2 IPs dá para manter uma conta bloqueada (equipe pequena; revisar se virar problema).
- Teste que estourava o timeout de 5 s no primeiro import sob a suíte inteira: import aquecido em
  `beforeAll`. Suíte completa: 1.205 testes passando (Uber só no CI).

## Senha do Postgres — rotacionada e fora do git (commit 4a37d81)

- `ALTER ROLE postgres` no `bfx-db-0` com senha nova de 40 caracteres; `DATABASE_URL` novo em
  `/softlive/bfx/prod/secrets/bfx-app-secrets` (v5 → v6, as outras 25 chaves conferidas por
  asserção); parâmetro novo `/softlive/bfx/prod/secrets/bfx-db-secrets` (POSTGRES_*,
  EVOLUTION_DATABASE_URI) materializado por `deploy/bfx/externalsecret-db.yaml`.
- Evolution API lê `DATABASE_CONNECTION_URI` do Secret; a linha saiu do ConfigMap. `secrets.yaml`
  removido.
- Verificado: ExternalSecrets `SecretSynced`, pod novo do app `Ready` sem P1000, Evolution
  "Migration succeeded", `/api/health` → `db: up`. Arquivos com a senha apagados do scratchpad.
- **Pendente**: o ConfigMap da Evolution ainda tem `AUTHENTICATION_API_KEY` em texto no git
  (e `CORS_ORIGIN=*`) — mover para o SSM e rotacionar a chave exige atualizar quem chama a Evolution.
