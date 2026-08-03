---
phase: 05-storage-dur-vel-minio-no-cluster
plan: 04
subsystem: storage
tags: [minio, s3, next-api-route, cron, vitest, tdd]

requires:
  - phase: 05-01
    provides: "src/lib/storage-policy.ts — deveRecusarUpload, exigeStorageDuravel (guarda de producao)"
  - phase: 05-03
    provides: "confirmacao de que embedLogoNoPdf/logoSrcParaBrowser sao os unicos pontos de leitura da logo"
provides:
  - "src/app/api/produtos/upload/route.ts — mesma guarda de producao da rota de logo (503 antes de disco em NODE_ENV=production sem storage ou com uploadToMinIO falho)"
  - "src/__tests__/cleanup-uploads-cron.test.ts — trava de regressao de que o cron nunca ganha logica de remocao de asset no MinIO (D-05)"
affects: []

actuals:
  tokens: 3600
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Guarda de producao (deveRecusarUpload/exigeStorageDuravel) replicada identicamente nas duas rotas de upload do sistema (logo e produto)"
    - "Teste de trava (regression lock) sem mudanca de comportamento: o entregavel e o teste, nao o codigo de producao"

key-files:
  created:
    - src/__tests__/produtos-upload-route.test.ts
    - src/__tests__/cleanup-uploads-cron.test.ts
  modified:
    - src/app/api/produtos/upload/route.ts
    - src/app/api/cron/cleanup-uploads/route.ts

key-decisions:
  - "Nenhuma decisao nova de arquitetura — este plano aplica um padrao ja fechado no plano 05-01 (guarda de producao) a uma segunda rota, e trava por teste uma decisao ja tomada no 05-CONTEXT.md (D-05: cron nao ganha remocao de asset no MinIO)"

patterns-established: []

requirements-completed: [STO-04, STO-06]

# STO-01, STO-02 e STO-05 permanecem [ ] em REQUIREMENTS.md — dependem da Task 3
# (checkpoint humano no cluster), que este agente nao executou. Ver "Acoes humanas
# pendentes" abaixo. Marcar so STO-04/STO-06 aqui reflete a realidade: sao os dois
# unicos requisitos deste plano que o codigo por si so satisfaz.

