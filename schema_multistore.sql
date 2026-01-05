-- MULTI-STORE SCHEMA MIGRATION
-- WARNING: This will WIPE existing data.

-- 1. CLEANUP
drop table if exists inventory_requests;
drop table if exists bill_items;
drop table if exists bills;
drop table if exists repairs;
drop table if exists products;
drop table if exists user_roles;
drop table if exists stores;

-- Enable UUID
create extension if not exists "uuid-ossp";

-- 2. STORES
create table stores (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  location text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. USER ROLES (Links auth.users to stores)
create table user_roles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  store_id uuid references stores(id), -- Nullable for Super Admin
  role text check (role in ('super_admin', 'store_admin')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id) -- One role per user for MVP
);

-- 4. PRODUCTS (Per Store)
create table products (
  id uuid default uuid_generate_v4() primary key,
  store_id uuid references stores(id) on delete cascade not null,
  name text not null,
  price numeric not null,
  quantity integer not null default 0,
  serial_number text, -- Comma separated or JSON
  vendor_name text,
  location_from text,
  courier_charges numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. BILLS (Per Store)
create table bills (
  id uuid default uuid_generate_v4() primary key,
  store_id uuid references stores(id) on delete cascade not null,
  customer_name text,
  customer_phone text,
  total_amount numeric not null,
  gst_applied boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. BILL ITEMS
create table bill_items (
  id uuid default uuid_generate_v4() primary key,
  bill_id uuid references bills(id) on delete cascade not null,
  store_id uuid references stores(id) on delete cascade not null, -- Denormalized for easier RLS
  product_id uuid references products(id),
  product_name text not null,
  quantity integer not null,
  price_at_sale numeric not null
);

-- 7. REPAIRS (Per Store)
create table repairs (
  id uuid default uuid_generate_v4() primary key,
  store_id uuid references stores(id) on delete cascade not null,
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

-- 8. INVENTORY REQUESTS (Query Page)
create table inventory_requests (
  id uuid default uuid_generate_v4() primary key,
  store_id uuid references stores(id) on delete cascade not null,
  product_name text not null,
  quantity integer not null,
  customer_name text,
  customer_phone text,
  status text check (status in ('Pending', 'Ordered', 'Fulfilled', 'Cancelled')) default 'Pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. RLS POLICIES

-- Enable RLS
alter table stores enable row level security;
alter table user_roles enable row level security;
alter table products enable row level security;
alter table bills enable row level security;
alter table bill_items enable row level security;
alter table repairs enable row level security;
alter table inventory_requests enable row level security;

-- Helper Function to get current user's role and store
-- (Note: In a real prod app, use Custom Claims or a secure definer function. For MVP, we query user_roles).

-- POLICY: STORES
-- Super Admin: All Access
-- Store Admin: Read Own Store
create policy "Super Admin Manage Stores" on stores
  for all using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'super_admin')
  );

create policy "Store Admin Read Own Store" on stores
  for select using (
    id in (select store_id from user_roles where user_id = auth.uid())
  );

-- POLICY: USER_ROLES
-- Super Admin can manage roles
-- Users can read their own role
create policy "Super Admin Manage Roles" on user_roles
  for all using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'super_admin')
  );

create policy "Read Own Role" on user_roles
  for select using (
    user_id = auth.uid()
  );

-- POLICY: PRODUCTS
create policy "Access Products" on products
  for all using (
    -- Super Admin: access all
    (exists (select 1 from user_roles where user_id = auth.uid() and role = 'super_admin'))
    OR
    -- Store Admin: access own store
    (store_id in (select store_id from user_roles where user_id = auth.uid()))
  );

-- POLICY: BILLS
create policy "Access Bills" on bills
  for all using (
    (exists (select 1 from user_roles where user_id = auth.uid() and role = 'super_admin'))
    OR
    (store_id in (select store_id from user_roles where user_id = auth.uid()))
  );

-- POLICY: BILL ITEMS
create policy "Access Bill Items" on bill_items
  for all using (
    (exists (select 1 from user_roles where user_id = auth.uid() and role = 'super_admin'))
    OR
    (store_id in (select store_id from user_roles where user_id = auth.uid()))
  );

-- POLICY: REPAIRS
create policy "Access Repairs" on repairs
  for all using (
    (exists (select 1 from user_roles where user_id = auth.uid() and role = 'super_admin'))
    OR
    (store_id in (select store_id from user_roles where user_id = auth.uid()))
  );

-- POLICY: INVENTORY REQUESTS
create policy "Access Inventory Requests" on inventory_requests
  for all using (
    (exists (select 1 from user_roles where user_id = auth.uid() and role = 'super_admin'))
    OR
    (store_id in (select store_id from user_roles where user_id = auth.uid()))
  );

-- 10. REALTIME
-- Add tables to realtime publication if needed (optional for MVP)
alter publication supabase_realtime add table products;
alter publication supabase_realtime add table repairs;
alter publication supabase_realtime add table inventory_requests;
