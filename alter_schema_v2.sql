-- SCHEMA UPDATE V2
-- Run this in Supabase SQL Editor

-- 1. Update PRODUCTS table
ALTER TABLE products 
ADD COLUMN courier_charges numeric default 0,
ADD COLUMN location_from text,
ADD COLUMN vendor_name text;

-- 2. Update REPAIRS table
ALTER TABLE repairs
ADD COLUMN model_number text,
ADD COLUMN problem_found text,
ADD COLUMN technician_name text,
ADD COLUMN is_part_change boolean default false,
ADD COLUMN part_replaced_name text,
ADD COLUMN is_service_only boolean default false;

-- Note: 'issue_description' will serve as 'Problem Reported by Customer'
