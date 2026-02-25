# Kubernetes (k8s) – sitema-bfx

Manifests para rodar o app em um cluster Kubernetes.

## Pré-requisitos

- Cluster Kubernetes (minikube, kind, GKE, EKS, AKS, etc.)
- `kubectl` configurado
- Imagem Docker do app (build a partir do projeto e envie para seu registry)

## Variáveis de ambiente (mesmas da Vercel)

As mesmas chaves usadas na Vercel devem ser configuradas no cluster via **Secret** (e opcionalmente ConfigMap). Ver **docs/VERCEL-TODAS-AS-CHAVES.md** para a lista completa.

Obrigatórias no Secret:

- `DATABASE_URL`
- `SESSION_SECRET`

Opcionais: `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`, `ASAAS_API_KEY`, `ASAAS_ENV`, `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`.

## Ordem de aplicação

```bash
# 1. Criar namespace
kubectl apply -f namespace.yaml

# 2. Criar Secret (não commitar secret.yaml com valores reais)
# Edite secret.yaml.example, salve como secret.yaml com seus valores
kubectl apply -f secret.yaml

# 3. (Opcional) ConfigMap para variáveis não sensíveis
# kubectl apply -f configmap.yaml

# 4. Deployment e Service
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml

# 5. (Opcional) Ingress para expor com domínio/TLS
# kubectl apply -f ingress.yaml
```

## Build da imagem

Exemplo com Docker (crie um `Dockerfile` na raiz se ainda não existir):

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock* package-lock.json* ./
RUN npm ci || yarn install --frozen-lockfile
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

Para Next.js standalone, ative em `next.config.js`: `output: 'standalone'`. Depois:

```bash
docker build -t sitema-bfx:latest .
docker tag sitema-bfx:latest seu-registry/sitema-bfx:latest
docker push seu-registry/sitema-bfx:latest
```

No `deployment.yaml`, use `image: seu-registry/sitema-bfx:latest`.

## Migrações do banco

Rode as migrações Prisma **uma vez** apontando para o mesmo Postgres que o cluster usa (mesma `DATABASE_URL` do Secret). Ver **docs/ONDE-ESTA-DATABASE-URL.md**.

## Arquivos

| Arquivo | Uso |
|---------|-----|
| `namespace.yaml` | Namespace `sitema-bfx` |
| `secret.yaml.example` | Modelo do Secret; copie para `secret.yaml` e preencha (não commitar) |
| `configmap.yaml.example` | Modelo de ConfigMap opcional |
| `deployment.yaml` | Deployment do app (atualize a imagem) |
| `service.yaml` | Service ClusterIP na porta 80 → 3000 |
| `ingress.yaml.example` | Exemplo de Ingress (domínio/TLS); renomeie e ajuste |
