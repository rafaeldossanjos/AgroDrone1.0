-- Adicionar foreign key constraints para application_products
ALTER TABLE public.application_products
ADD CONSTRAINT application_products_application_id_fkey
FOREIGN KEY (application_id)
REFERENCES public.applications(id)
ON DELETE CASCADE;

ALTER TABLE public.application_products
ADD CONSTRAINT application_products_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES public.products(id)
ON DELETE RESTRICT;