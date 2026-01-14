-- Adiciona campos para fluxo de pagamento + endereço do pedido
alter table public.orders
  add column if not exists public_token text,
  add column if not exists payment_link text,
  add column if not exists shipping_name text,
  add column if not exists shipping_phone text,
  add column if not exists shipping_address text,
  add column if not exists shipping_city text,
  add column if not exists shipping_state text,
  add column if not exists shipping_zip text,
  add column if not exists shipping_notes text;

-- Token público para link do pedido
create unique index if not exists orders_public_token_uidx
  on public.orders(public_token);
