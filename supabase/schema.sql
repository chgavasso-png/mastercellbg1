create table if not exists public.records (
  collection text not null,
  id text not null,
  created_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb,
  primary key (collection, id)
);

create index if not exists records_customer_idx on public.records ((data->>'customerId')) where collection in ('orders', 'repairs');

create table if not exists public.admins (
  user_id uuid primary key references auth.users on delete cascade
);

create table if not exists public.counters (
  name text primary key,
  value bigint not null
);

insert into public.counters (name, value) values ('order', 1200), ('repair', 2500)
on conflict (name) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.next_number(kind text)
returns bigint
language sql
security definer
set search_path = public
as $$
  update public.counters set value = value + 1 where name = kind returning value;
$$;

create or replace function public.track_repair(code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'protocol', data->>'protocol',
    'device', data->>'device',
    'status', data->>'status',
    'quote', data->'quote',
    'note', data->>'note'
  )
  from public.records
  where collection = 'repairs' and lower(data->>'protocol') = lower(trim(code))
  limit 1;
$$;

create or replace function public.apply_order_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(coalesce(new.data->'items', '[]'::jsonb)) loop
    update public.records
    set data = jsonb_set(
      data,
      '{stock}',
      to_jsonb(greatest(0, coalesce((data->>'stock')::int, 0) - coalesce((item->>'qty')::int, 0)))
    )
    where collection = 'products' and id = item->>'productId';
  end loop;
  return new;
end;
$$;

drop trigger if exists order_stock on public.records;
create trigger order_stock
after insert on public.records
for each row
when (new.collection = 'orders')
execute function public.apply_order_stock();

create or replace function public.handle_new_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data ? 'customer' then
    insert into public.records (collection, id, created_at, data)
    values (
      'customers',
      new.id::text,
      now(),
      (new.raw_user_meta_data->'customer') || jsonb_build_object('email', new.email)
    )
    on conflict (collection, id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_customer();

alter table public.records enable row level security;
alter table public.admins enable row level security;
alter table public.counters enable row level security;

drop policy if exists "records_select" on public.records;
create policy "records_select" on public.records for select using (
  collection in ('products', 'promotions', 'posts', 'settings')
  or public.is_admin()
  or (collection = 'customers' and id = auth.uid()::text)
  or (collection in ('orders', 'repairs') and data->>'customerId' = auth.uid()::text)
);

drop policy if exists "records_insert" on public.records;
create policy "records_insert" on public.records for insert with check (
  public.is_admin()
  or (collection = 'orders' and data->>'status' = 'pendente')
  or (collection = 'repairs' and data->>'status' = 'recebido')
  or (collection = 'customers' and (auth.uid() is null or id = auth.uid()::text))
);

drop policy if exists "records_update" on public.records;
create policy "records_update" on public.records for update
using (public.is_admin() or (collection = 'customers' and id = auth.uid()::text))
with check (public.is_admin() or (collection = 'customers' and id = auth.uid()::text));

drop policy if exists "records_delete" on public.records;
create policy "records_delete" on public.records for delete using (public.is_admin());

drop policy if exists "admins_self" on public.admins;
create policy "admins_self" on public.admins for select using (user_id = auth.uid());

revoke execute on function public.next_number(text) from public;
grant execute on function public.next_number(text) to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.records;
exception when duplicate_object then null;
end;
$$;
