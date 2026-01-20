# 📤 Upload Manual - Hostgator (Build Estático)

## ⚠️ IMPORTANTE: Limitação

**Build estático NÃO roda APIs** (`/api/*`). Isso significa:
- ❌ Admin não funciona
- ❌ Webhook do Pagar.me não funciona
- ❌ Checkout não funciona
- ❌ Carrinho não funciona
- ✅ Site público funciona (landing, loja, produtos)

**Solução:** Deploy as APIs em outro lugar (Vercel gratuito) e use subdomínio ou path.

---

## 📦 Passo 1: Build Estático Local

### 1.1 Ajustar `next.config.ts`

```bash
# O arquivo já está configurado, mas se precisar ajustar:
```

Arquivo `next.config.ts` deve ter:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'export', // Força build estático
  images: {
    unoptimized: true, // Necessário para estático
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zdqpkbiydrfoojlnaaux.supabase.co",
      },
    ],
  },
};

export default nextConfig;
```

### 1.2 Fazer Build

```bash
npm run build
```

Isso cria a pasta **`out/`** com todos os arquivos HTML/CSS/JS estáticos.

---

## 📁 Passo 2: Preparar Arquivos para Upload

A pasta `out/` terá esta estrutura:

```
out/
├── index.html
├── _next/
│   ├── static/
│   └── ...
├── assets/
├── loja/
│   ├── index.html
│   └── [slug]/
├── admin/
│   └── index.html
└── ...
```

---

## 🔌 Passo 3: Upload via FTP

### 3.1 Dados FTP

- **Host:** `69.212.106` ou `solidchoice.com.br`
- **Usuário:** (seu usuário FTP)
- **Senha:** (sua senha FTP)
- **Porta:** 21

### 3.2 Via FileZilla (ou similar)

1. Abra FileZilla
2. Conecte usando os dados acima
3. Navegue até `/public_html/`
4. **DELETE tudo** de dentro (ou faça backup antes)
5. Faça upload de **TODO o conteúdo** da pasta `out/`
   - Selecione tudo dentro de `out/`
   - Arraste para `/public_html/`
   - Não arraste a pasta `out`, só o **conteúdo** dela!

### 3.3 Estrutura Final no Servidor

```
/public_html/
├── index.html
├── _next/
├── assets/
├── loja/
└── ...
```

---

## ⚙️ Passo 4: Configurar Domínio (cPanel)

1. Acesse **cPanel → Domínios**
2. Verifique se `solidchoice.com.br` está apontando para `/public_html`
3. Se não estiver, adicione o domínio apontando para `/public_html`

---

## ✅ Passo 5: Testar

Acesse:
- `https://solidchoice.com.br` → Landing
- `https://solidchoice.com.br/loja` → Loja
- `https://solidchoice.com.br/admin` → Admin (vai dar erro, pois APIs não funcionam)

---

## 🔧 Passo 6: APIs em Vercel (Solução Completa)

Para fazer as APIs funcionarem:

### 6.1 Deploy APIs na Vercel

1. Crie uma pasta `api/` na raiz do projeto
2. Copie todas as rotas `/api/*` para essa pasta
3. Deploy na Vercel apontando só para `api/`
4. Vercel vai gerar URL tipo: `https://solidchoice-api.vercel.app`

### 6.2 Ajustar URLs no Código

No código, substitua chamadas `/api/` por:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://solidchoice-api.vercel.app';
```

### 6.3 Atualizar Webhook Pagar.me

```
https://solidchoice-api.vercel.app/api/webhooks/pagarme?token=solidchoice-webhook-2026
```

---

## 📝 Checklist Final

- [ ] Build feito (`npm run build`)
- [ ] Pasta `out/` criada
- [ ] Upload via FTP para `/public_html/`
- [ ] Domínio configurado no cPanel
- [ ] Site acessível em `https://solidchoice.com.br`
- [ ] (Opcional) APIs deployadas em Vercel

---

## 🆘 Problemas Comuns

### Erro 404 nas páginas
- Verifique se fez upload de **todo conteúdo** de `out/`
- Não esqueça a pasta `_next/`

### Imagens não carregam
- Verifique se pasta `assets/` foi enviada
- Confirme URLs no código (devem ser relativas, não absolutas)

### CSS não funciona
- Verifique se pasta `_next/static/` foi enviada
- Limpe cache do navegador (Ctrl+Shift+R)

---

**Última atualização:** Janeiro 2026