coverage:
  - id: D1
    description: "POST /api/produtos/upload recusa explicitamente (>=400) em producao sem storage configurado, sem escrever em disco"
    requirement: "STO-04"
    verification:
      - kind: unit
        ref: "src/__tests__/produtos-upload-route.test.ts#producao sem nenhuma var MINIO: responde >=400 (503) com error e NAO chama writeFile"
        status: unknown
    human_judgment: true
    rationale: "vitest nao roda localmente nesta maquina (Yarn PnP sem node_modules, npm install proibido). O teste foi escrito seguindo TDD e fica como gate do CI (.github/workflows/ci.yml -> npx vitest run). A logica pura (deveRecusarUpload/exigeStorageDuravel) foi verificada com node --input-type=module direto contra o arquivo real de src/lib/storage-policy.ts e devolveu os valores esperados nos tres cenarios (prod sem vars=true, prod com vars=false, dev sem vars=false)."
  - id: D2
    description: "POST /api/produtos/upload em producao com MinIO configurado mas uploadToMinIO devolvendo null/lancando: recusa explicita (>=400), sem degradar para disco efemero"
    requirement: "STO-04"
    verification:
      - kind: unit
        ref: "src/__tests__/produtos-upload-route.test.ts#producao com as vars MINIO mas uploadToMinIO resolvendo null: >=400 (503) e nenhuma escrita em disco"
        status: unknown
    human_judgment: true
    rationale: "Mesma limitacao de ambiente (vitest nao executavel localmente). O gate estrutural do plano (grep de exigeStorageDuravel na rota) confirmou a presenca do tratamento; o comportamento fim-a-fim so e confirmado pela suite completa no CI."
  - id: D3
    description: "Em desenvolvimento sem MinIO, POST /api/produtos/upload continua caindo para o fallback de disco em public/uploads/produtos (comportamento pre-existente preservado)"
    requirement: "STO-04"
    verification:
      - kind: unit
        ref: "src/__tests__/produtos-upload-route.test.ts#development sem MINIO: 200 com filePath comecando em /uploads/produtos/ e escrita em disco chamada"
        status: unknown
    human_judgment: true
    rationale: "Idem — suite vitest e o gate do CI. Diff revisado manualmente: nenhuma linha do bloco de fallback de dev foi alterada, apenas o guard e o tratamento de falha do MinIO foram inseridos antes dele."
  - id: D4
    description: "Cron cleanup-uploads nunca remove um arquivo/objeto ainda referenciado no banco (Config.logoPath legado ou imagem de produto), e cleanupMinIOPrefix e chamado no maximo uma vez, sempre com o prefixo de relatorios mensais"
    requirement: "STO-06"
    verification:
      - kind: unit
        ref: "src/__tests__/cleanup-uploads-cron.test.ts#Config.logoPath legado /uploads/1-logo.png ainda referenciado no banco: unlink NAO e chamado para ele; arquivo antigo nao referenciado: unlink E chamado; cleanupMinIOPrefix chamado no maximo 1x com o prefixo de relatorios"
        status: unknown
      - kind: other
        ref: "sh -c do <verify> da Task 2 (CRON_D05_OK) — grep estrutural confirmando 1 import + 1 chamada de cleanupMinIOPrefix, 1 ocorrencia do prefixo relatorios/mensal, 1 ponto de unlink"
        status: pass
    human_judgment: true
    rationale: "O grep estrutural (status: pass) confirma que a chamada de limpeza remota nao foi ampliada nem duplicada, mas o comportamento observavel do teste (mocks de fs/promises e @/lib/minio) so e confirmado pela suite vitest completa no CI, que nao roda localmente nesta maquina."
  - id: D5
    description: "Config.logoPath em URL absoluta do MinIO nao aciona nenhuma remocao de objeto extra no cron (D-05) — a rota so remove no filesystem legado"
    requirement: "STO-06"
    verification:
      - kind: unit
        ref: "src/__tests__/cleanup-uploads-cron.test.ts#Config.logoPath em URL absoluta do MinIO: responde 200 e nenhuma chamada de remocao de objeto MinIO alem da de relatorios (D-05)"
        status: unknown
    human_judgment: true
    rationale: "Mesma limitacao de ambiente — suite vitest e o gate do CI."
  - id: D6
    description: "Cron cleanup-uploads responde 401 sem CRON_SECRET correto no header, antes de qualquer varredura de disco ou de banco"
    requirement: "STO-06"
    verification:
      - kind: unit
        ref: "src/__tests__/cleanup-uploads-cron.test.ts#sem CRON_SECRET correto no header, responde 401 antes de qualquer varredura"
        status: unknown
    human_judgment: true
    rationale: "Mesma limitacao de ambiente — suite vitest e o gate do CI. Este caso ja existia antes deste plano (comportamento pre-existente), o teste apenas trava a regressao."
  - id: D7
    description: "Verificacao em producao real: MinIO provisionado no namespace bfx, logo sobrevive a kubectl delete pod do app e do MinIO, e aparece nos tres leitores (configuracoes/catalogo/recibo PDF)"
    requirement: "STO-01, STO-02, STO-05"
    verification: []
    human_judgment: true
    rationale: "Requer criar secrets no AWS SSM, sincronizar ArgoCD e rodar kubectl no cluster real — proibido para este agente por restricao explicita do ambiente de execucao (nunca rodar kubectl/argocd/aws, nunca escrever no banco). Task 3 do plano e checkpoint:human-verify e permanece pendente; ver 'Acoes humanas pendentes' abaixo para o runbook exato."

duration: 20min
completed: 2026-08-03
status: complete
---

# Phase 5 Plan 4: Guarda de producao na imagem de produto + trava do cron + runbook de verificacao no cluster Summary

**A rota de upload de imagem de produto ganha a mesma guarda de producao da rota de logo (503 antes de disco), o cron `cleanup-uploads` ganha um teste de regressao que trava a decisao D-05 (nunca remove asset no MinIO), e a verificacao real no cluster (SSM, ArgoCD, `kubectl delete pod`) fica documentada como runbook para o André — nenhum comando de cluster foi executado por este agente.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-03 (apos 05-03 completo)
- **Completed:** 2026-08-03
- **Tasks:** 2/2 executaveis pelo agente (Task 3 e checkpoint humano, ver abaixo)
- **Files modified:** 4 (2 rotas modificadas, 2 arquivos de teste criados)

## Accomplishments

