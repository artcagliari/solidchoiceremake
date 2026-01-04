/* eslint-disable react/no-unescaped-entities */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { defaultLandingContent, type LandingContent } from "@/lib/landingContent";


type HeroCard = {
  name: string;
  badge?: string | null;
  price_cents?: number | null;
  hero_image?: string | null;
  slug?: string | null;
  category?: string | null;
};

const feedbackImages = [
  "/assets/feedback1.jpeg",
  "/assets/feedback2.jpeg",
  "/assets/feedback3.jpeg",
  "/assets/feedback4.jpeg",
  "/assets/feedback5.jpeg",
  "/assets/feedback6.jpeg",
  "/assets/feedback7.jpeg",
  "/assets/feedback8.jpeg",
  "/assets/feedback9.jpeg",
  "/assets/feedback10.jpeg",
  "/assets/feedback11.jpeg",
];

export default function Home() {
  const [content, setContent] = useState<LandingContent>(defaultLandingContent);
  const [activeFeedback, setActiveFeedback] = useState(0);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [heroProducts, setHeroProducts] = useState<HeroCard[]>([]);
  const [heroError, setHeroError] = useState<string | null>(null);

  const heroFallbackImage = "/assets/banner-facil.png";

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveFeedback((prev) => (prev + 1) % feedbackImages.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessionEmail(data.session?.user?.email ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSessionEmail(session?.user?.email ?? null);
      }
    );
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadLanding = async () => {
      try {
        const res = await fetch("/api/landing", { cache: "no-store" });
        const json = (await res.json()) as { content?: LandingContent };
        if (json?.content) setContent(json.content);
      } catch {
        // mantém defaults
      }
    };
    loadLanding();
  }, []);

  useEffect(() => {
    const loadHero = async () => {
      try {
        const res = await fetch("/api/hero", { cache: "no-store" });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Hero fetch falhou: ${res.status} - ${text}`);
        }
        const json = (await res.json()) as { items?: HeroCard[] };
        const items = Array.isArray(json.items) ? json.items : [];
        if (items.length > 0) {
          setHeroProducts(items);
          setHeroError(null);
        } else {
          setHeroProducts([]);
          setHeroError("Nenhum produto retornado.");
        }
      } catch (err) {
        console.error("Erro carregando vitrine hero", err);
        setHeroProducts([]);
        setHeroError("Erro ao carregar vitrine hero. Verifique Supabase/ENV.");
      }
    };
    loadHero();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSessionEmail(null);
  };

  const heroCards = useMemo(() => {
    return heroProducts.slice(0, 4).map((p) => {
      const price =
        typeof p.price_cents === "number" && p.price_cents > 0
          ? `R$ ${(p.price_cents / 100).toFixed(2).replace(".", ",")}`
          : "Sob consulta";
      const hero = p.hero_image || heroFallbackImage;
      return {
        name: p.name ?? "Produto",
        badge: p.badge ?? "Produto",
        price,
        hero,
      };
    });
  }, [heroProducts]);

  return (
    <div className="relative overflow-hidden">
      <div className="grain" />

      {/* Intro Cinemática */}
      <section className="relative flex min-h-screen items-center justify-center">
        <div className="absolute inset-0 overflow-hidden">
          <video
            className="h-full w-full object-cover"
            src="/assets/SOLIDBANNER2.mp4"
            autoPlay
            muted
            loop
            playsInline
            poster="/assets/banner-facil.png"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c1428] via-[#0c1428]/70 to-transparent" />
        </div>
        <div
          className="relative z-10 flex max-w-5xl flex-col items-center px-6 text-center reveal"
          data-reveal
          style={{ transitionDelay: "120ms" }}
        >
          <span className="badge glass rounded-full px-3 py-2 reveal" data-reveal>
            {content.intro.badge}
          </span>
          <h1
            className="mt-6 text-5xl leading-tight tracking-wide text-[#f2d3a8] sm:text-6xl"
            data-reveal
            style={{ transitionDelay: "200ms" }}
          >
            {content.intro.title}
          </h1>
          <p
            className="mt-4 max-w-3xl text-lg text-slate-200"
            data-reveal
            style={{ transitionDelay: "260ms" }}
          >
            {content.intro.subtitle}
          </p>
          <div
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
            data-reveal
            style={{ transitionDelay: "320ms" }}
          >
            <a
              href="#landing"
              className="cta flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold uppercase tracking-[0.08em] transition-transform"
            >
              {content.intro.ctaEnter}
            </a>
            <Link
              className="cta-secondary flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] transition-colors"
              href={content.whatsappLink}
              target="_blank"
            >
              {content.intro.ctaWhatsapp}
            </Link>
          </div>
        </div>
      </section>

      <main id="landing" className="relative z-10">
        {/* Navegação */}
        <nav className="sticky top-0 z-40 border-b border-white/5 bg-[#0c1428]/80 px-6 py-4 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/assets/iconsolid.png"
                alt="Solid Choice"
                width={42}
                height={42}
                className="rounded-full bg-[#f2d3a8] p-2"
              />
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-[#f2d3a8]">
                  {content.nav.brandTitle}
                </p>
                <p className="text-xs text-slate-300">
                  {content.nav.brandSubtitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!sessionEmail ? (
                <Link
                  className="cta-secondary hidden items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition-colors sm:flex"
                  href="/login"
                >
                  {content.nav.loginLabel}
                </Link>
              ) : (
                <div className="hidden items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-200 sm:flex">
                  {content.nav.loggedInLabel}
                  <span className="text-[#f2d3a8]">
                    {sessionEmail.split("@")[0]}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-slate-200 transition hover:bg-white/10"
                  >
                    {content.nav.logoutLabel}
                  </button>
                </div>
              )}
              <Link
                className="cta-secondary hidden items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition-colors sm:flex"
                href="/loja"
              >
                {content.nav.lojaLabel}
              </Link>
              <a
                className="cta-secondary hidden items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition-colors sm:flex"
                href="#processo"
              >
                {content.nav.etapasLabel}
              </a>
              <Link
                href={content.whatsappLink}
                target="_blank"
                className="cta flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
              >
                {content.nav.whatsappLabel}
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero principal */}
        <section
          className="section-shell relative mx-auto mt-12 max-w-6xl overflow-hidden rounded-3xl px-8 py-10 sm:px-12 sm:py-14 reveal"
          data-reveal
        >
          <div className="absolute inset-0 opacity-50">
            <div className="absolute inset-0 bg-gradient-to-br from-[#2d3a5a]/30 via-transparent to-[#0c1428]" />
          </div>
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <p className="badge inline-flex rounded-full px-3 py-2" data-reveal>
                {content.hero.badge}
              </p>
              <h2
                className="text-4xl leading-tight text-[#f2d3a8] sm:text-5xl"
                data-reveal
              >
                {content.hero.title}
              </h2>
              <p className="text-lg text-slate-200" data-reveal>
                {content.hero.subtitle}
              </p>
              <div className="flex flex-wrap gap-3" data-reveal>
                <Link
                  href={content.whatsappLink}
                  target="_blank"
                  className="cta flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em]"
                >
                  {content.hero.ctaSpecialist}
                </Link>
                <Link
                  href="/loja"
                  className="cta-secondary flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em]"
                >
                  {content.hero.ctaCatalog}
                </Link>
              </div>
              <div className="divider my-6" />
              <div className="grid gap-4 sm:grid-cols-3">
                {content.highlights.map((item, index) => (
                  <div
                    key={item.title}
                    className="glass rounded-2xl p-4 text-left reveal"
                    data-reveal
                    style={{ transitionDelay: `${140 + index * 80}ms` }}
                  >
                    <p className="text-sm uppercase tracking-[0.14em] text-[#f2d3a8]">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm text-slate-200">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div
              className="relative reveal"
              data-reveal
              style={{ transitionDelay: "180ms" }}
            >
              <div className="absolute -left-12 -top-10 h-32 w-32 rounded-full bg-[#f2d3a8]/10 blur-3xl" />
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#101a30] shadow-2xl">
                <Image
                  src="/assets/banner-whats.png"
                  alt={content.hero.imageAlt}
                  width={760}
                  height={760}
                  className="h-full w-full object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c1428]/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-full bg-black/40 px-4 py-2 text-xs uppercase tracking-[0.12em] text-[#f2d3a8]">
                  {content.hero.imageCaption}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* O Diferencial */}
        <section
          id="diferencial"
          className="mx-auto mt-14 max-w-6xl space-y-8 px-6 reveal"
          data-reveal
        >
          <div className="flex flex-col gap-3 text-left sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="badge inline-flex rounded-full px-3 py-2">
                {content.diferencial.badge}
              </p>
              <h3 className="mt-4 text-3xl text-[#f2d3a8] sm:text-4xl">
                {content.diferencial.title}
              </h3>
              <p className="mt-3 max-w-3xl text-lg text-slate-200">
                {content.diferencial.subtitle}
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {content.highlights.map((item, index) => (
              <div
                key={item.title}
                className="section-shell rounded-2xl p-5 shadow-xl reveal"
                data-reveal
                style={{ transitionDelay: `${120 + index * 90}ms` }}
              >
                <p className="text-sm uppercase tracking-[0.14em] text-[#f2d3a8]">
                  {item.title}
                </p>
                <p className="mt-2 text-sm text-slate-200">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Processo */}
        <section
          id="processo"
          className="mx-auto mt-16 max-w-6xl space-y-10 px-6 reveal"
          data-reveal
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="badge inline-flex rounded-full px-3 py-2">
                {content.processo.badge}
              </p>
              <h3 className="mt-4 text-3xl text-[#f2d3a8] sm:text-4xl">
                {content.processo.title}
              </h3>
            </div>
            <Link
              href={content.whatsappLink}
              target="_blank"
              className="cta hidden rounded-full px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] sm:inline-flex"
            >
              {content.processo.helpCta}
            </Link>
          </div>
          <div className="relative">
            <div className="absolute left-8 top-0 hidden h-full w-px bg-gradient-to-b from-[#f2d3a8]/40 via-[#f2d3a8]/10 to-transparent sm:block" />
            <div className="grid gap-6 sm:grid-cols-2">
              {content.steps.map((step, index) => (
                <div
                  key={step.title}
                  className="glass relative flex gap-4 rounded-2xl p-5 reveal"
                  data-reveal
                  style={{ transitionDelay: `${140 + index * 80}ms` }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f2d3a8]/15 text-lg font-semibold text-[#f2d3a8] ring-1 ring-[#f2d3a8]/40">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.14em] text-[#f2d3a8]">
                      {step.title}
                    </p>
                    <p className="mt-2 text-sm text-slate-200">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Vitrine Hero */}
        <section
          id="vitrine"
          className="mx-auto mt-16 max-w-6xl space-y-8 px-6 reveal"
          data-reveal
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="badge inline-flex rounded-full px-3 py-2">
                {content.vitrine.badge}
              </p>
              <h3 className="mt-4 text-3xl text-[#f2d3a8] sm:text-4xl">
                {content.vitrine.title}
              </h3>
              <p className="mt-2 text-slate-200">
                {content.vitrine.subtitle}
              </p>
            </div>
            <Link
              href="/loja"
              className="cta rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.1em]"
            >
              {content.vitrine.ctaCatalog}
            </Link>
          </div>

          {heroCards.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-8 text-sm text-slate-300">
              {heroError
                ? heroError
                : content.vitrine.emptyFallback}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {heroCards.map((item, index) => (
                <Link
                  key={`${item.name}-${index}`}
                  href="/loja"
                  className="section-shell group relative overflow-hidden rounded-2xl p-4 transition-transform duration-300 hover:-translate-y-1 reveal visible block"
                  style={{ transitionDelay: `${120 + index * 80}ms` }}
                >
                  <div className="relative h-56 w-full overflow-hidden rounded-xl bg-[#0c1428]">
                    <Image
                      src={item.hero}
                      alt={item.name}
                      fill
                      sizes="(min-width: 1280px) 320px, (min-width: 768px) 50vw, 100vw"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="badge rounded-full px-3 py-1 text-[11px]">
                      {item.badge}
                    </span>
                    <span className="text-xs uppercase tracking-[0.12em] text-slate-300">
                      {item.price}
                    </span>
                  </div>
                  <p className="mt-2 text-lg text-[#f2d3a8]">{item.name}</p>
                  <span className="mt-3 inline-block text-sm font-semibold uppercase tracking-[0.1em] text-[#f2d3a8] underline-offset-4 group-hover:underline">
                    Adicionar à cotação
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Segurança */}
        <section
          id="seguranca"
          className="mx-auto mt-16 max-w-6xl space-y-8 px-6 reveal"
          data-reveal
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="badge inline-flex rounded-full px-3 py-2">
                {content.seguranca.badge}
              </p>
              <h3 className="mt-4 text-3xl text-[#f2d3a8] sm:text-4xl">
                {content.seguranca.title}
              </h3>
              <p className="mt-2 max-w-3xl text-slate-200">
                {content.seguranca.subtitle}
              </p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {content.guarantees.map((item, index) => (
              <div
                key={item.title}
                className="section-shell flex flex-col gap-4 rounded-2xl p-5 reveal"
                data-reveal
                style={{ transitionDelay: `${120 + index * 80}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f2d3a8]/15">
                    <Image src={item.icon} alt={item.title} width={28} height={28} />
                  </div>
                  <p className="text-sm uppercase tracking-[0.14em] text-[#f2d3a8]">
                    {item.title}
                  </p>
                </div>
                <p className="text-sm text-slate-200">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Feedbacks */}
        <section
          id="feedbacks"
          className="mx-auto mt-16 max-w-6xl px-6 reveal"
          data-reveal
        >
          <div className="section-shell overflow-hidden rounded-3xl px-6 py-8 sm:px-10 sm:py-12">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="badge inline-flex rounded-full px-3 py-2">
                  {content.feedbacks.badge}
                </p>
                <h3 className="mt-3 text-3xl sm:text-4xl text-[#f2d3a8]">
                  {content.feedbacks.title}
                </h3>
                <p className="mt-2 max-w-3xl text-slate-200">
                  {content.feedbacks.subtitle}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setActiveFeedback(
                      (prev) => (prev - 1 + feedbackImages.length) % feedbackImages.length
                    )
                  }
                  className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                >
                  {content.feedbacks.prev}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFeedback((prev) => (prev + 1) % feedbackImages.length)}
                  className="cta rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                >
                  {content.feedbacks.next}
                </button>
              </div>
            </div>

            <div className="mt-8">
              <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
                {[0, 1, 2].map((offset) => {
                  const index = (activeFeedback + offset) % feedbackImages.length;
                  const src = feedbackImages[index];
                  return (
                    <div
                      key={src}
                      className="glass relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10"
                    >
                      <div className="relative aspect-[4/5] w-full overflow-hidden">
                        <Image
                          src={src}
                          alt={`Feedback ${index + 1}`}
                          fill
                          sizes="(min-width: 1024px) 33vw, 100vw"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 text-xs uppercase tracking-[0.12em] text-[#f2d3a8]">
                        <span>Feedback {index + 1}</span>
                        <span className="text-[10px] text-slate-300">{content.feedbacks.proofLabel}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-center gap-2">
                {feedbackImages.map((_, index) => {
                  const isActive = index === activeFeedback;
                  return (
                    <button
                      key={`dot-${index}`}
                      type="button"
                      onClick={() => setActiveFeedback(index)}
                      className={`h-2 w-2 rounded-full transition ${
                        isActive ? "bg-[#f2d3a8]" : "bg-white/20 hover:bg-white/40"
                      }`}
                      aria-label={`Ir para feedback ${index + 1}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          className="mx-auto mt-16 max-w-6xl space-y-6 px-6 reveal"
          data-reveal
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="badge inline-flex rounded-full px-3 py-2">
                {content.faq.badge}
              </p>
              <h3 className="mt-3 text-3xl text-[#f2d3a8] sm:text-4xl">
                {content.faq.title}
              </h3>
              <p className="mt-2 max-w-3xl text-slate-200">
                {content.faq.subtitle}
              </p>
            </div>
            <Link
              href={content.whatsappLink}
              target="_blank"
              className="cta rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              {content.faq.ctaWhatsapp}
            </Link>
          </div>

          <div className="section-shell rounded-3xl border border-white/10">
            {content.faqs.map((item, index) => (
              <details
                key={item.question}
                className={`group border-b border-white/5 px-5 py-4 last:border-b-0 ${
                  index === 0 ? "rounded-t-3xl" : ""
                } ${index === content.faqs.length - 1 ? "rounded-b-3xl" : ""}`}
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-left text-[#f2d3a8]">
                  <span className="text-base font-semibold">{item.question}</span>
                  <span className="text-sm text-slate-300 transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-200 leading-relaxed">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Rodapé / CTA final */}
        <section className="mx-auto mt-16 max-w-6xl px-6 pb-16 reveal" data-reveal>
          <div className="section-shell overflow-hidden rounded-3xl px-8 py-10 sm:px-12 sm:py-14">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="reveal" data-reveal style={{ transitionDelay: "100ms" }}>
                <p className="badge inline-flex rounded-full px-3 py-2" data-reveal>
                  {content.ctaFinal.badge}
                </p>
                <h3 className="mt-4 text-3xl text-[#f2d3a8] sm:text-4xl" data-reveal>
                  {content.ctaFinal.title}
                </h3>
                <p className="mt-2 max-w-3xl text-lg text-slate-200" data-reveal>
                  {content.ctaFinal.subtitle}
                </p>
                <div className="mt-6 flex flex-wrap gap-3" data-reveal>
                  <Link
                    href={content.whatsappLink}
                    target="_blank"
                    className="cta rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em]"
                  >
                    {content.ctaFinal.ctaWhatsapp}
                  </Link>
                  <Link
                    href="/loja"
                    className="cta-secondary rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em]"
                  >
                    {content.ctaFinal.ctaCatalog}
                  </Link>
                </div>
              </div>
              <div
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0f182e] reveal"
                data-reveal
                style={{ transitionDelay: "160ms" }}
              >
                <Image
                  src="/assets/banner-whats.png"
                  alt={content.ctaFinal.imageAlt}
                  width={960}
                  height={720}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c1428]/85 via-transparent to-transparent" />
                <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-xs uppercase tracking-[0.12em] text-[#f2d3a8]">
                  {content.ctaFinal.imageCaption}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
