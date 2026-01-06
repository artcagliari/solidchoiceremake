"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  defaultLandingContent,
  normalizeLandingContentForSave,
  type LandingContent,
} from "@/lib/landingContent";

type Product = {
  id: string;
  name: string;
  slug?: string | null;
  category?: string | null;
  brand?: string | null;
  catalog_node_id?: string | null;
  badge?: string | null;
  description?: string | null;
  price_cents?: number | null;
  hero_image?: string | null;
  images?: string[] | null;
  sizes?: string[] | null;
  colors?: string[] | null;
};

type CatalogNode = {
  id: string;
  kind: "main" | "subcategory" | "brand" | "line";
  parent_id: string | null;
  label: string;
  slug: string;
  logo_url: string | null;
  banner_url?: string | null;
  sort_order: number;
};

type Order = {
  id: string;
  status: string | null;
  total_cents: number | null;
  email: string | null;
  created_at: string | null;
  order_items?: Array<{
    id: string;
    quantity: number;
    unit_price_cents?: number | null;
    line_total_cents?: number | null;
    product?: { id: string; name: string; hero_image?: string | null; slug?: string | null } | null;
  }>;
};

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "products";

function toCents(input: string) {
  const cleaned = input.replace(/[^\d,\.]/g, "").replace(",", ".");
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value * 100));
}

