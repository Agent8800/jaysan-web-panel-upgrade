-- SAMPLE SEED DATA
-- Run this in Supabase SQL Editor to populate your app with test data.

-- 1. Insert Products
INSERT INTO products (name, price, quantity) VALUES
('iPhone 13 Screen', 12000, 10),
('Samsung S21 Battery', 3500, 15),
('Tempered Glass (Universal)', 200, 100),
('USB-C Charging Cable', 450, 50),
('MacBook Air M1 Keyboard', 8000, 5);

-- 2. Insert Repairs (with Serial Numbers)
INSERT INTO repairs (customer_name, contact_number, device_details, serial_number, issue_description, status, estimated_cost, custom_message) VALUES
('John Doe', '9876543210', 'iPhone 12 Pro', 'SN892374823', 'Cracked Screen', 'Received', 14000, 'Check face ID sensor'),
('Alice Smith', '9988776655', 'OnePlus 9R', 'SN123123123', 'Battery Draining Fast', 'In Process', 2000, 'Original battery requested'),
('Bob Jones', '9123456789', 'Dell XPS 13', 'dell-service-tag-1', 'Keyboard keys stuck', 'Part Not Available', 5500, 'Waiting for shipment'),
('Emma Wilson', '8877665544', 'Samsung S22', 'R5234234', 'Charging Port Issue', 'Repaired', 1500, 'Port cleaned'),
('Demo User', '1122334455', 'iPad Air', 'DMPiPad123', 'Software Update', 'Delivered', 500, 'Updated to iPadOS 16');

-- 3. Insert a Bill (Sample)
-- We first insert a bill, then items. Since IDs are UUIDs, we use a CTE for cleaner insertion or just manual if simple.
-- For simplicity in a script without variables, we'll insert a bill and then use a known technique or just simple separate inserts if valid.
-- Actually, simple INSERT works best if we don't care about linking specific random IDs, but for Foreign Keys we need correct IDs.
-- Let's trust the user to create new bills via UI, or use a complex DO block.
-- A simple way to verify Bill History UI is to just insert one manual bill if they want, but the UI works best for generating them.
-- I will skip complex Bill insertion to avoid foreign key mishaps with random UUIDs in a raw script, 
-- but I will provide one simple self-contained transaction block for PostgreSQL.

DO $$
DECLARE
  bill_uuid uuid;
  prod_uuid uuid;
BEGIN
  -- Get ID of iPhone Screen
  SELECT id INTO prod_uuid FROM products WHERE name = 'iPhone 13 Screen' LIMIT 1;

  -- Create Bill
  INSERT INTO bills (customer_name, customer_phone, total_amount, gst_applied)
  VALUES ('Walk-in Generic', '0000000000', 14160, true) -- 12000 + 18% GST
  RETURNING id INTO bill_uuid;

  -- Add Item
  INSERT INTO bill_items (bill_id, product_id, product_name, quantity, price_at_sale)
  VALUES (bill_uuid, prod_uuid, 'iPhone 13 Screen', 1, 12000);
END $$;
