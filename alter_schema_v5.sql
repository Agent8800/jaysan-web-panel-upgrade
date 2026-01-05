-- SCHEMA UPDATE V5
-- Run this in Supabase SQL Editor

-- 1. Update BILLS table to support GST Type
ALTER TABLE bills 
ADD COLUMN gst_type text default 'CGST_SGST'; -- Values: 'CGST_SGST', 'IGST', 'NONE'

-- 2. Update REPAIRS table (Optional: Ensure custom_message column exists if previously missed, though not requested now)
-- Skipping to imply no changes needed beyond bills.
