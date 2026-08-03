# BFX - Kubernetes (K8s)

Manifests para deploy do Sistema BFX em Kubernetes.

## Recursos

- **Deployment** + **Service**: aplicação Next.js
- **PostgreSQL**: StatefulSet com volume persistente
- **Ingress**: roteamento externo (Traefik)
- **CronJob** `bfx-cleanup-uploads`: limpeza de uploads antigos (domingos 03:00 UTC)

## Variáveis de ambiente (CRON)

O CronJob chama o endpoint `/api/cron/cleanup-uploads` para remover arquivos não referenciados em `public/uploads/` com mais de 90 dias.

Configure em `secrets.yaml` (ou via Sealed Secrets / External Secrets):

```yaml
CRON_SECRET: "valor-aleatorio-forte-min-32-caracteres"
```

O mesmo valor deve estar em `bfx-app-secrets` (validação na API) e é usado pelo CronJob no header `Authorization: Bearer <CRON_SECRET>`.

## MinIO (storage de uploads)

`deploy/bfx/minio.yaml` cria, no namespace `bfx`:

- **Deployment** `bfx-minio` (1 réplica, `strategy: Recreate` — obrigatório com PVC `ReadWriteOnce`,
  senão um RollingUpdate trava esperando um segundo pod montar o mesmo volume);
- **PersistentVolumeClaim** `bfx-minio-data` de 10Gi, `storageClassName: microk8s-hostpath`, com as
  anotações de retenção `argocd.argoproj.io/sync-options: "Delete=false,Prune=false"` e
  `helm.sh/resource-policy: keep` — as mesmas do PVC do postgres. Sem essas anotações o ArgoCD pode
  apagar o volume num prune;
- **Service** `bfx-minio` com as portas `9000` (api) e `9001` (console — não exposto por Ingress).

### Parâmetro SSM novo: `bfx-minio-secrets`

`deploy/bfx/externalsecret-minio.yaml` materializa o Secret `bfx-minio-secrets` a partir de um
parâmetro SecureString novo no SSM (sa-east-1):

```
/softlive/bfx/prod/secrets/bfx-minio-secrets
```

Formato do JSON (sem valores aqui — apenas o formato):

```json
{
  "MINIO_ROOT_USER": "...",
  "MINIO_ROOT_PASSWORD": "..."
}
```

### Chaves a acrescentar em `bfx-app-secrets`

O JSON já existente em `/softlive/bfx/prod/secrets/bfx-app-secrets` precisa ganhar cinco chaves
novas (os três primeiros valores abaixo não são secretos, os dois últimos repetem o root
user/password do parâmetro acima):

```
MINIO_ENDPOINT=http://bfx-minio:9000
MINIO_BUCKET=produtos
MINIO_PUBLIC_URL=https://bfx.softlive.dev
MINIO_ACCESS_KEY=<mesmo valor de MINIO_ROOT_USER>
MINIO_SECRET_KEY=<mesmo valor de MINIO_ROOT_PASSWORD>
```

### Ordem de aplicação

1. Criar o parâmetro `bfx-minio-secrets` e acrescentar as cinco chaves acima em `bfx-app-secrets`
   no SSM **antes** do sync — o Deployment do MinIO não sobe sem o Secret (`envFrom` falha se o
   Secret não existir).
2. Sincronizar a aplicação `bfx` no ArgoCD para criar PVC, Deployment, Service e ExternalSecret.

Para aplicar uma mudança de credencial na hora, sem esperar o `refreshInterval: 1h` do
ExternalSecret (referência para o André — não é ação do agente):

```bash
kubectl annotate externalsecret bfx-minio-secrets -n bfx force-sync=$(date +%s) --overwrite
```

### Restrição

**Não criar uma página Next em `/produtos`.** O Ingress roteia esse path para o MinIO
(`bfx-minio:9000`) e o Traefik resolve pelo prefixo mais longo — uma rota Next em `/produtos`
competiria com o path do MinIO. O console de administração (porta 9001) fica de fora de propósito,
alcançável só via `kubectl port-forward`.

## Deploy

```bash
kubectl apply -k deploy/bfx
```

ou com ArgoCD/kustomize conforme sua pipeline.
