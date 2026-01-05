-- SCHEMA UPDATE V3
-- Run this in Supabase SQL Editor

-- 1. Update PRODUCTS table (Add Serial Number)
ALTER TABLE products ADD COLUMN serial_number text;

-- 2. Update REPAIRS Status Constraint
-- We need to drop the existing check constraint and add a new one to include 'Payment Pending'
ALTER TABLE repairs DROP CONSTRAINT repairs_status_check;

ALTER TABLE repairs ADD CONSTRAINT repairs_status_check 
CHECK (status IN ('Received', 'In Process', 'Part Not Available', 'Repaired', 'Delivered', 'Delivered (Payment Pending)'));
