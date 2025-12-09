-- Add recommended_dose column to products table for default recommendation
ALTER TABLE public.products 
ADD COLUMN recommended_dose DECIMAL(10,4) DEFAULT NULL,
ADD COLUMN recommended_dose_unit VARCHAR(10) DEFAULT 'L/ha';