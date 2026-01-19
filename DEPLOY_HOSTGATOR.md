# Guia de Deploy - Solid Choice na Hostgator

## 📋 Pré-requisitos

1. **Hostgator Cloud/VPS** (com suporte a Node.js) ou **Hostgator Compartilhada** (com PHP)
2. Acesso SSH (para Cloud/VPS) ou FTP
3. Domínio configurado: `solidchoice.com.br`

---

## 🚀 Opção 1: Hostgator Cloud/VPS (Recomendado)

### Passo 1: Conectar via SSH

```bash
ssh usuario@seu-ip-hostgator
```

### Passo 2: Instalar Node.js 18+

```bash
# Atualizar sistema
sudo apt update

# Instalar Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar versão
node -v  # deve ser 18+
npm -v
```

### Passo 3: Instalar PM2 (gerenciador de processos)

```bash
sudo npm install -g pm2
```

### Passo 4: Fazer upload dos arquivos

Via FTP ou SCP, envie todos os arquivos do projeto para:
```
/home/usuario/public_html/solidchoice
```

**Arquivos importantes:**
- `package.json`
- `package-lock.json`
- `next.config.ts`
- `tsconfig.json`
- `src/`
- `public/`
- `.env.production` (criar com variáveis de ambiente)

### Passo 5: Criar arquivo `.env.production`

```bash
cd /home/usuario/public_html/solidchoice
nano .env.production
```

Cole as variáveis:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
PAGARME_SECRET_KEY=sk_sua_chave_pagarme
PAGARME_WEBHOOK_TOKEN=solidchoice-webhook-2026
NEXT_PUBLIC_SITE_URL=https://solidchoice.com.br
```

Salve (Ctrl+O, Enter, Ctrl+X).

### Passo 6: Instalar dependências e build

```bash
cd /home/usuario/public_html/solidchoice
npm install --production=false
npm run build
```

### Passo 7: Iniciar com PM2

```bash
# Iniciar aplicação
pm2 start npm --name "solidchoice" -- start

# Salvar configuração
pm2 save

# Configurar PM2 para iniciar no boot
pm2 startup
# (siga as instruções que aparecerem)
```

### Passo 8: Configurar Nginx/Apache (proxy reverso)

Se tiver Nginx, crie `/etc/nginx/sites-available/solidchoice`:

```nginx
server {
    listen 80;
    server_name solidchoice.com.br www.solidchoice.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Depois:

```bash
sudo ln -s /etc/nginx/sites-available/solidchoice /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Passo 9: Configurar SSL (HTTPS)

```bash
sudo certbot --nginx -d solidchoice.com.br -d www.solidchoice.com.br
```

---

## 🌐 Opção 2: Hostgator Compartilhada (Build Estático)

**⚠️ Limitação:** APIs não funcionam (precisa usar Vercel/Netlify para APIs ou configurar outra solução).

### Passo 1: Ajustar `next.config.ts`

```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Força build estático
  images: {
    unoptimized: true, // Necessário para build estático
  },
};

module.exports = nextConfig;
```

### Passo 2: Build local

```bash
npm run build
```

Isso gera a pasta `out/` com arquivos estáticos.

### Passo 3: Upload via FTP

Envie o conteúdo da pasta `out/` para:
```
/public_html/
```

**Estrutura:**
```
/public_html/
  ├── index.html
  ├── _next/
  └── assets/
```

### Passo 4: Configurar domínio no cPanel

1. Acesse cPanel → **Domínios**
2. Adicione `solidchoice.com.br` apontando para `/public_html`

---

## ⚙️ Configurações Pós-Deploy

### 1. Atualizar Webhook do Pagar.me

1. Acesse Pagar.me → **Configurações → Webhooks**
2. Edite o webhook existente
3. Altere a URL para:
   ```
   https://solidchoice.com.br/api/webhooks/pagarme?token=solidchoice-webhook-2026
   ```
4. Salve

### 2. Verificar variáveis de ambiente

Confirme que todas estão configuradas:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAGARME_SECRET_KEY`
- `PAGARME_WEBHOOK_TOKEN`
- `NEXT_PUBLIC_SITE_URL`

### 3. Testar endpoints

Após deploy, teste:
- `https://solidchoice.com.br` (site principal)
- `https://solidchoice.com.br/api/admin/me` (deve retornar erro 401, não 500)

---

## 🔄 Atualizações Futuras

### Via SSH (Cloud/VPS):

```bash
cd /home/usuario/public_html/solidchoice
git pull  # se usar Git
npm install
npm run build
pm2 restart solidchoice
```

### Via FTP (Compartilhada):

1. Faça build local (`npm run build`)
2. Envie nova pasta `out/` substituindo a anterior

---

## 🆘 Troubleshooting

### PM2 não inicia
```bash
pm2 logs solidchoice  # Ver logs
pm2 restart solidchoice
```

### Porta 3000 não acessível
Verifique firewall:
```bash
sudo ufw allow 3000
```

### Erro 502 Bad Gateway
- Confirme que PM2 está rodando: `pm2 list`
- Verifique se a porta está correta no Nginx
- Veja logs: `pm2 logs solidchoice`

### APIs não funcionam (build estático)
Use **Opção 1 (Cloud/VPS)** ou migre para **Vercel/Netlify**.

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique logs: `pm2 logs solidchoice`
2. Confirme variáveis de ambiente
3. Teste endpoints individualmente

---

**Última atualização:** Janeiro 2026
