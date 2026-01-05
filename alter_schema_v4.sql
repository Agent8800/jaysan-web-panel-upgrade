-- SCHEMA UPDATE V4
-- Run this in Supabase SQL Editor

-- 1. Update BILLS table
ALTER TABLE bills 
ADD COLUMN payment_status text default 'Paid', -- Pending, Paid, etc.
ADD COLUMN invoice_number text, -- Stores the formatted string e.g. "JRPL/2025/101"
ADD COLUMN seq_id SERIAL; -- Auto-incrementing number for generation

-- 2. Update BILL_ITEMS table
ALTER TABLE bill_items
ADD COLUMN serial_number text; -- To store the specific serial sold

-- 3. Update REPAIRS table (if not already done in V3, ensures 'Delivered (Payment Pending)' exists)
-- This was done in V3, but let's be safe if V3 wasn't run. 
-- Note: Re-running V3 command here might error if constraint exists, so I will skip it. 
-- Assume V3 was run.
