export type LandingHighlight = {
  title: string | null;
  description: string | null;
};

export type LandingStep = {
  title: string | null;
  description: string | null;
};

export type LandingGuarantee = {
  title: string | null;
  description: string | null;
  icon: string | null; // path em /public/assets
};

export type LandingFaq = {
  question: string | null;
  answer: string | null;
};

export type LandingContent = {
  whatsappLink: string | null;

  intro: {
    badge: string | null;
    title: string | null;
    subtitle: string | null;
    ctaEnter: string | null;
    ctaWhatsapp: string | null;
  };

  nav: {
    brandTitle: string | null;
    brandSubtitle: string | null;
    loginLabel: string | null;
    loggedInLabel: string | null;
    logoutLabel: string | null;
    lojaLabel: string | null;
    etapasLabel: string | null;
    whatsappLabel: string | null;
  };

  hero: {
    badge: string | null;
    title: string | null;
    subtitle: string | null;
    ctaSpecialist: string | null;
    ctaCatalog: string | null;
    imageAlt: string | null;
    imageCaption: string | null;
  };

  diferencial: {
    badge: string | null;
    title: string | null;
    subtitle: string | null;
  };

  processo: {
    badge: string | null;
    title: string | null;
    helpCta: string | null;
  };

  vitrine: {
    badge: string | null;
    title: string | null;
    subtitle: string | null;
    ctaCatalog: string | null;
    emptyFallback: string | null;
  };

  seguranca: {
    badge: string | null;
    title: string | null;
    subtitle: string | null;
  };

  feedbacks: {
    badge: string | null;
    title: string | null;
    subtitle: string | null;
    prev: string | null;
    next: string | null;
    proofLabel: string | null;
  };

  faq: {
    badge: string | null;
    title: string | null;
    subtitle: string | null;
    ctaWhatsapp: string | null;
  };

  ctaFinal: {
    badge: string | null;
    title: string | null;
    subtitle: string | null;
    ctaWhatsapp: string | null;
    ctaCatalog: string | null;
    imageAlt: string | null;
    imageCaption: string | null;
  };

  highlights: LandingHighlight[];
  steps: LandingStep[];
  guarantees: LandingGuarantee[];
  faqs: LandingFaq[];
};

