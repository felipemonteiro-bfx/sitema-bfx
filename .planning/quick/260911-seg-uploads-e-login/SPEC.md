# Segurança: uploads e login

Data: 2026-09-11 · Origem: hook de revisão de segurança (achados HIGH e MEDIUM) · Pedido do André:
"corrija isso [...] e corrija o upload e tudo mais".

## Comportamento atual vs. esperado

| # | Onde | Hoje | Esperado |
|---|------|------|----------|
| 1 | `api/produtos/upload` e `api/upload-logo` | Aceitam qualquer arquivo; `file.type` vem do navegador e vira o Content-Type no bucket. Um HTML com nome `foto.png` é servido como o navegador disser. | Tipo decidido pelos **bytes** (assinatura PNG, JPEG ou WebP). Qualquer outra coisa: 415, nada gravado. Content-Type e extensão saem do tipo real. |
| 2 | mesmas rotas | Sem limite de tamanho. | Acima de 5 MB: 413, antes de ler o arquivo. |
| 3 | mesmas rotas | Nome do arquivo quase cru (`produtos` só troca espaço; o fallback de disco do logo usa `file.name` inteiro): `../../x` sai da pasta no fallback de desenvolvimento. | Nome sanitizado (sem `/`, `\`, `..`, espaço), cortado em 80 caracteres, extensão do tipo real. |
| 4 | `api/auth/login` | Tentativas ilimitadas. | Em 15 min, conferido **antes** da senha → 429 com `Retry-After`: 5 falhas por IP+usuário (usuário inexistente conta igual; login certo zera o par), 20 falhas por IP em qualquer usuário (não zera), 10 falhas por usuário real de qualquer IP (login certo zera). IP = só `cf-connecting-ip` — `x-forwarded-for` é forjável (versão anterior barrada pelo hook de segurança). |

## Arquivos

- `src/lib/upload-imagem.ts` (novo): `detectarTipoImagem`, `validarImagem`, `nomeComExtensaoReal`.
- `src/lib/limite-tentativas.ts` (novo): `criarLimitador` em memória, com janela e teto de chaves.
- `src/app/api/produtos/upload/route.ts`, `src/app/api/upload-logo/route.ts`, `src/app/api/auth/login/route.ts`.
- Testes: `upload-imagem.test.ts`, `limite-tentativas.test.ts`, `login-limite-tentativas.test.ts` (novos);
  `produtos-upload-route.test.ts` e `upload-logo-route.test.ts` (fixture passa a ser um PNG de verdade + casos novos).

## Fora do escopo (e por quê)

- **SVG e GIF**: fora da lista. SVG executa script quando aberto direto no navegador. Os formulários
  continuam com `accept="image/*"`; o servidor é quem decide.
- **Limitador distribuído (Redis)**: o app roda com `replicas: 1` (`deploy/bfx/app.yaml`); em memória
  basta. Se escalar, o limite passa a ser por réplica — anotado no código.
- **Cache no `resolverEscopo` do MCP**: a rota já exige token de máquina; cachear identidade → dados
  do cliente troca um custo pequeno por risco de servir cadastro desatualizado. Não mexer.
- **CORS explícito no middleware**: o Next não manda cabeçalho CORS, então o navegador já bloqueia
  leitura de outra origem; o cookie de sessão é `SameSite=Lax`. Checar `Origin` no middleware atrás
  do Traefik arrisca derrubar requisição legítima. Não mexer.
- **Senha do Postgres no git (`deploy/bfx/secrets.yaml`)**: exige mexer em infra/GitOps e rotacionar a
  senha do banco de produção — só com confirmação explícita do André (ver memória "Não mexer em
  infra/GitOps").
