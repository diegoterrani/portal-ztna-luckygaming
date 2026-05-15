# Portal ZTNA Lucky Gaming

Portal web de acesso Zero Trust para ambientes Lucky Gaming.

## Estrutura do diretório

- `src/`: código React/Tailwind do portal.
- `deploy/nginx.conf`: configuração Nginx para servir SPA com cache adequado.
- `scripts/build-prod.sh`: build de produção com `VITE_GIT_COMMIT`.
- `scripts/deploy-prod-local.sh`: fluxo completo de deploy local em produção.
- `scripts/install-admin-api-service.sh`: instala API administrativa como serviço systemd.
- `server/admin-api.mjs`: API de administração (apps, métricas, auditoria, alertas, branding).
- `data/*.json`: persistência local de aplicações, branding e fluxo de marcas.
- `dist/`: artefatos gerados no build (não versionado).

## Pré-requisitos

- Node.js 20+
- Nginx instalado e ativo
- Site de produção apontando para `/var/www/zta-portal`
- Permissão de `sudo` para sincronizar arquivos e recarregar Nginx

## Desenvolvimento local

1. Instalar dependências:
   - `npm install`
2. Rodar ambiente dev:
   - `npm run dev`

## Build de produção

Gera os artefatos em `dist/` com hash de commit embutido:

- `npm run build:prod`

Opcionalmente, para forçar um SHA:

- `VITE_GIT_COMMIT=<sha> npm run build:prod`

## Deploy em produção local (`/opt`)

Este projeto publica os arquivos estáticos em:

- origem: `/opt/portal-ztna-luckygaming/dist/`
- destino: `/var/www/zta-portal/`

Comando único (recomendado):

- `npm run deploy:prod:local`

O script executa:

1. `npm run lint`
2. build de produção (`scripts/build-prod.sh`)
3. `rsync --delete dist/ -> /var/www/zta-portal/`
4. `nginx -t` e `systemctl reload nginx`

## API administrativa (dados reais + persistência)

### O que ela fornece

- `GET /api/admin/metrics`: CPU, memória e disco reais do host + histórico.
- `GET /api/admin/apps`: lista de aplicações persistida em `data/apps.json`.
- `POST /api/admin/apps` e `PUT /api/admin/apps/:id`: criação/edição de aplicações.
- `GET /api/admin/access`: contadores por aplicação com base nos logs do Pomerium.
- `GET /api/admin/audit`: log transacional em tempo quase real (journal do Pomerium).
- `GET /api/admin/alerts`: alertas derivados de métricas e negações.
- `PUT /api/admin/settings/logo`: atualização do logo/branding da Hold.
- `GET /api/public/branding`: branding público consumido no header do portal.

### Subir a API como serviço

1. Instalar e iniciar serviço:
   - `bash ./scripts/install-admin-api-service.sh`
2. Verificar status:
   - `sudo systemctl status portal-admin-api --no-pager`

### Regras de acesso (Pomerium)

Recomenda-se manter rotas com precedência:

- `/api/admin` → somente `diego.terrani@luckygaming.com.br` (Super-Admin)
- `/super-admin` → somente `diego.terrani@luckygaming.com.br` (Super-Admin)
- `/api/public` → mesma política de domínio do portal

## Verificação pós-deploy

- Conferir se o `index.html` publicado aponta para novos assets hashados em `/var/www/zta-portal`.
- Fazer hard refresh no navegador (`Ctrl+F5`) para invalidar cache local.

## Troubleshooting rápido

- **Mudança não aparece**: verificar cache de navegador/CDN e confirmar hash do asset novo.
- **Erro de permissão no deploy**: validar acesso `sudo` para `rsync` e reload do Nginx.
- **Nginx não recarrega**: rodar `sudo nginx -t` e corrigir configuração antes do reload.
