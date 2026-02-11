-- Tabela para armazenar 1 endereço por usuário (editável)
create table if not exists public.user_addresses (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text,
  address text,
  city text,
  state text,
  zip text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Atualiza updated_at automaticamente (se a extensão estiver disponível)
do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    execute 'create trigger trg_user_addresses_updated_at
      before update on public.user_addresses
      for each row execute procedure set_updated_at()';
  end if;
exception when others then
  -- ignora se não puder criar trigger
  null;
end $$;
