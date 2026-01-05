-- CRITICAL FIX: DROP TABLES TO RESOLVE TYPE CONFLICTS
-- WARNING: This will delete existing data. Since you are setting up, this is the cleanest way.

drop table if exists bill_items;
drop table if exists bills;
drop table if exists repairs;
drop table if exists products;

-- Re-enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PRODUCTS (UUID)
create table products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  price numeric not null,
  quantity integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. BILLS (UUID)
create table bills (
  id uuid default uuid_generate_v4() primary key,
  customer_name text,
  customer_phone text,
  total_amount numeric not null,
  gst_applied boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. BILL ITEMS (UUID Foreign Keys)
-- Note: product_id is NULLABLE to allow for manual items (e.g. Service Charges)
create table bill_items (
  id uuid default uuid_generate_v4() primary key,
  bill_id uuid references bills(id) on delete cascade not null,
  product_id uuid references products(id), 
  product_name text not null,
  quantity integer not null,
  price_at_sale numeric not null
);

-- 4. REPAIRS (UUID)
create table repairs (
  id uuid default uuid_generate_v4() primary key,
  customer_name text not null,
  contact_number text,
  device_details text not null,
  issue_description text,
  status text check (status in ('Received', 'In Process', 'Part Not Available', 'Repaired', 'Delivered')) default 'Received',
  custom_message text,
  estimated_cost numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS POLICIES
alter table products enable row level security;
alter table bills enable row level security;
alter table bill_items enable row level security;
alter table repairs enable row level security;

create policy "Public Access Products" on products for all using (true) with check (true);
create policy "Public Access Bills" on bills for all using (true) with check (true);
create policy "Public Access Bill Items" on bill_items for all using (true) with check (true);
create policy "Public Access Repairs" on repairs for all using (true) with check (true);