export const defaultLandingContent: LandingContent = {
  whatsappLink:
    "https://wa.me/5554992739597?text=Quero%20importar%20com%20a%20Solid%20Choice",

  intro: {
    badge: "Fugazzi culture · Cinematic intro",
    title: "Qualidade, Exclusividade e Garantia Total",
    subtitle:
      "Bem-vindo à Solid Choice. A Solid busca, você aprova, e o produto chega até você. Simples assim.",
    ctaEnter: "Entrar na experiência",
    ctaWhatsapp: "Falar no WhatsApp",
  },

  nav: {
    brandTitle: "Solid Choice",
    brandSubtitle: "Fugazzi Culture · Since 2017",
    loginLabel: "Login",
    loggedInLabel: "Logado",
    logoutLabel: "Sair",
    lojaLabel: "Loja",
    etapasLabel: "Ver etapas",
    whatsappLabel: "Falar com a Solid",
  },

  hero: {
    badge: "Landing · Vitrine de conversão",
    title: "Qualidade, Exclusividade e Garantia Total",
    subtitle:
      "A Solid busca, você aprova, e o produto chega até você. Cada passo é personalizado para entregar luxo, precisão e zero dor de cabeça.",
    ctaSpecialist: "Falar com especialista",
    ctaCatalog: "Ver catálogo aberto",
    imageAlt: "Solid Choice Preview",
    imageCaption: "Cinematic landing · Deep blue + cream",
  },

  diferencial: {
    badge: "Seção 01 · O Diferencial",
    title: "O que é o Redirecionamento Solid",
    subtitle:
      "Compra assistida direto da China, do seu jeito. Cada cliente é único: da réplica top tier ao custo-benefício perfeito, ou aquele item que parecia impossível de encontrar.",
  },

  processo: {
    badge: "Seção 02 · Como funciona",
    title: "Do pedido ao seu endereço, em 4 passos simples",
    helpCta: "Preciso de ajuda",
  },

  vitrine: {
    badge: "Seção 04 · Mais vendidos",
    title: "Vitrine Hero · produtos mais desejados",
    subtitle:
      "Um teaser curado das peças que convertem. O catálogo completo segue logo abaixo.",
    ctaCatalog: "Acessar catálogo completo",
    emptyFallback:
      "Nenhum produto para exibir aqui ainda. Confira o catálogo completo.",
  },

  seguranca: {
    badge: "Seção 06 · Segurança total",
    title: "Garantias e segurança total · a Solid assume tudo",
    subtitle:
      "Selos de confiança, processos claros e cobertura completa para você importar sem risco.",
  },

  feedbacks: {
    badge: "Feedbacks reais · Prova social",
    title: "Clientes que já importaram com a Solid",
    subtitle:
      "Capturas de atendimento e entregas confirmam a experiência segura, humana e transparente.",
    prev: "Anterior",
    next: "Próximo",
    proofLabel: "Prova social",
  },

  faq: {
    badge: "Perguntas Frequentes · Solid Choice",
    title: "Tudo o que você precisa saber",
    subtitle: "Transparência total: prazos, garantias, pagamentos e suporte.",
    ctaWhatsapp: "Falar com a Solid",
  },

  ctaFinal: {
    badge: "Seção 07 · CTA final",
    title: "Quer importar com segurança, transparência e suporte real?",
    subtitle:
      "A Solid Choice combina estética cinematográfica com operação high-end: UX/UI refinado, dados no Supabase e performance otimizada.",
    ctaWhatsapp: "Falar com a Solid via WhatsApp",
    ctaCatalog: "Ver catálogo",
    imageAlt: "Contato Solid Choice",
    imageCaption: "Atendimento humano · Resposta rápida",
  },

  highlights: [
    {
      title: "Compra assistida premium",
      description:
        "Curadoria sob medida direto do mercado interno chinês, com aprovação por fotos reais antes de qualquer pagamento.",
    },
    {
      title: "Escala e rareza",
      description:
        "Acesso a milhões de opções: réplicas top tier, custo-benefício e achados exclusivos que não aparecem em catálogos comuns.",
    },
    {
      title: "Suporte humano de ponta a ponta",
      description:
        "A Solid busca, você aprova, nós garantimos o envio. Transparência total, sem taxas ocultas.",
    },
  ],

  steps: [
    {
      title: "Você escolhe",
      description:
        "Conta o que deseja; buscamos, mostramos opções reais (catálogo ou histórico) e você aprova.",
    },
    {
      title: "Chega no armazém",
      description:
        "Em 7 a 10 dias o item chega ao nosso armazém na China. Enviamos fotos reais do produto.",
    },
    {
      title: "Você aprova ou troca",
      description:
        "Não curtiu? Solicite troca ou reembolso com total liberdade. Só avançamos se você estiver satisfeito.",
    },
    {
      title: "A Solid envia",
      description:
        "Com aprovação e dados confirmados, despachamos para o Brasil. Em média, 15 dias depois, o produto está na sua porta.",
    },
  ],

  guarantees: [
    {
      title: "Produto garantido",
      description:
        "Enviamos exatamente como você aprovou, com base nas fotos recebidas do armazém.",
      icon: "/assets/icon-shield.png",
    },
    {
      title: "Preço final é o que você paga",
      description:
        "Sem taxas extras. A Solid cobre eventuais custos de importação para você.",
      icon: "/assets/icon-money.png",
    },
    {
      title: "Seguro contra extravio",
      description:
        "Se o pacote for negado ou extraviado, refazemos a compra. Você não perde dinheiro.",
      icon: "/assets/icon-truck.png",
    },
  ],

  faqs: [
    {
      question: "Como posso rastrear meu pedido?",
      answer:
        "Assim que confirmamos a compra, você recebe o código de rastreio por e-mail e WhatsApp. Os status também ficam na área logada em “Meus Pedidos”.",
    },
    {
      question: "Os produtos possuem nota fiscal?",
      answer:
        "Sim. Emitimos nota fiscal da compra. Todo item aprovado e enviado sai com documentação para garantir a procedência.",
    },
    {
      question: "Quais formas de pagamento vocês aceitam?",
      answer:
        "Pix com 10% OFF, cartão em até 6x sem juros, ou até 12x com juros mínimo. Para drops especiais, confirmamos no WhatsApp.",
    },
    {
      question: "Qual o prazo de entrega?",
      answer:
        "Após sua aprovação, o item leva em média 7 a 10 dias para chegar ao armazém na China. Depois de aprovado e despachado, são ~15 dias para chegar no Brasil. Há frete grátis (7-18 dias úteis) e expresso (5-12 dias úteis).",
    },
    {
      question: "Os produtos possuem garantia?",
      answer:
        "Garantia de 30 dias contra defeitos de fábrica a partir do recebimento. Se algo não estiver ok, nossa equipe resolve com troca ou reembolso conforme o caso.",
    },
    {
      question: "Qual o prazo para troca ou devolução?",
      answer:
        "Você tem 7 dias corridos após o recebimento para solicitar troca ou devolução, conforme o Código de Defesa do Consumidor (CDC).",
    },
    {
      question: "Como falar com a Solid?",
      answer:
        "Pelo WhatsApp oficial, pelo e-mail comercial ou pelo suporte integrado no site. Resposta humana e rápida para manter o fluxo transparente.",
    },
  ],
};

