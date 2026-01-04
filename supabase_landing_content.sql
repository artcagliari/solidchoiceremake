-- Landing page texts (admin editable)
-- Rode no Supabase SQL Editor

create table if not exists landing_content (
  key text primary key,
  content jsonb not null,
  updated_at timestamptz not null default now()
);

-- opcional: auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_landing_content_updated_at on landing_content;
create trigger trg_landing_content_updated_at
before update on landing_content
for each row execute procedure set_updated_at();

-- Insere o conteúdo padrão (se não existir)
insert into landing_content (key, content)
values (
  'default',
  '{
    "whatsappLink": "https://wa.me/5554992739597?text=Quero%20importar%20com%20a%20Solid%20Choice",
    "intro": {
      "badge": "Fugazzi culture · Cinematic intro",
      "title": "Qualidade, Exclusividade e Garantia Total",
      "subtitle": "Bem-vindo à Solid Choice. A Solid busca, você aprova, e o produto chega até você. Simples assim.",
      "ctaEnter": "Entrar na experiência",
      "ctaWhatsapp": "Falar no WhatsApp"
    },
    "nav": {
      "brandTitle": "Solid Choice",
      "brandSubtitle": "Fugazzi Culture · Since 2017",
      "loginLabel": "Login",
      "loggedInLabel": "Logado",
      "logoutLabel": "Sair",
      "lojaLabel": "Loja",
      "etapasLabel": "Ver etapas",
      "whatsappLabel": "Falar com a Solid"
    },
    "hero": {
      "badge": "Landing · Vitrine de conversão",
      "title": "Qualidade, Exclusividade e Garantia Total",
      "subtitle": "A Solid busca, você aprova, e o produto chega até você. Cada passo é personalizado para entregar luxo, precisão e zero dor de cabeça.",
      "ctaSpecialist": "Falar com especialista",
      "ctaCatalog": "Ver catálogo aberto",
      "imageAlt": "Solid Choice Preview",
      "imageCaption": "Cinematic landing · Deep blue + cream"
    },
    "diferencial": {
      "badge": "Seção 01 · O Diferencial",
      "title": "O que é o Redirecionamento Solid",
      "subtitle": "Compra assistida direto da China, do seu jeito. Cada cliente é único: da réplica top tier ao custo-benefício perfeito, ou aquele item que parecia impossível de encontrar."
    },
    "processo": {
      "badge": "Seção 02 · Como funciona",
      "title": "Do pedido ao seu endereço, em 4 passos simples",
      "helpCta": "Preciso de ajuda"
    },
    "vitrine": {
      "badge": "Seção 04 · Mais vendidos",
      "title": "Vitrine Hero · produtos mais desejados",
      "subtitle": "Um teaser curado das peças que convertem. O catálogo completo segue logo abaixo.",
      "ctaCatalog": "Acessar catálogo completo",
      "emptyFallback": "Nenhum produto para exibir aqui ainda. Confira o catálogo completo."
    },
    "seguranca": {
      "badge": "Seção 06 · Segurança total",
      "title": "Garantias e segurança total · a Solid assume tudo",
      "subtitle": "Selos de confiança, processos claros e cobertura completa para você importar sem risco."
    },
    "feedbacks": {
      "badge": "Feedbacks reais · Prova social",
      "title": "Clientes que já importaram com a Solid",
      "subtitle": "Capturas de atendimento e entregas confirmam a experiência segura, humana e transparente.",
      "prev": "Anterior",
      "next": "Próximo",
      "proofLabel": "Prova social"
    },
    "faq": {
      "badge": "Perguntas Frequentes · Solid Choice",
      "title": "Tudo o que você precisa saber",
      "subtitle": "Transparência total: prazos, garantias, pagamentos e suporte.",
      "ctaWhatsapp": "Falar com a Solid"
    },
    "ctaFinal": {
      "badge": "Seção 07 · CTA final",
      "title": "Quer importar com segurança, transparência e suporte real?",
      "subtitle": "A Solid Choice combina estética cinematográfica com operação high-end: UX/UI refinado, dados no Supabase e performance otimizada.",
      "ctaWhatsapp": "Falar com a Solid via WhatsApp",
      "ctaCatalog": "Ver catálogo",
      "imageAlt": "Contato Solid Choice",
      "imageCaption": "Atendimento humano · Resposta rápida"
    },
    "highlights": [
      {
        "title": "Compra assistida premium",
        "description": "Curadoria sob medida direto do mercado interno chinês, com aprovação por fotos reais antes de qualquer pagamento."
      },
      {
        "title": "Escala e rareza",
        "description": "Acesso a milhões de opções: réplicas top tier, custo-benefício e achados exclusivos que não aparecem em catálogos comuns."
      },
      {
        "title": "Suporte humano de ponta a ponta",
        "description": "A Solid busca, você aprova, nós garantimos o envio. Transparência total, sem taxas ocultas."
      }
    ],
    "steps": [
      {
        "title": "Você escolhe",
        "description": "Conta o que deseja; buscamos, mostramos opções reais (catálogo ou histórico) e você aprova."
      },
      {
        "title": "Chega no armazém",
        "description": "Em 7 a 10 dias o item chega ao nosso armazém na China. Enviamos fotos reais do produto."
      },
      {
        "title": "Você aprova ou troca",
        "description": "Não curtiu? Solicite troca ou reembolso com total liberdade. Só avançamos se você estiver satisfeito."
      },
      {
        "title": "A Solid envia",
        "description": "Com aprovação e dados confirmados, despachamos para o Brasil. Em média, 15 dias depois, o produto está na sua porta."
      }
    ],
    "guarantees": [
      {
        "title": "Produto garantido",
        "description": "Enviamos exatamente como você aprovou, com base nas fotos recebidas do armazém.",
        "icon": "/assets/icon-shield.png"
      },
      {
        "title": "Preço final é o que você paga",
        "description": "Sem taxas extras. A Solid cobre eventuais custos de importação para você.",
        "icon": "/assets/icon-money.png"
      },
      {
        "title": "Seguro contra extravio",
        "description": "Se o pacote for negado ou extraviado, refazemos a compra. Você não perde dinheiro.",
        "icon": "/assets/icon-truck.png"
      }
    ],
    "faqs": [
      {
        "question": "Como posso rastrear meu pedido?",
        "answer": "Assim que confirmamos a compra, você recebe o código de rastreio por e-mail e WhatsApp. Os status também ficam na área logada em “Meus Pedidos”."
      },
      {
        "question": "Os produtos possuem nota fiscal?",
        "answer": "Sim. Emitimos nota fiscal da compra. Todo item aprovado e enviado sai com documentação para garantir a procedência."
      },
      {
        "question": "Quais formas de pagamento vocês aceitam?",
        "answer": "Pix com 10% OFF, cartão em até 6x sem juros, ou até 12x com juros mínimo. Para drops especiais, confirmamos no WhatsApp."
      },
      {
        "question": "Qual o prazo de entrega?",
        "answer": "Após sua aprovação, o item leva em média 7 a 10 dias para chegar ao armazém na China. Depois de aprovado e despachado, são ~15 dias para chegar no Brasil. Há frete grátis (7-18 dias úteis) e expresso (5-12 dias úteis)."
      },
      {
        "question": "Os produtos possuem garantia?",
        "answer": "Garantia de 30 dias contra defeitos de fábrica a partir do recebimento. Se algo não estiver ok, nossa equipe resolve com troca ou reembolso conforme o caso."
      },
      {
        "question": "Qual o prazo para troca ou devolução?",
        "answer": "Você tem 7 dias corridos após o recebimento para solicitar troca ou devolução, conforme o Código de Defesa do Consumidor (CDC)."
      },
      {
        "question": "Como falar com a Solid?",
        "answer": "Pelo WhatsApp oficial, pelo e-mail comercial ou pelo suporte integrado no site. Resposta humana e rápida para manter o fluxo transparente."
      }
    ]
  }'::jsonb
)
on conflict (key) do nothing;


