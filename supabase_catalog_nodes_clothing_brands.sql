-- Adiciona suporte a marcas de Vestuário por subcategoria (roupa)
-- Rode no Supabase SQL Editor.
--
-- Este projeto usa a tabela catalog_nodes com kind:
-- main | subcategory | brand | line | clothing_brand

-- Não existe CHECK constraint no SQL atual, mas se no seu banco tiver uma,
-- você pode ajustar manualmente para aceitar 'clothing_brand'.
-- (Como o nome do constraint pode variar, aqui só documentamos.)

-- Exemplo de seed (opcional):
-- 1) Encontra a subcategoria "bermuda" e cria marcas dentro dela.
insert into catalog_nodes (kind, parent_id, label, slug, sort_order)
select 'clothing_brand', s.id, x.label, x.slug, x.sort_order
from catalog_nodes s
cross join (
  values
    ('Nike','vest-bermuda-nike',10),
    ('Adidas','vest-bermuda-adidas',20)
) as x(label, slug, sort_order)
where s.kind = 'subcategory' and s.slug = 'bermuda'
on conflict (slug) do nothing;

