-- Catálogo hierárquico: categoria principal -> subcategoria -> (sneakers) linha
-- Rode no Supabase SQL Editor

create table if not exists catalog_nodes (
  id uuid primary key default gen_random_uuid(),
  kind text not null, -- main | subcategory | brand | line
  parent_id uuid references catalog_nodes(id) on delete cascade,
  label text not null,
  slug text not null unique,
  logo_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Seeds: principais
insert into catalog_nodes (kind, parent_id, label, slug, sort_order)
values
  ('main', null, 'Sneakers', 'sneakers', 10),
  ('main', null, 'Vestuário', 'vestuario', 20)
on conflict (slug) do nothing;

-- Subcategorias de vestuário (exemplo)
insert into catalog_nodes (kind, parent_id, label, slug, sort_order)
select 'subcategory', m.id, x.label, x.slug, x.sort_order
from catalog_nodes m
cross join (
  values
    ('Bermuda','bermuda',10),
    ('Camiseta','camiseta',20),
    ('Calça','calca',30)
) as x(label, slug, sort_order)
where m.slug = 'vestuario'
on conflict (slug) do nothing;

-- Sneakers: marca + linha (exemplo Nike -> Air Force)
insert into catalog_nodes (kind, parent_id, label, slug, sort_order)
select 'brand', m.id, 'Nike', 'nike', 10
from catalog_nodes m
where m.slug = 'sneakers'
on conflict (slug) do nothing;

insert into catalog_nodes (kind, parent_id, label, slug, sort_order)
select 'line', b.id, 'Air Force', 'air-force', 10
from catalog_nodes b
where b.slug = 'nike'
on conflict (slug) do nothing;

-- Products: vínculo opcional com o catálogo (aponta para subcategory ou line)
alter table products add column if not exists catalog_node_id uuid references catalog_nodes(id);


