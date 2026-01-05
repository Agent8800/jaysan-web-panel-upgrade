-- SCHEMA UPDATE V6
-- Run this in Supabase SQL Editor

-- 1. Create EXPENDITURES table
CREATE TABLE IF NOT EXISTS expenditures (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    
    item_name text NOT NULL,           -- Product Name or Manual Description
    amount numeric NOT NULL DEFAULT 0, -- Cost/Value
    
    type text DEFAULT 'Manual',        -- 'Stock' or 'Manual'
    category text,                     -- 'Personal', 'AMC', 'Office', etc. (User mentioned Personal/AMC)
    
    location text,                     -- User requested Location
    remarks text,                      -- User requested Remarks
    
    product_id uuid REFERENCES products(id), -- If Stock item
    quantity int DEFAULT 1
);

-- 2. No other changes needed for now.
-- Note: Logic to deduct stock will be handled in JS (client-side) for simplicity, 
-- or we could add a trigger, but JS is consistent with current app design.