- `src/app/api/produtos/upload/route.ts` agora usa a mesma guarda de `deveRecusarUpload`/`exigeStorageDuravel` de `@/lib/storage-policy` que a rota de logo (plano 05-01): em `NODE_ENV=production` sem MinIO configurado, responde 503 antes de qualquer `writeFile`; se `uploadToMinIO` devolver `null` ou lancar em producao, tambem responde 503 em vez de degradar para o disco efemero do pod. Fora de producao, o fallback em `public/uploads/produtos` continua intacto.
- `src/__tests__/produtos-upload-route.test.ts` cobre os cinco casos do plano: producao sem vars (>=400, sem `writeFile`), producao com vars e upload OK (200, `filePath` = URL, sem `writeFile`), producao com vars mas upload falho (>=400, sem `writeFile`), dev sem vars (200, `filePath` comecando em `/uploads/produtos/`, `writeFile` chamado), e POST sem `file` (400).
- `src/app/api/cron/cleanup-uploads/route.ts` ganhou apenas um bloco de comentario acima da chamada de housekeeping do MinIO, documentando a decisao D-05 — nenhuma linha de logica foi alterada (confirmado pelo `<verify>` estrutural: mesma 1 chamada de `cleanupMinIOPrefix`, mesmo prefixo `relatorios/mensal/`, mesmo 1 ponto de `unlink`).
- `src/__tests__/cleanup-uploads-cron.test.ts` trava os cinco casos do plano: arquivo legado ainda referenciado no banco nunca e removido; arquivo orfao antigo continua sendo removido (o cron nao perdeu funcao); `cleanupMinIOPrefix` chamado no maximo uma vez, sempre com o prefixo de relatorios; `Config.logoPath` em URL absoluta do MinIO nao aciona remocao extra de objeto; sem `CRON_SECRET` correto responde 401 antes de qualquer varredura.

## Task Commits

Each task was committed atomically:

1. **Task 1: Imagem de produto tambem falha alto em producao sem storage (STO-04)** - `16ce04c` (feat)
2. **Task 2: Trava de regressao do cron cleanup-uploads (STO-06, D-05)** - `b5041d8` (test)

**Plan metadata:** (proximo commit — docs, ver secao de estado abaixo)

_Nota: Task 3 (checkpoint:human-verify, gate="blocking") nao foi executada por este agente — envolve criar secrets no AWS SSM, sincronizar o ArgoCD e rodar `kubectl` no cluster real, todos proibidos pelas restricoes explicitas deste ambiente de execucao. Ver "Acoes humanas pendentes" abaixo para o runbook completo que o André precisa seguir._

## Files Created/Modified

- `src/app/api/produtos/upload/route.ts` - Guarda de producao (`deveRecusarUpload`) antes de qualquer I/O de disco; tratamento de falha do MinIO em producao (`exigeStorageDuravel`) sem degradar para disco efemero; fallback de dev preservado
- `src/app/api/cron/cleanup-uploads/route.ts` - Apenas comentario documentando D-05 acima da chamada de `cleanupMinIOPrefix`; zero mudanca de logica
- `src/__tests__/produtos-upload-route.test.ts` - 5 casos: prod sem vars, prod com vars+sucesso, prod com vars+falha, dev sem vars, sem campo file
- `src/__tests__/cleanup-uploads-cron.test.ts` - 5 casos: 401 sem CRON_SECRET, arquivo legado referenciado nao removido + orfao removido + cleanupMinIOPrefix 1x com prefixo correto, URL absoluta do MinIO sem remocao extra

## Decisions Made

Nenhuma decisao nova de arquitetura. Este plano aplica um padrao ja fechado (guarda de producao, plano 05-01) a uma segunda rota e trava por teste uma decisao ja registrada em `05-CONTEXT.md` (D-05). A unica escolha de implementacao foi manter a chave de objeto das imagens de produto sem o prefixo `logo/` (D-02 e exclusivo da logo), exatamente como instruido pela `<action>` da Task 1 — mudar o layout invalidaria `Produto.imagem` ja existentes no bucket.

## Deviations from Plan

None — plano executado exatamente como escrito nas Tasks 1 e 2. Task 3 (checkpoint humano) foi tratada conforme instrucao explicita para esta execucao: coletada como runbook em vez de executada ou auto-aprovada, apesar de `workflow.auto_advance=true` no config do projeto (auto-aprovacao de `checkpoint:human-verify` normalmente se aplicaria a checkpoints com `gate="blocking"`, mas as restricoes desta execucao — proibicao explicita de `kubectl`/`argocd`/`aws` e de escrita no banco — sobrepoem a auto-aprovacao generica para este caso especifico, ja que o agente fisicamente nao pode executar as acoes que a Task 3 verificaria).