function fromCents(cents?: number | null) {
  const v = typeof cents === "number" ? cents : 0;
  return (v / 100).toFixed(2).replace(".", ",");
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

function priceLabel(price_cents: number | null | undefined) {
  if (typeof price_cents !== "number" || price_cents <= 0) return "Sob consulta";
  return `R$ ${(price_cents / 100).toFixed(2).replace(".", ",")}`;
}

function orderItemTotalLabel(it: { quantity: number; unit_price_cents?: number | null; line_total_cents?: number | null }) {
  if (typeof it.line_total_cents === "number") return priceLabel(it.line_total_cents);
  if (typeof it.unit_price_cents === "number") return priceLabel(it.unit_price_cents * (it.quantity ?? 0));
  return "—";
}

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [highlightOrderId, setHighlightOrderId] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<
    "pending" | "confirmed" | "canceled" | "all"
  >("pending");
  const [orderSearch, setOrderSearch] = useState("");

  // Landing editable content (mini CMS)
  const [landingContent, setLandingContent] = useState<LandingContent>(
    defaultLandingContent
  );
  const [landingAdvancedJson, setLandingAdvancedJson] = useState<string>(
    JSON.stringify(defaultLandingContent, null, 2)
  );
  const [landingShowAdvanced, setLandingShowAdvanced] = useState(false);
  const [landingLoading, setLandingLoading] = useState(false);
  const [landingMsg, setLandingMsg] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [catalog, setCatalog] = useState<CatalogNode[]>([]);

  const [editing, setEditing] = useState<Product | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Calçado");
  const [brand, setBrand] = useState("Solid Choice");
  const [badge, setBadge] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0,00");
  const [sizes, setSizes] = useState("");
  const [sizesTouched, setSizesTouched] = useState(false);
  const [colors, setColors] = useState("");

  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [heroUrl, setHeroUrl] = useState<string>("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);

  // Product catalog selection (new taxonomy)
  const [catalogMain, setCatalogMain] = useState<"sneakers" | "vestuario">("vestuario");
  const [catalogBrandId, setCatalogBrandId] = useState<string>("");
  const [catalogLineId, setCatalogLineId] = useState<string>("");
  const [catalogVestSubId, setCatalogVestSubId] = useState<string>("");

  // Catalog editing (simplificado por seções)
  const [catalogBusy, setCatalogBusy] = useState(false);

  // Principais (main)
  const [mainSneakersBannerFile, setMainSneakersBannerFile] = useState<File | null>(null);
  const [mainVestuarioBannerFile, setMainVestuarioBannerFile] = useState<File | null>(null);

  // Vestuário: subcategoria
  const [vestLabel, setVestLabel] = useState("");
  const [vestSlug, setVestSlug] = useState("");
  const [vestSort, setVestSort] = useState<number>(10);

  // Sneakers: marca
  const [brandLabel, setBrandLabel] = useState("");
  const [brandSlug, setBrandSlug] = useState("");
  const [brandSort, setBrandSort] = useState<number>(10);
  const [brandLogoFile, setBrandLogoFile] = useState<File | null>(null);

  // Sneakers: linha
  const [lineBrandId, setLineBrandId] = useState<string>("");
  const [lineLabel, setLineLabel] = useState("");
  const [lineSlug, setLineSlug] = useState("");
  const [lineSort, setLineSort] = useState<number>(10);

  // Inline edit (por item)
  const [editingCatalog, setEditingCatalog] = useState<CatalogNode | null>(null);
  const [editCatalogLabel, setEditCatalogLabel] = useState("");
  const [editCatalogSlug, setEditCatalogSlug] = useState("");
  const [editCatalogSort, setEditCatalogSort] = useState<number>(10);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editBannerFile, setEditBannerFile] = useState<File | null>(null);

  const totals = useMemo(() => {
    const sum = (status: string) =>
      orders
        .filter((o) => (o.status ?? "").toLowerCase() === status)
        .reduce((acc, o) => acc + (o.total_cents ?? 0), 0);
    return {
      confirmed: sum("confirmed"),
      pending: sum("pending"),
      canceled: sum("canceled"),
    };
  }, [orders]);

  const orderCounts = useMemo(() => {
    const count = (status: string) =>
      orders.filter((o) => (o.status ?? "").toLowerCase() === status).length;
    return {
      pending: count("pending"),
      confirmed: count("confirmed"),
      canceled: count("canceled"),
      all: orders.length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const base =
      orderFilter === "all"
        ? orders
        : orders.filter((o) => (o.status ?? "").toLowerCase() === orderFilter);

    const q = orderSearch.trim().toLowerCase();
    if (!q) return base;

    return base.filter((o) => {
      const id = (o.id ?? "").toLowerCase();
      const email = (o.email ?? "").toLowerCase();
      return id.includes(q) || email.includes(q);
    });
  }, [orders, orderFilter, orderSearch]);

  const statusLabel = (status: string | null) => {
    const s = (status ?? "pending").toLowerCase();
    if (s === "confirmed") return "CONFIRMADO";
    if (s === "canceled") return "CANCELADO";
    return "PENDENTE";
  };

  const defaultSizesByCategory = useMemo(() => {
    const cat = category.toLowerCase();
    const isFootwear =
      cat.includes("cal") || cat.includes("tenis") || cat.includes("tênis");

    // Regra: Calçado = numérico; qualquer outra categoria = roupa (S..XXL)
    if (isFootwear) return "36,37,38,39,40,41,42,43,44";
    return "S,M,L,XL,XXL";
  }, [category]);

  const dynamicSizesHint = useMemo(() => {
    return defaultSizesByCategory
      ? `Sugestão: ${defaultSizesByCategory}`
      : "Separe por vírgula (ex.: Único)";
  }, [defaultSizesByCategory]);

  useEffect(() => {
    // Auto-preenche/atualiza enquanto o usuário não mexer manualmente no campo.
    if (!sizesTouched && defaultSizesByCategory) {
      setSizes(defaultSizesByCategory);
    }
  }, [category, defaultSizesByCategory, sizesTouched]);

  const fetchAll = async (t: string) => {
    const [pRes, oRes] = await Promise.all([
      fetch("/api/admin/products", { headers: { Authorization: `Bearer ${t}` } }),
      fetch("/api/admin/orders", { headers: { Authorization: `Bearer ${t}` } }),
    ]);

    if (!pRes.ok) throw new Error(await pRes.text());
    if (!oRes.ok) throw new Error(await oRes.text());

    const pJson = (await pRes.json()) as { items: Product[] };
    const oJson = (await oRes.json()) as { items: Order[] };
    setProducts(Array.isArray(pJson.items) ? pJson.items : []);
    setOrders(Array.isArray(oJson.items) ? oJson.items : []);
  };

  const loadCatalog = async (t: string) => {
    try {
      const res = await fetch("/api/admin/catalog", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { items?: CatalogNode[] };
      setCatalog(Array.isArray(json.items) ? json.items : []);
    } catch {
      // Se tabela não existir ainda no Supabase, não quebra o admin.
      setCatalog([]);
    }
  };

  const createCatalogNode = async (payload: {
    kind: "main" | "subcategory" | "brand" | "line";
    parent_id: string | null;
    label: string;
    slug: string;
    logo_url?: string | null;
    banner_url?: string | null;
    sort_order: number;
  }) => {
    if (!token) return;
    setNotice(null);
    setError(null);
    setCatalogBusy(true);
    try {
      const res = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadCatalog(token);
      setNotice("Item do catálogo criado.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar item.";
      setError(msg);
    } finally {
      setCatalogBusy(false);
    }
  };

  const updateCatalogNode = async (
    id: string,
    patch: Partial<Pick<CatalogNode, "label" | "slug" | "sort_order" | "logo_url" | "banner_url">>
  ) => {
    if (!token) return;
    setNotice(null);
    setError(null);
    setCatalogBusy(true);
    try {
      const res = await fetch("/api/admin/catalog", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, patch }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadCatalog(token);
      setNotice("Catálogo atualizado.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar catálogo.";
      setError(msg);
    } finally {
      setCatalogBusy(false);
    }
  };

  const deleteCatalogNode = async (id: string) => {
    if (!token) return;
    if (!confirm("Remover este item do catálogo? (sub-itens serão removidos também)")) return;
    setNotice(null);
    setError(null);
    setCatalogBusy(true);
    try {
      const res = await fetch("/api/admin/catalog", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadCatalog(token);
      setNotice("Item removido.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao remover item.";
      setError(msg);
    } finally {
      setCatalogBusy(false);
    }
  };

  const startEditCatalog = (node: CatalogNode) => {
    setEditingCatalog(node);
    setEditCatalogLabel(node.label);
    setEditCatalogSlug(node.slug);
    setEditCatalogSort(node.sort_order ?? 0);
    setEditLogoFile(null);
    setEditBannerFile(null);
  };

  const saveEditCatalog = async () => {
    if (!editingCatalog) return;
    let logo_url: string | null | undefined = undefined;
    let banner_url: string | null | undefined = undefined;

    try {
      if (editLogoFile) logo_url = await uploadFile(editLogoFile, "catalog/brand-logos");
      if (editBannerFile) banner_url = await uploadFile(editBannerFile, "catalog/banners");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao fazer upload.";
      setError(msg);
      return;
    }

    await updateCatalogNode(editingCatalog.id, {
      label: editCatalogLabel.trim(),
      slug: editCatalogSlug.trim(),
      sort_order: editCatalogSort,
      ...(logo_url !== undefined ? { logo_url } : {}),
      ...(banner_url !== undefined ? { banner_url } : {}),
    });
    setEditingCatalog(null);
  };

  const loadLanding = async (t: string) => {
    setLandingLoading(true);
    setLandingMsg(null);
    try {
      const res = await fetch("/api/admin/landing", {
        headers: { Authorization: `Bearer ${t}` },
      });
      const json = (await res.json()) as { content?: LandingContent; error?: string };
      if (json?.content) {
        setLandingContent(json.content);
        setLandingAdvancedJson(JSON.stringify(json.content, null, 2));
        setLandingMsg("Conteúdo carregado do Supabase.");
      } else {
        setLandingMsg(
          "Não foi possível carregar do Supabase. Usando padrão local."
        );
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erro ao carregar conteúdo.";
      setLandingMsg(msg);
    } finally {
      setLandingLoading(false);
    }
  };

  const saveLanding = async (t: string) => {
    setLandingLoading(true);
    setLandingMsg(null);
    try {
      const normalized = normalizeLandingContentForSave(landingContent);
      const res = await fetch("/api/admin/landing", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify({ content: normalized }),
      });
      if (!res.ok) throw new Error(await res.text());
      setLandingContent(normalized);
      setLandingAdvancedJson(JSON.stringify(normalized, null, 2));
      setLandingMsg("Conteúdo salvo no Supabase.");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erro ao salvar.";
      setLandingMsg(msg);
    } finally {
      setLandingLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      const { data } = await supabase.auth.getSession();
      const t = data.session?.access_token;
      if (!t) {
        router.replace("/login");
        return;
      }
      setToken(t);
      try {
        await fetchAll(t);
        await loadCatalog(t);
        await loadLanding(t);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro carregando admin.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setCategory("Calçado");
    setBrand("Solid Choice");
    setBadge("");
    setDescription("");
    setPrice("0,00");
    setSizes("");
    setSizesTouched(false);
    setColors("");
    setHeroFile(null);
    setGalleryFiles([]);
    setHeroUrl("");
    setGalleryUrls([]);
  };

  const startEdit = (p: Product) => {
    setEditing(p);
    setName(p.name ?? "");
    setCategory(p.category ?? "Calçado");
    setBrand(p.brand ?? "Solid Choice");
    setBadge(p.badge ?? "");
    setDescription(p.description ?? "");
    setPrice(fromCents(p.price_cents));
    setSizes((p.sizes ?? []).join(","));
    setSizesTouched(true);
    setColors((p.colors ?? []).join(","));
    setHeroUrl(p.hero_image ?? "");
    setGalleryUrls(p.images ?? []);
    setHeroFile(null);
    setGalleryFiles([]);

    // Novo catálogo: tenta inferir seleção ao editar
    if (p.catalog_node_id) {
      // Se existir, vamos preencher direto no payload; o UI deixa ajustar se quiser.
      // (A estrutura do catálogo é carregada no init)
      setCatalogLineId(p.catalog_node_id);
      setCatalogVestSubId(p.catalog_node_id);
    } else {
      setCatalogLineId("");
      setCatalogVestSubId("");
    }
  };

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${folder}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
    });
    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const upsertProduct = async () => {
    if (!token) return;
    setError(null);
    try {
      const price_cents = toCents(price);
      const finalBadge = badge.trim() || category.trim() || "Produto";

      let finalHero = heroUrl.trim() || "";
      if (heroFile) finalHero = await uploadFile(heroFile, "hero");

      let finalGallery = [...galleryUrls];
      if (galleryFiles.length) {
        const uploaded = await Promise.all(
          galleryFiles.map((f) => uploadFile(f, "gallery"))
        );
        finalGallery = [...finalGallery, ...uploaded];
      }

      const payload = {
        id: editing?.id,
        name: name.trim(),
        category: category.trim(),
        brand: brand.trim(),
        badge: finalBadge,
        description: description.trim(),
        price_cents,
        hero_image: finalHero || null,
        images: finalGallery,
        sizes,
        colors,
        // novo catálogo (opcional)
        catalog_node_id:
          catalogMain === "sneakers"
            ? (catalogLineId || null)
            : (catalogVestSubId || null),
        // manter compatibilidade com backend antigo:
        slug: editing?.slug ?? slugify(name.trim()),
        new_slug: slugify(name.trim()),
      };

      const res = await fetch("/api/admin/products", {
        method: editing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      await fetchAll(token);
      resetForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar produto.";
      setError(msg);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!token) return;
    if (!confirm("Remover este produto?")) return;
    try {
      const res = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchAll(token);
    } catch (err) {
      console.error(err);
      alert("Não foi possível remover o produto.");
    }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchAll(token);
      setHighlightOrderId(id);
      setNotice(
        status === "confirmed"
          ? `Pedido ${id} confirmado.`
          : status === "canceled"
          ? `Pedido ${id} cancelado.`
          : `Pedido ${id} atualizado.`
      );
      if (status === "canceled") setOrderFilter("canceled");
      if (status === "confirmed") setOrderFilter("confirmed");
      window.setTimeout(() => setHighlightOrderId(null), 4500);
      window.setTimeout(() => setNotice(null), 4500);
    } catch (err) {
      console.error(err);
      alert("Não foi possível atualizar o pedido.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c1428] text-[#f2d3a8]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-sm text-slate-200">Carregando admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c1428] text-[#f2d3a8]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="badge inline-flex rounded-full px-3 py-2">
              Dashboard · Admin
            </p>
            <h1 className="mt-4 text-3xl sm:text-4xl">Painel</h1>
            <p className="mt-2 text-slate-200">
              Produtos, pedidos e finanças.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/loja"
              className="cta-secondary rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Ir pra loja
            </Link>
            <Link
              href="/"
              className="cta-secondary rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Landing
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-4 text-sm text-slate-200">
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="mt-4 rounded-2xl border border-[#f2d3a8]/25 bg-[#f2d3a8]/10 px-4 py-3 text-sm text-slate-200">
            {notice}
          </div>
        ) : null}

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1fr]">
          {/* Produtos */}
          <section className="section-shell rounded-3xl p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold uppercase tracking-[0.12em] text-slate-200">
                {editing ? "Editar produto" : "Novo produto"}
              </h2>
              {editing ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                >
                  Cancelar
                </button>
              ) : null}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs uppercase tracking-[0.12em] text-slate-200">
                  Nome
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none"
                  placeholder="Ex.: Tênis XYZ"
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.12em] text-slate-200">
                  Categoria
                </span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none"
                >
                  <option>Calçado</option>
                  <option>Camiseta</option>
                  <option>Calça</option>
                  <option>Bermuda</option>
                  <option>Acessório</option>
                  <option>Outros</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.12em] text-slate-200">
                  Preço (R$)
                </span>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none"
                  placeholder="0,00"
                />
              </label>

              <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">
                  Catálogo (novo)
                </p>
                <p className="mt-2 text-xs text-slate-300">
                  Para Sneakers: selecione Marca + Linha. Para Vestuário: selecione a Subcategoria.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Principal</span>
                    <select
                      value={catalogMain}
                      onChange={(e) => setCatalogMain(e.target.value as "sneakers" | "vestuario")}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                    >
                      <option value="sneakers">Sneakers</option>
                      <option value="vestuario">Vestuário</option>
                    </select>
                  </label>

                  {catalogMain === "vestuario" ? (
                    <label className="block">
                      <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Subcategoria (Vestuário)</span>
                      <select
                        value={catalogVestSubId}
                        onChange={(e) => setCatalogVestSubId(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                      >
                        <option value="">(sem)</option>
                        {catalog
                          .filter((n) => n.kind === "main" && n.slug === "vestuario")
                          .flatMap((mainNode) =>
                            catalog
                              .filter((n) => n.parent_id === mainNode.id && n.kind === "subcategory")
                              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                          )
                          .map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.label}
                            </option>
                          ))}
                      </select>
                    </label>
                  ) : (
                    <>
                      <label className="block">
                        <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Marca (Sneakers)</span>
                        <select
                          value={catalogBrandId}
                          onChange={(e) => {
                            setCatalogBrandId(e.target.value);
                            setCatalogLineId("");
                          }}
                          className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                        >
                          <option value="">(sem)</option>
                          {catalog
                            .filter((n) => n.kind === "main" && n.slug === "sneakers")
                            .flatMap((mainNode) =>
                              catalog
                                .filter((n) => n.parent_id === mainNode.id && n.kind === "brand")
                                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                            )
                            .map((n) => (
                              <option key={n.id} value={n.id}>
                                {n.label}
                              </option>
                            ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Linha (ex.: Air Force)</span>
                        <select
                          value={catalogLineId}
                          onChange={(e) => setCatalogLineId(e.target.value)}
                          className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                          disabled={!catalogBrandId}
                        >
                          <option value="">(sem)</option>
                          {catalog
                            .filter((n) => n.parent_id === catalogBrandId && n.kind === "line")
                            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                            .map((n) => (
                              <option key={n.id} value={n.id}>
                                {n.label}
                              </option>
                            ))}
                        </select>
                      </label>
                    </>
                  )}
                </div>
              </div>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.12em] text-slate-200">
                  Marca
                </span>
                <input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none"
                  placeholder="Ex.: Nike"
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.12em] text-slate-200">
                  Badge (opcional)
                </span>
                <input
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none"
                  placeholder="Ex.: Top tier"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs uppercase tracking-[0.12em] text-slate-200">
                  Descrição
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none"
                  placeholder="Detalhes do produto..."
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.12em] text-slate-200">
                  Tamanhos
                </span>
                <div className="mt-2 flex items-stretch gap-2">
                  <input
                    value={sizes}
                    onChange={(e) => {
                      setSizesTouched(true);
                      setSizes(e.target.value);
                    }}
                    className="w-full flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none"
                    placeholder={dynamicSizesHint}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!defaultSizesByCategory) return;
                      setSizesTouched(false);
                      setSizes(defaultSizesByCategory);
                    }}
                    disabled={!defaultSizesByCategory}
                    className="cta-secondary rounded-xl px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] disabled:opacity-50"
                    title={
                      defaultSizesByCategory
                        ? "Preencher com tamanhos padrão da categoria"
                        : "Sem padrão para esta categoria"
                    }
                  >
                    Aplicar padrão
                  </button>
                </div>
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.12em] text-slate-200">
                  Cores
                </span>
                <input
                  value={colors}
                  onChange={(e) => setColors(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none"
                  placeholder="Preto, Branco..."
                />
              </label>

              <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-200">
                  Imagens (upload)
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs text-slate-300">Hero (principal)</span>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <input
                        id="hero-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setHeroFile(e.target.files?.[0] ?? null)}
                        className="sr-only"
                      />
                      <label
                        htmlFor="hero-upload"
                        className="cta cursor-pointer rounded-xl px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
                      >
                        Escolher imagem
                      </label>
                      <span className="text-xs text-slate-200">
                        {heroFile ? heroFile.name : "Nenhum arquivo selecionado"}
                      </span>
                    </div>
                    {heroUrl || heroFile ? (
                      <p className="mt-2 text-xs text-slate-300 break-all">
                        {heroFile ? "Novo hero selecionado" : "Hero atual"}:{" "}
                        {heroFile ? heroFile.name : heroUrl}
                      </p>
                    ) : null}
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-300">Galeria (múltiplas)</span>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <input
                        id="gallery-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) =>
                          setGalleryFiles(Array.from(e.target.files ?? []))
                        }
                        className="sr-only"
                      />
                      <label
                        htmlFor="gallery-upload"
                        className="cta-secondary cursor-pointer rounded-xl px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
                      >
                        Escolher arquivos
                      </label>
                      <span className="text-xs text-slate-200">
                        {galleryFiles.length
                          ? `${galleryFiles.length} selecionado(s)`
                          : "Nenhum arquivo selecionado"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-300">
                      {galleryUrls.length
                        ? `${galleryUrls.length} imagem(ns) já salvas`
                        : "Dica: você pode selecionar várias imagens de uma vez."}
                    </p>
                  </label>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={upsertProduct}
              className="cta mt-5 w-full rounded-xl px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em]"
            >
              {editing ? "Salvar alterações" : "Criar produto"}
            </button>
          </section>

          {/* Pedidos + Finanças */}
          <section className="space-y-6">
            <div className="section-shell rounded-3xl p-6">
              <h2 className="text-lg font-semibold uppercase tracking-[0.12em] text-slate-200">
                Finanças
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-300">
                    Confirmado
                  </p>
                  <p className="mt-2 text-xl font-semibold text-[#f2d3a8]">
                    {priceLabel(totals.confirmed)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-300">
                    Pendente
                  </p>
                  <p className="mt-2 text-xl font-semibold text-[#f2d3a8]">
                    {priceLabel(totals.pending)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-300">
                    Cancelado
                  </p>
                  <p className="mt-2 text-xl font-semibold text-[#f2d3a8]">
                    {priceLabel(totals.canceled)}
                  </p>
                </div>
              </div>
            </div>

            <div className="section-shell rounded-3xl p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold uppercase tracking-[0.12em] text-slate-200">
                  Pedidos
                </h2>
                <button
                  type="button"
                  className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                  onClick={() => token && fetchAll(token)}
                >
                  Atualizar
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(
                  [
                    ["pending", "Pendentes", orderCounts.pending],
                    ["confirmed", "Confirmados", orderCounts.confirmed],
                    ["canceled", "Cancelados", orderCounts.canceled],
                    ["all", "Todos", orderCounts.all],
                  ] as const
                ).map(([key, label, count]) => {
                  const active = orderFilter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setOrderFilter(key)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                        active ? "cta" : "cta-secondary"
                      }`}
                    >
                      {label} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="mt-4">
                <input
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-[#f2d3a8]/40"
                  placeholder="Buscar por código do pedido (ou e-mail)..."
                />
              </div>

              <div className="mt-4 space-y-3">
                {filteredOrders.length === 0 ? (
                  <p className="text-sm text-slate-200">
                    Nenhum pedido nesta aba.
                  </p>
                ) : (
                  filteredOrders.slice(0, 20).map((o) => (
                    <div
                      key={o.id}
                      className={`rounded-2xl border bg-white/5 p-4 transition ${
                        highlightOrderId === o.id
                          ? "border-[#f2d3a8]/60 ring-2 ring-[#f2d3a8]/20"
                          : "border-white/10"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-slate-300">
                            {statusLabel(o.status)}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[#f2d3a8] break-all">
                            {o.id}
                          </p>
                          <p className="mt-1 text-xs text-slate-300">
                            {o.email ?? "Sem email"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.12em] text-slate-300">
                            Total
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[#f2d3a8]">
                            {priceLabel(o.total_cents)}
                          </p>
                        </div>
                      </div>

                      {o.order_items?.length ? (
                        <div className="mt-3 space-y-2">
                          {o.order_items.slice(0, 5).map((it) => (
                            <div
                              key={it.id}
                              className="flex items-center justify-between gap-3 text-xs text-slate-200"
                            >
                              <span className="line-clamp-1">
                                {it.product?.name ?? "Produto"} x{it.quantity}
                              </span>
                              <span className="text-slate-300">
                                {orderItemTotalLabel(it)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="cta rounded-xl px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em]"
                          onClick={() => updateOrderStatus(o.id, "confirmed")}
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          className="cta-secondary rounded-xl px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em]"
                          onClick={() => updateOrderStatus(o.id, "canceled")}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Lista de produtos */}
        <section className="mt-10 section-shell rounded-3xl p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold uppercase tracking-[0.12em] text-slate-200">
              Produtos
            </h2>
            <button
              type="button"
              className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
              onClick={() => token && fetchAll(token)}
            >
              Atualizar
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((p) => {
              const img = p.hero_image || "/assets/banner-facil.png";
              const href = p.slug ? `/loja/${p.slug}` : "/loja";
              return (
                <div key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Link href={href} className="block">
                    <div className="relative h-40 w-full overflow-hidden rounded-xl border border-white/10 bg-black/20">
                      <Image src={img} alt={p.name} fill className="object-cover" />
                    </div>
                    <p className="mt-3 line-clamp-1 text-sm font-semibold text-[#f2d3a8]">
                      {p.name}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-300">
                      {p.category ?? "Produto"} · {priceLabel(p.price_cents)}
                    </p>
                  </Link>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="cta-secondary rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em]"
                      onClick={() => startEdit(p)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="cta-secondary rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em]"
                      onClick={() => deleteProduct(p.id)}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Catálogo: simples (upload + seções separadas) */}
        <section className="mt-10 section-shell rounded-3xl p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold uppercase tracking-[0.12em] text-slate-200">
                Catálogo · Categorias / Marcas / Linhas
              </h2>
              <p className="mt-2 text-sm text-slate-200">
                Aqui é tudo por <b>upload</b> (galeria), sem URL.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Pré-requisito: rode <span className="text-slate-200">supabase_catalog_nodes.sql</span> no Supabase (inclui <span className="text-slate-200">banner_url</span>).
              </p>
            </div>
            <button
              type="button"
              onClick={() => token && loadCatalog(token)}
              className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] disabled:opacity-60"
              disabled={!token || catalogBusy}
            >
              Atualizar
            </button>
          </div>

          {(() => {
            const mainSneakers = catalog.find((n) => n.kind === "main" && n.slug === "sneakers") ?? null;
            const mainVestuario = catalog.find((n) => n.kind === "main" && n.slug === "vestuario") ?? null;
            const brands = mainSneakers ? catalog.filter((n) => n.kind === "brand" && n.parent_id === mainSneakers.id).sort((a,b)=>a.sort_order-b.sort_order) : [];
            const vestSubs = mainVestuario ? catalog.filter((n) => n.kind === "subcategory" && n.parent_id === mainVestuario.id).sort((a,b)=>a.sort_order-b.sort_order) : [];

            return (
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                {/* Principais */}
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">
                    Categorias principais (banners)
                  </p>
                  <div className="mt-4 grid gap-4">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-200">Sneakers</p>
                        {mainSneakers?.banner_url ? (
                          <a
                            href={mainSneakers.banner_url}
                            target="_blank"
                            className="text-xs text-slate-300 underline"
                          >
                            ver imagem
                          </a>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setMainSneakersBannerFile(e.target.files?.[0] ?? null)}
                          className="block w-full text-xs text-slate-200"
                        />
                        <button
                          type="button"
                          className="cta rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] disabled:opacity-60"
                          disabled={!token || !mainSneakers || !mainSneakersBannerFile || catalogBusy}
                          onClick={async () => {
                            if (!token || !mainSneakers || !mainSneakersBannerFile) return;
                            const url = await uploadFile(mainSneakersBannerFile, "catalog/banners");
                            await updateCatalogNode(mainSneakers.id, { banner_url: url });
                            setMainSneakersBannerFile(null);
                          }}
                        >
                          Salvar banner
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-200">Vestuário</p>
                        {mainVestuario?.banner_url ? (
                          <a
                            href={mainVestuario.banner_url}
                            target="_blank"
                            className="text-xs text-slate-300 underline"
                          >
                            ver imagem
                          </a>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setMainVestuarioBannerFile(e.target.files?.[0] ?? null)}
                          className="block w-full text-xs text-slate-200"
                        />
                        <button
                          type="button"
                          className="cta rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] disabled:opacity-60"
                          disabled={!token || !mainVestuario || !mainVestuarioBannerFile || catalogBusy}
                          onClick={async () => {
                            if (!token || !mainVestuario || !mainVestuarioBannerFile) return;
                            const url = await uploadFile(mainVestuarioBannerFile, "catalog/banners");
                            await updateCatalogNode(mainVestuario.id, { banner_url: url });
                            setMainVestuarioBannerFile(null);
                          }}
                        >
                          Salvar banner
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Editor inline */}
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">
                    Editar item (nome/slug/ordem + foto)
                  </p>
                  {!editingCatalog ? (
                    <p className="mt-3 text-sm text-slate-200">
                      Clique em <b>Editar</b> em alguma lista abaixo.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-300">
                          {editingCatalog.kind} · {editingCatalog.label}
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="block">
                            <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Nome</span>
                            <input
                              value={editCatalogLabel}
                              onChange={(e) => setEditCatalogLabel(e.target.value)}
                              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Ordem</span>
                            <input
                              type="number"
                              value={editCatalogSort}
                              onChange={(e) => setEditCatalogSort(Number(e.target.value))}
                              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                            />
                          </label>
                          <label className="block sm:col-span-2">
                            <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Slug</span>
                            <input
                              value={editCatalogSlug}
                              onChange={(e) => setEditCatalogSlug(e.target.value)}
                              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                            />
                          </label>
                        </div>

                        {editingCatalog.kind === "brand" ? (
                          <div className="mt-3">
                            <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Logo (upload)</p>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => setEditLogoFile(e.target.files?.[0] ?? null)}
                              className="mt-2 block w-full text-xs text-slate-200"
                            />
                          </div>
                        ) : null}

                        {editingCatalog.kind === "main" || editingCatalog.kind === "subcategory" ? (
                          <div className="mt-3">
                            <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Banner (upload)</p>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => setEditBannerFile(e.target.files?.[0] ?? null)}
                              className="mt-2 block w-full text-xs text-slate-200"
                            />
                          </div>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="cta rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] disabled:opacity-60"
                            onClick={saveEditCatalog}
                            disabled={catalogBusy}
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                            onClick={() => setEditingCatalog(null)}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                            onClick={() => deleteCatalogNode(editingCatalog.id)}
                            disabled={catalogBusy}
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Vestuário */}
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">
                      Vestuário · Subcategorias
                    </p>
                    <span className="text-xs text-slate-400">{vestSubs.length}</span>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Criar subcategoria</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <input
                          value={vestLabel}
                          onChange={(e) => {
                            setVestLabel(e.target.value);
                            if (!vestSlug.trim()) setVestSlug(slugify(e.target.value));
                          }}
                          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                          placeholder="Ex.: Bermuda"
                        />
                        <input
                          type="number"
                          value={vestSort}
                          onChange={(e) => setVestSort(Number(e.target.value))}
                          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                        />
                        <input
                          value={vestSlug}
                          onChange={(e) => setVestSlug(e.target.value)}
                          className="sm:col-span-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                          placeholder="slug (ex.: bermuda)"
                        />
                      </div>
                      <button
                        type="button"
                        className="mt-3 cta rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] disabled:opacity-60"
                        disabled={!token || !mainVestuario || !vestLabel.trim() || catalogBusy}
                        onClick={async () => {
                          if (!token || !mainVestuario) return;
                          await createCatalogNode({
                            kind: "subcategory",
                            parent_id: mainVestuario.id,
                            label: vestLabel.trim(),
                            slug: (vestSlug.trim() || slugify(vestLabel)).trim(),
                            sort_order: vestSort,
                          });
                          setVestLabel("");
                          setVestSlug("");
                          setVestSort(10);
                        }}
                      >
                        Criar
                      </button>
                    </div>

                    <div className="grid gap-2">
                      {vestSubs.map((s) => (
                        <div key={s.id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-200">{s.label}</p>
                              <p className="mt-1 text-xs text-slate-400">{s.slug}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="cta-secondary rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                                onClick={() => startEditCatalog(s)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="cta-secondary rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                                onClick={() => deleteCatalogNode(s.id)}
                                disabled={catalogBusy}
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sneakers */}
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">
                      Sneakers · Marcas e Linhas
                    </p>
                    <span className="text-xs text-slate-400">{brands.length}</span>
                  </div>

                  {/* Criar marca */}
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Criar marca (logo por upload)</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <input
                        value={brandLabel}
                        onChange={(e) => {
                          setBrandLabel(e.target.value);
                          if (!brandSlug.trim()) setBrandSlug(slugify(e.target.value));
                        }}
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                        placeholder="Ex.: Nike"
                      />
                      <input
                        type="number"
                        value={brandSort}
                        onChange={(e) => setBrandSort(Number(e.target.value))}
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                      />
                      <input
                        value={brandSlug}
                        onChange={(e) => setBrandSlug(e.target.value)}
                        className="sm:col-span-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                        placeholder="slug (ex.: nike)"
                      />
                      <div className="sm:col-span-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setBrandLogoFile(e.target.files?.[0] ?? null)}
                          className="block w-full text-xs text-slate-200"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="mt-3 cta rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] disabled:opacity-60"
                      disabled={!token || !mainSneakers || !brandLabel.trim() || !brandLogoFile || catalogBusy}
                      onClick={async () => {
                        if (!token || !mainSneakers || !brandLogoFile) return;
                        const logo = await uploadFile(brandLogoFile, "catalog/brand-logos");
                        await createCatalogNode({
                          kind: "brand",
                          parent_id: mainSneakers.id,
                          label: brandLabel.trim(),
                          slug: (brandSlug.trim() || slugify(brandLabel)).trim(),
                          logo_url: logo,
                          sort_order: brandSort,
                        });
                        setBrandLabel("");
                        setBrandSlug("");
                        setBrandSort(10);
                        setBrandLogoFile(null);
                      }}
                    >
                      Criar marca
                    </button>
                  </div>

                  {/* Criar linha */}
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Criar linha (dentro de uma marca)</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <select
                        value={lineBrandId}
                        onChange={(e) => setLineBrandId(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                      >
                        <option value="">Selecione a marca</option>
                        {brands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={lineSort}
                        onChange={(e) => setLineSort(Number(e.target.value))}
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                      />
                      <input
                        value={lineLabel}
                        onChange={(e) => {
                          setLineLabel(e.target.value);
                          if (!lineSlug.trim()) setLineSlug(slugify(e.target.value));
                        }}
                        className="sm:col-span-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                        placeholder="Ex.: Air Force"
                      />
                      <input
                        value={lineSlug}
                        onChange={(e) => setLineSlug(e.target.value)}
                        className="sm:col-span-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                        placeholder="slug (ex.: air-force)"
                      />
                    </div>
                    <button
                      type="button"
                      className="mt-3 cta rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] disabled:opacity-60"
                      disabled={!token || !lineBrandId || !lineLabel.trim() || catalogBusy}
                      onClick={async () => {
                        if (!token) return;
                        await createCatalogNode({
                          kind: "line",
                          parent_id: lineBrandId,
                          label: lineLabel.trim(),
                          slug: (lineSlug.trim() || slugify(lineLabel)).trim(),
                          sort_order: lineSort,
                        });
                        setLineLabel("");
                        setLineSlug("");
                        setLineSort(10);
                      }}
                    >
                      Criar linha
                    </button>
                  </div>

                  {/* Lista */}
                  <div className="mt-4 space-y-2">
                    {brands.map((b) => {
                      const lines = catalog.filter((n) => n.kind === "line" && n.parent_id === b.id).sort((a,b2)=>a.sort_order-b2.sort_order);
                      return (
                        <div key={b.id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-200">{b.label}</p>
                              <p className="mt-1 text-xs text-slate-400">{b.slug}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="cta-secondary rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                                onClick={() => startEditCatalog(b)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="cta-secondary rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                                onClick={() => deleteCatalogNode(b.id)}
                                disabled={catalogBusy}
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                          {lines.length ? (
                            <div className="mt-3 grid gap-2">
                              {lines.map((l) => (
                                <div key={l.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="text-sm text-slate-200">{l.label}</p>
                                      <p className="mt-1 text-xs text-slate-400">{l.slug}</p>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        className="cta-secondary rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                                        onClick={() => startEditCatalog(l)}
                                      >
                                        Editar
                                      </button>
                                      <button
                                        type="button"
                                        className="cta-secondary rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                                        onClick={() => deleteCatalogNode(l.id)}
                                        disabled={catalogBusy}
                                      >
                                        Remover
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-3 text-xs text-slate-400">Sem linhas ainda.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </section>

        {/* Landing (texto editável) */}
        <section className="mt-10 section-shell rounded-3xl p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold uppercase tracking-[0.12em] text-slate-200">
                Landing · Textos editáveis
              </h2>
              <p className="mt-2 text-sm text-slate-200">
                Isso <b>não apaga</b> a landing. Apenas troca os textos por valores do banco.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Pré-requisito: rode o arquivo <span className="text-slate-200">supabase_landing_content.sql</span> no Supabase.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => token && loadLanding(token)}
                disabled={!token || landingLoading}
                className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] disabled:opacity-60"
              >
                Recarregar do banco
              </button>
              <button
                type="button"
                onClick={() => {
                  setLandingContent(defaultLandingContent);
                  setLandingAdvancedJson(
                    JSON.stringify(defaultLandingContent, null, 2)
                  );
                  setLandingMsg("Padrão local carregado (ainda não salvo).");
                }}
                disabled={landingLoading}
                className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] disabled:opacity-60"
              >
                Restaurar padrão
              </button>
              <button
                type="button"
                onClick={() => token && saveLanding(token)}
                disabled={!token || landingLoading}
                className="cta rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] disabled:opacity-60"
              >
                Salvar
              </button>
              <Link
                href="/"
                target="_blank"
                className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
              >
                Abrir preview
              </Link>
            </div>
          </div>

          {landingMsg ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              {landingMsg}
            </div>
          ) : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.95fr]">
            {/* Editor visual */}
            <div className="space-y-4">
              <details className="rounded-2xl border border-white/10 bg-white/5 p-4" open>
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">
                  Intro (primeira dobra)
                </summary>
                <div className="mt-4 grid gap-3">
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Badge</span>
                    <input
                      value={landingContent.intro.badge ?? ""}
                      onChange={(e) =>
                        setLandingContent((prev) => ({
                          ...prev,
                          intro: { ...prev.intro, badge: e.target.value },
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Título</span>
                    <input
                      value={landingContent.intro.title ?? ""}
                      onChange={(e) =>
                        setLandingContent((prev) => ({
                          ...prev,
                          intro: { ...prev.intro, title: e.target.value },
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Subtítulo</span>
                    <textarea
                      value={landingContent.intro.subtitle ?? ""}
                      onChange={(e) =>
                        setLandingContent((prev) => ({
                          ...prev,
                          intro: { ...prev.intro, subtitle: e.target.value },
                        }))
                      }
                      className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Botão 1</span>
                      <input
                        value={landingContent.intro.ctaEnter ?? ""}
                        onChange={(e) =>
                          setLandingContent((prev) => ({
                            ...prev,
                            intro: { ...prev.intro, ctaEnter: e.target.value },
                          }))
                        }
                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Botão 2</span>
                      <input
                        value={landingContent.intro.ctaWhatsapp ?? ""}
                        onChange={(e) =>
                          setLandingContent((prev) => ({
                            ...prev,
                            intro: { ...prev.intro, ctaWhatsapp: e.target.value },
                          }))
                        }
                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                      />
                    </label>
                  </div>
                </div>
              </details>

              <details className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">
                  Botões / WhatsApp
                </summary>
                <div className="mt-4 grid gap-3">
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Link do WhatsApp</span>
                    <input
                      value={landingContent.whatsappLink ?? ""}
                      onChange={(e) =>
                        setLandingContent((prev) => ({ ...prev, whatsappLink: e.target.value }))
                      }
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                    />
                  </label>
                </div>
              </details>

              <details className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">
                  Hero (seção principal)
                </summary>
                <div className="mt-4 grid gap-3">
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Badge</span>
                    <input
                      value={landingContent.hero.badge ?? ""}
                      onChange={(e) =>
                        setLandingContent((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, badge: e.target.value },
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Título</span>
                    <input
                      value={landingContent.hero.title ?? ""}
                      onChange={(e) =>
                        setLandingContent((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, title: e.target.value },
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Subtítulo</span>
                    <textarea
                      value={landingContent.hero.subtitle ?? ""}
                      onChange={(e) =>
                        setLandingContent((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, subtitle: e.target.value },
                        }))
                      }
                      className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs uppercase tracking-[0.12em] text-slate-300">CTA WhatsApp</span>
                      <input
                        value={landingContent.hero.ctaSpecialist ?? ""}
                        onChange={(e) =>
                          setLandingContent((prev) => ({
                            ...prev,
                            hero: { ...prev.hero, ctaSpecialist: e.target.value },
                          }))
                        }
                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs uppercase tracking-[0.12em] text-slate-300">CTA Catálogo</span>
                      <input
                        value={landingContent.hero.ctaCatalog ?? ""}
                        onChange={(e) =>
                          setLandingContent((prev) => ({
                            ...prev,
                            hero: { ...prev.hero, ctaCatalog: e.target.value },
                          }))
                        }
                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                      />
                    </label>
                  </div>
                </div>
              </details>

              <details className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">
                  Highlights (cards)
                </summary>
                <div className="mt-4 space-y-3">
                  {landingContent.highlights.map((h, idx) => (
                    <div key={`${h.title}-${idx}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">
                          Item {idx + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setLandingContent((prev) => ({
                              ...prev,
                              highlights: prev.highlights.filter((_, i) => i !== idx),
                            }))
                          }
                          className="cta-secondary rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
                        >
                          Remover
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3">
                        <input
                          value={h.title ?? ""}
                          onChange={(e) =>
                            setLandingContent((prev) => ({
                              ...prev,
                              highlights: prev.highlights.map((x, i) =>
                                i === idx ? { ...x, title: e.target.value } : x
                              ),
                            }))
                          }
                          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                          placeholder="Título"
                        />
                        <textarea
                          value={h.description ?? ""}
                          onChange={(e) =>
                            setLandingContent((prev) => ({
                              ...prev,
                              highlights: prev.highlights.map((x, i) =>
                                i === idx ? { ...x, description: e.target.value } : x
                              ),
                            }))
                          }
                          className="min-h-20 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                          placeholder="Descrição"
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setLandingContent((prev) => ({
                        ...prev,
                        highlights: [
                          ...prev.highlights,
                          { title: null, description: null },
                        ],
                      }))
                    }
                    className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                  >
                    Adicionar highlight
                  </button>
                </div>
              </details>

              <details className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">
                  FAQ
                </summary>
                <div className="mt-4 space-y-3">
                  {landingContent.faqs.map((f, idx) => (
                    <div key={`${f.question}-${idx}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">
                          Pergunta {idx + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setLandingContent((prev) => ({
                              ...prev,
                              faqs: prev.faqs.filter((_, i) => i !== idx),
                            }))
                          }
                          className="cta-secondary rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
                        >
                          Remover
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3">
                        <input
                          value={f.question ?? ""}
                          onChange={(e) =>
                            setLandingContent((prev) => ({
                              ...prev,
                              faqs: prev.faqs.map((x, i) =>
                                i === idx ? { ...x, question: e.target.value } : x
                              ),
                            }))
                          }
                          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                          placeholder="Pergunta"
                        />
                        <textarea
                          value={f.answer ?? ""}
                          onChange={(e) =>
                            setLandingContent((prev) => ({
                              ...prev,
                              faqs: prev.faqs.map((x, i) =>
                                i === idx ? { ...x, answer: e.target.value } : x
                              ),
                            }))
                          }
                          className="min-h-24 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                          placeholder="Resposta"
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setLandingContent((prev) => ({
                        ...prev,
                        faqs: [
                          ...prev.faqs,
                          { question: null, answer: null },
                        ],
                      }))
                    }
                    className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                  >
                    Adicionar pergunta
                  </button>
                </div>
              </details>

              <details className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">
                  Modo avançado (JSON)
                </summary>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-300">
                    Só para debug. O visual editor é o recomendado.
                  </p>
                  <button
                    type="button"
                    onClick={() => setLandingShowAdvanced((v) => !v)}
                    className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                  >
                    {landingShowAdvanced ? "Esconder" : "Mostrar"}
                  </button>
                </div>
                {landingShowAdvanced ? (
                  <div className="mt-4 space-y-3">
                    <textarea
                      value={landingAdvancedJson}
                      onChange={(e) => setLandingAdvancedJson(e.target.value)}
                      spellCheck={false}
                      className="min-h-[260px] w-full rounded-2xl border border-white/10 bg-black/20 p-4 font-mono text-xs text-slate-100 outline-none focus:border-[#f2d3a8]/40"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            const parsed = JSON.parse(landingAdvancedJson) as LandingContent;
                            setLandingContent(parsed);
                            setLandingMsg("JSON aplicado no editor (ainda não salvo).");
                          } catch {
                            setLandingMsg("JSON inválido.");
                          }
                        }}
                        className="cta rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                      >
                        Aplicar JSON no editor
                      </button>
                      <button
                        type="button"
                        onClick={() => setLandingAdvancedJson(JSON.stringify(landingContent, null, 2))}
                        className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                      >
                        Gerar JSON do editor
                      </button>
                    </div>
                  </div>
                ) : null}
              </details>
            </div>

            {/* Prévia rápida */}
            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                  Prévia (rápida)
                </p>
                <h3 className="mt-2 text-3xl text-[#f2d3a8]">
                  {landingContent.intro.title ?? ""}
                </h3>
                <p className="mt-2 text-sm text-slate-200">
                  {landingContent.intro.subtitle ?? ""}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="badge rounded-full px-3 py-1 text-[11px]">
                    {landingContent.intro.ctaEnter ?? ""}
                  </span>
                  <span className="badge rounded-full px-3 py-1 text-[11px]">
                    {landingContent.intro.ctaWhatsapp ?? ""}
                  </span>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                  Hero
                </p>
                <p className="mt-2 text-sm text-slate-200">{landingContent.hero.badge}</p>
                <h3 className="mt-2 text-2xl text-[#f2d3a8]">{landingContent.hero.title ?? ""}</h3>
                <p className="mt-2 text-sm text-slate-200">{landingContent.hero.subtitle ?? ""}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="badge rounded-full px-3 py-1 text-[11px]">
                    {landingContent.hero.ctaSpecialist ?? ""}
                  </span>
                  <span className="badge rounded-full px-3 py-1 text-[11px]">
                    {landingContent.hero.ctaCatalog ?? ""}
                  </span>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                  Highlights ({landingContent.highlights.length})
                </p>
                <div className="mt-3 space-y-2">
                  {landingContent.highlights.slice(0, 3).map((h, idx) => (
                    <div key={`${h.title}-${idx}`} className="rounded-2xl border border-white/10 bg-black/10 p-3">
                      <p className="text-sm font-semibold text-slate-100">{h.title ?? ""}</p>
                      <p className="mt-1 text-xs text-slate-300">{h.description ?? ""}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                  FAQ ({landingContent.faqs.length})
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  Exemplo: {landingContent.faqs[0]?.question ?? "—"}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


