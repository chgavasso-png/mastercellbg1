# MasterCell

Loja virtual + painel administrativo para loja de celulares, acessórios e assistência técnica.
React + TypeScript + Vite, organizado em **plugins**: cada funcionalidade é uma pasta independente.

```bash
npm install
npm run dev        # http://localhost:5173  ·  painel em /admin
npm run build
```

Acesso ao painel no modo local (sem Supabase): `admin@master.cell` / `master123`. Com Supabase, o login é o do usuário administrador.

## Cores a partir do logo

`npm run palette` lê a primeira imagem de `assets/` e gera `src/styles/palette.css`.
Roda só quando você chama — assim trocar o logo não muda as cores do site sem querer.

## Estrutura

```
src/
  core/        registro de plugins, eventos, armazenamento, formatação
  domain/      tipos, dados de exemplo e regras (carrinho, pedidos, cadastro)
  site/        layout da loja, home, carrinho
  admin/       layout do painel, dashboard e componentes de tabela/cards
  ui/          peças visuais compartilhadas (modal, gráficos, arte dos produtos)
  plugins/
    catalogo/    vitrine (site) + gestão de produtos
    vendas/      checkout + pedidos, PDV de balcão e compras de fornecedor
    financeiro/  faturamento, despesas, DRE e exportação CSV
    logistica/   quadro de entregas (arrastar e soltar)
    instagram/   vitrine do Instagram na home
    promocoes/   pop-up de promoção com cupom
    manutencao/  pedido de conserto + ordens de serviço
    clientes/    cadastro, login, área do cliente + lista no painel
    identidade/  paleta, botões e selos da marca
public/brand/  logo, ícone, selos e padrão de fundo (SVG)
```

## Criando um plugin

Crie `src/plugins/<nome>/index.tsx`. Ele é carregado automaticamente.

```tsx
import { Gift } from "lucide-react";
import { definePlugin } from "@/core/plugins";
import { events } from "@/core/events";

export default definePlugin({
  id: "fidelidade",
  name: "Programa de fidelidade",
  routes: [{ path: "pontos", element: <Pontos />, nav: { label: "Pontos", order: 30 } }],
  admin: [{ path: "fidelidade", label: "Fidelidade", icon: Gift, group: "Marketing", element: <Painel /> }],
  slots: { "site.home.after-hero": [BannerPontos] },
  setup: () => events.on("order:created", (order) => { /* … */ }),
});
```

- **routes** – páginas da loja (com item opcional no menu)
- **admin** – páginas do painel, agrupadas na barra lateral, com `badge` opcional
- **slots** – encaixes prontos: `site.overlay`, `site.home.after-hero`, `site.home.end`, `site.product.aside`, `admin.dashboard.widgets`
- **setup** – ouvir eventos: `order:created`, `order:status`, `repair:created`, `customer:registered`, `purchase:received`

## Banco de dados (Supabase)

Com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em `.env.local` (modelo em `.env.example`), tudo passa a ser salvo no Supabase.
Sem essas variáveis, o site funciona no modo local (dados no navegador).

1. No Supabase: **SQL Editor → New query**, cole `supabase/schema.sql` e rode.
2. **Authentication → Users → Add user** (marque *Auto Confirm User*) com o e-mail do administrador.
3. No SQL Editor, dê acesso ao painel:
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'SEU-EMAIL';
   ```
4. Entre em `/admin` com esse e-mail. Para começar com a vitrine de exemplo: *módulos ativos → Importar vitrine de exemplo*.

Os dados ficam numa única tabela `records` (coleção + id + JSON), então um plugin novo não precisa criar tabela.
O acesso é controlado por RLS: visitantes leem produtos, promoções e posts; clientes veem só os próprios pedidos;
o administrador (tabela `admins`) vê e edita tudo. Nunca use a chave *secret/service_role* no site.
