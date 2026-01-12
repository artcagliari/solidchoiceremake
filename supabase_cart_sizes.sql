-- Adiciona suporte a tamanho no carrinho e no pedido (WhatsApp/Admin)
-- Rode este SQL no Supabase (SQL Editor).

alter table public.cart_items
add column if not exists size text;

alter table public.order_items
add column if not exists size text;

