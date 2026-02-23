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

## Deploy

```bash
kubectl apply -k deploy/bfx
```

ou com ArgoCD/kustomize conforme sua pipeline.
