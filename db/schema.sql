-- ============================================================
-- Feirinha Orgânica Terra Viva — Schema completo
-- Rodar no Supabase SQL Editor após ativar Lovable Cloud.
-- ============================================================

do $$ begin create type app_role as enum ('buyer','admin'); exception when duplicate_object then null; end $$;
do $$ begin create type order_status as enum ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_status as enum ('pending','paid','failed','refunded'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_method as enum ('pix','cash','card'); exception when duplicate_object then null; end $$;
do $$ begin create type delivery_type as enum ('delivery','pickup'); exception when duplicate_object then null; end $$;
do $$ begin create type coupon_type as enum ('percentage','fixed'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, email text, phone text, avatar_url text,
  cep text, address text, number text, complement text, neighborhood text, city text, state text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null, unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;

create policy "profiles_read" on public.profiles for select to authenticated using (auth.uid()=id or public.has_role(auth.uid(),'admin'));
create policy "profiles_update" on public.profiles for update to authenticated using (auth.uid()=id);
create policy "profiles_insert" on public.profiles for insert to authenticated with check (auth.uid()=id);
create policy "roles_read" on public.user_roles for select to authenticated using (user_id=auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,email,full_name) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1))) on conflict do nothing;
  insert into public.user_roles(user_id,role) values(new.id,'buyer') on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table if not exists public.store_settings (
  id uuid primary key default gen_random_uuid(),
  name text default 'Feirinha Orgânica - Terra Viva',
  description text, whatsapp text, phone text, email text, address text,
  logo_url text, cover_url text,
  primary_color text default '#059669', secondary_color text default '#d97706',
  opening_hours jsonb default '{}'::jsonb,
  delivery_fee numeric(10,2) default 0, delivery_type text default 'fixed',
  delivery_distance_rates jsonb default '[]'::jsonb,
  delivery_time_min int default 30, delivery_radius_km numeric(5,2) default 5,
  pix_enabled boolean default false, pix_key text, pix_key_type text,
  cash_enabled boolean default true, card_enabled boolean default true,
  mercado_pago_access_token text, mercado_pago_public_key text,
  mercado_pago_refresh_token text, mercado_pago_user_id text,
  about_text text, about_images jsonb default '[]'::jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
grant select on public.store_settings to anon, authenticated;
grant all on public.store_settings to service_role;
alter table public.store_settings enable row level security;
create policy "settings_read" on public.store_settings for select using (true);
create policy "settings_write" on public.store_settings for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text unique not null, icon text,
  sort_order int default 0, is_active boolean default true, created_at timestamptz default now()
);
grant select on public.categories to anon, authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "cat_read" on public.categories for select using (true);
create policy "cat_admin" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text unique not null, description text,
  category_id uuid references public.categories(id),
  base_price numeric(10,2) not null default 0,
  unit_prices jsonb not null default '{}'::jsonb,
  promotional_price numeric(10,2),
  promotional_start timestamptz, promotional_end timestamptz,
  stock jsonb default '{}'::jsonb, images jsonb default '[]'::jsonb,
  tags text[] default '{}', is_active boolean default true, is_featured boolean default false,
  nutritional_info jsonb, created_at timestamptz default now(), updated_at timestamptz default now()
);
grant select on public.products to anon, authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "prod_read" on public.products for select using (is_active=true);
create policy "prod_admin" on public.products for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null, type coupon_type not null, value numeric(10,2) not null,
  max_uses int default 0, current_uses int default 0,
  start_date timestamptz, end_date timestamptz,
  applicable_products jsonb, is_active boolean default true,
  created_at timestamptz default now()
);
grant select on public.coupons to anon, authenticated;
grant all on public.coupons to service_role;
alter table public.coupons enable row level security;
create policy "coup_read" on public.coupons for select using (is_active and (end_date is null or end_date>now()));
create policy "coup_admin" on public.coupons for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create sequence if not exists public.order_number_seq;
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null default 'ORD-'||lpad(nextval('public.order_number_seq')::text,6,'0'),
  user_id uuid references auth.users(id) on delete cascade,
  status order_status default 'pending', payment_status payment_status default 'pending',
  payment_method payment_method, payment_id text,
  subtotal numeric(10,2) not null, delivery_fee numeric(10,2) default 0,
  discount numeric(10,2) default 0, total numeric(10,2) not null,
  coupon_id uuid references public.coupons(id),
  delivery_type delivery_type default 'delivery',
  address jsonb, change_for numeric(10,2), notes text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
grant select, insert, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "ord_read" on public.orders for select to authenticated using (user_id=auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "ord_insert" on public.orders for insert to authenticated with check (user_id=auth.uid());
create policy "ord_update" on public.orders for update to authenticated using (public.has_role(auth.uid(),'admin'));

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text, product_image text, unit_type text,
  quantity int, unit_price numeric(10,2), total_price numeric(10,2),
  created_at timestamptz default now()
);
grant select, insert on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "oi_read" on public.order_items for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.has_role(auth.uid(),'admin'))));
create policy "oi_insert" on public.order_items for insert to authenticated with check (exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid()));

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  status order_status not null, notes text,
  created_by uuid references auth.users(id), created_at timestamptz default now()
);
grant select, insert on public.order_status_history to authenticated;
grant all on public.order_status_history to service_role;
alter table public.order_status_history enable row level security;
create policy "osh_read" on public.order_status_history for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.has_role(auth.uid(),'admin'))));
create policy "osh_insert" on public.order_status_history for insert to authenticated with check (public.has_role(auth.uid(),'admin'));

insert into public.store_settings(name) values('Feirinha Orgânica - Terra Viva') on conflict do nothing;
insert into public.categories(name,slug,icon,sort_order) values
  ('Verduras','verduras','Leaf',1),('Frutas','frutas','Apple',2),('Legumes','legumes','Carrot',3),
  ('Temperos','temperos','Sprout',4),('Orgânicos','organicos','Flower2',5),('Grãos','graos','Wheat',6),
  ('Laticínios','laticinios','Milk',7),('Bebidas','bebidas','CupSoda',8),('Outros','outros','Package',9)
on conflict (slug) do nothing;

-- Storage buckets (criar no painel): avatars, products, store — todos públicos.