## Issues Encountered

- Confirmado (como as tres SUMMARYs anteriores da fase ja antecipavam): `npx vitest run` nao roda nesta maquina (Yarn PnP sem `node_modules`, `npm install` proibido — `vitest: command not found`). Os dois arquivos de teste novos foram escritos seguindo TDD e ficam como gate do CI (`.github/workflows/ci.yml`). A verificacao local possivel — os dois `sh -c` de grep estrutural das Tasks 1 e 2 (`PRODUTOS_UPLOAD_OK`, `CRON_D05_OK`) e um `node --input-type=module` direto contra `src/lib/storage-policy.ts` real (nao uma copia) validando `deveRecusarUpload`/`exigeStorageDuravel` nos tres cenarios de producao/desenvolvimento — rodaram com sucesso.
- Na primeira tentativa do comentario D-05 na Task 2, o texto citava `cleanupMinIOPrefix()` por extenso, o que fez o grep de contagem (`grep -c cleanupMinIOPrefix`) encontrar 3 ocorrencias em vez de 2 e falhar o `<verify>`. Corrigido reescrevendo o comentario para descrever a funcao sem repetir o identificador literal ("a funcao de housekeeping abaixo"), preservando o mesmo conteudo informativo. Sem impacto em codigo de producao — o unico arquivo afetado foi o proprio comentario.

## Known Stubs

Nenhum. Ambas as rotas tem caminho de dados real; o fallback de desenvolvimento nao e stub (comportamento pre-existente e intencional, documentado em D-01 do plano 05-01).

## User Setup Required

Ver "Acoes humanas pendentes" abaixo — esta e a unica secao desta fase (05-01 a 05-04) com configuracao externa pendente, e ela e o que fecha a fase inteira.

## Ações humanas pendentes

Nenhum destes comandos foi executado por este agente. Sao proibidos pelas restricoes explicitas desta execucao (nunca `kubectl`, `argocd`, `aws`, ou qualquer escrita no banco). O André precisa executa-los, nesta ordem, para fechar STO-01, STO-02 e STO-05.

**Pre-requisito:** os commits desta fase (05-01 a 05-04) precisam estar no branch `nextjs-migration` e o CI verde (`.github/workflows/ci.yml`, que roda `npx vitest run`). Se o CI estiver vermelho, parar aqui — os testes desta fase (incluindo os dois criados neste plano) nunca rodaram localmente nesta maquina; o CI e o unico gate automatico que os executa de fato.

### 1. Criar os secrets no AWS SSM (regiao `sa-east-1`)

Runbook completo em `deploy/bfx/README.md`. Resumo:

- Criar o parametro `SecureString` `/softlive/bfx/prod/secrets/bfx-minio-secrets` com o JSON:
  ```json
  { "MINIO_ROOT_USER": "<usuario-forte>", "MINIO_ROOT_PASSWORD": "<senha-forte-nova>" }
  ```
  Nao reaproveitar `minioadmin` do `docker-compose.yml` (ver T-05-14 no threat model do plano).
- Acrescentar ao JSON ja existente de `/softlive/bfx/prod/secrets/bfx-app-secrets` as chaves:
  ```json
  {
    "MINIO_ENDPOINT": "http://bfx-minio:9000",
    "MINIO_ACCESS_KEY": "<mesmo usuario acima>",
    "MINIO_SECRET_KEY": "<mesma senha acima>",
    "MINIO_BUCKET": "produtos",
    "MINIO_PUBLIC_URL": "https://bfx.softlive.dev"
  }
  ```

**O que prova sucesso:** os dois parametros existem no AWS Systems Manager -> Parameter Store (console ou `aws ssm get-parameter --name ... --with-decryption`, rodado pelo André, nao pelo agente) e nao ha erro de permissao/sintaxe JSON.

### 2. Sincronizar a aplicacao `bfx` no ArgoCD

Sincronizar (manual ou automatico) a aplicacao `bfx` para que o ArgoCD aplique os manifestos ja escritos no plano 05-02 (`deploy/bfx/minio.yaml`, `deploy/bfx/externalsecret-minio.yaml`, kustomization atualizado).

**O que prova sucesso:** a aplicacao `bfx` no ArgoCD UI mostra `Synced` e `Healthy`.

### 3. Conferir o provisionamento

```
kubectl -n bfx get pvc bfx-minio-data
kubectl -n bfx get pods -l app=bfx-minio
kubectl -n bfx get externalsecret bfx-minio-secrets
```