function emptyToNull(value: string | null | undefined) {
  if (value === null || value === undefined) return null;
  const v = value.trim();
  return v ? v : null;
}

function normalizePair<T extends Record<string, unknown>>(
  obj: T,
  keys: Array<keyof T>
) {
  const out: Record<string, unknown> = { ...obj };
  for (const k of keys) {
    const v = out[String(k)];
    if (typeof v === "string") out[String(k)] = emptyToNull(v);
  }
  return out as T;
}

export function normalizeLandingContentForSave(input: LandingContent): LandingContent {
  const content: LandingContent = JSON.parse(JSON.stringify(input));

  content.whatsappLink = emptyToNull(content.whatsappLink);

  content.intro = normalizePair(content.intro, ["badge", "title", "subtitle", "ctaEnter", "ctaWhatsapp"]);
  content.nav = normalizePair(content.nav, ["brandTitle", "brandSubtitle", "loginLabel", "loggedInLabel", "logoutLabel", "lojaLabel", "etapasLabel", "whatsappLabel"]);
  content.hero = normalizePair(content.hero, ["badge", "title", "subtitle", "ctaSpecialist", "ctaCatalog", "imageAlt", "imageCaption"]);
  content.diferencial = normalizePair(content.diferencial, ["badge", "title", "subtitle"]);
  content.processo = normalizePair(content.processo, ["badge", "title", "helpCta"]);
  content.vitrine = normalizePair(content.vitrine, ["badge", "title", "subtitle", "ctaCatalog", "emptyFallback"]);
  content.seguranca = normalizePair(content.seguranca, ["badge", "title", "subtitle"]);
  content.feedbacks = normalizePair(content.feedbacks, ["badge", "title", "subtitle", "prev", "next", "proofLabel"]);
  content.faq = normalizePair(content.faq, ["badge", "title", "subtitle", "ctaWhatsapp"]);
  content.ctaFinal = normalizePair(content.ctaFinal, ["badge", "title", "subtitle", "ctaWhatsapp", "ctaCatalog", "imageAlt", "imageCaption"]);

  content.highlights = (content.highlights ?? []).map((h) => ({
    title: emptyToNull(h.title),
    description: emptyToNull(h.description),
  }));
  content.steps = (content.steps ?? []).map((s) => ({
    title: emptyToNull(s.title),
    description: emptyToNull(s.description),
  }));
  content.guarantees = (content.guarantees ?? []).map((g) => ({
    title: emptyToNull(g.title),
    description: emptyToNull(g.description),
    icon: emptyToNull(g.icon),
  }));
  content.faqs = (content.faqs ?? []).map((f) => ({
    question: emptyToNull(f.question),
    answer: emptyToNull(f.answer),
  }));

  return content;
}