**O que prova sucesso:** PVC em `Bound`; pod do MinIO em `Running`; ExternalSecret em `SecretSynced`. O pod `bfx-app` deve ter reiniciado sozinho (Reloader) e passar a enxergar as vars `MINIO_*`.

### 4. Subir uma logo de teste

Entrar em `https://bfx.softlive.dev/configuracoes`, aba **Recibo**, escolher um PNG e clicar em "Enviar logo".

**O que prova sucesso:** a resposta do upload e 200 (nao 503) e a previa "Logo atual" na propria tela mostra a imagem.

### 5. Conferir os tres leitores (STO-05)

- `https://bfx.softlive.dev/configuracoes` — previa "Logo atual" mostra a imagem.
- `https://bfx.softlive.dev/catalogo` — logo aparece no cabecalho do PDF.
- Abrir o PDF de um recibo existente — logo aparece no topo.
- No inspetor do navegador, a URL da imagem deve comecar com `https://bfx.softlive.dev/produtos/logo/`.

**O que prova sucesso:** os tres leitores mostram a imagem sem link quebrado, e a URL inspecionada bate com o prefixo esperado.

### 6. A prova de STO-01 — sobreviver ao ciclo de vida do pod

```
kubectl -n bfx delete pod -l app=bfx-app
```

Esperar o pod voltar a `Running`, recarregar `/configuracoes` e `/catalogo`.

**O que prova sucesso:** a logo continua aparecendo nos dois lugares (nao ha regressao para o disco efemero do pod recriado).

```
kubectl -n bfx delete pod -l app=bfx-minio
```

Esperar voltar a `Running`, recarregar de novo.

**O que prova sucesso:** a logo continua aparecendo — isso prova que o PVC (`bfx-minio-data`) segurou os objetos, e nao o filesystem de um pod especifico. Este e o objetivo inteiro da Fase 5; se este passo falhar, a fase nao pode ser considerada concluida independentemente dos demais passos.

### 7. Conferir que o console administrativo do MinIO nao esta exposto

Abrir `https://bfx.softlive.dev/produtos` no navegador.

**O que prova sucesso:** a resposta serve objetos do bucket (ou 403/404 para um path invalido), e NUNCA a interface administrativa do MinIO (console roda na porta 9001, que nao foi publicada no Ingress).

### 8. (Opcional) Conferir a recusa explicita em producao (STO-04)

Nao ha como testar isso em producao sem quebrar a configuracao de proposito, e isso nao deve ser feito na aplicacao real. O comportamento ja esta travado pelos testes `src/__tests__/upload-logo-route.test.ts` (plano 05-01) e `src/__tests__/produtos-upload-route.test.ts` (este plano), que rodam no CI. Nenhuma acao necessaria alem de confirmar que o CI esta verde.

---

**Se qualquer passo falhar:** descrever qual numero de passo e o que apareceu (mensagem de erro, status do pod/PVC/ExternalSecret, screenshot se visual) para que a proxima sessao possa diagnosticar. O passo 6 e o unico que prova STO-01 de fato — se ele falhar, a fase inteira permanece em aberto independentemente dos demais passos terem passado.

## Next Phase Readiness

- Codigo e testes das duas rotas de upload e do cron estao completos e identicos em padrao ao resto da fase (guarda de producao replicada, trava de regressao sem mudanca de comportamento).
- STO-04 e STO-06 estao satisfeitos pelo codigo + teste neste plano (pendente apenas da confirmacao do CI, que nao roda localmente nesta maquina — mesma limitacao de todos os planos anteriores da fase).
- STO-01, STO-02 e STO-05 permanecem pendentes ate o runbook acima ser executado pelo André — a fase so pode ser fechada apos o passo 6 (sobrevivencia ao `delete pod`) ser confirmado.
- Nenhum bloqueador tecnico para a proxima fase (Fase 6 — Integridade de dados): a Fase 6 nao depende tecnicamente da Fase 5, apenas segue a ordem de execucao definida por risco de dados (ROADMAP.md).

---
*Phase: 05-storage-dur-vel-minio-no-cluster*
*Completed: 2026-08-03*

## Self-Check: PASSED

Os 4 arquivos de codigo/teste (2 modificados, 2 criados) e o proprio SUMMARY.md foram confirmados presentes no filesystem; os 2 hashes de commit (`16ce04c`, `b5041d8`) foram confirmados presentes em `git log --oneline --all`.
