-- Criar tabela para relacionar aplicações com produtos (múltiplos produtos por aplicação)
CREATE TABLE IF NOT EXISTS public.application_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL,
  product_id UUID NOT NULL,
  dose_per_ha NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  unit_cost NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.application_products ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Usuários podem ver produtos de suas aplicações"
ON public.application_products
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = application_products.application_id
    AND applications.user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem inserir produtos em suas aplicações"
ON public.application_products
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = application_products.application_id
    AND applications.user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem atualizar produtos de suas aplicações"
ON public.application_products
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = application_products.application_id
    AND applications.user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem deletar produtos de suas aplicações"
ON public.application_products
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = application_products.application_id
    AND applications.user_id = auth.uid()
  )
);

-- Modificar tabela applications para remover product_id e product_amount
-- Esses campos agora estarão na tabela application_products
ALTER TABLE public.applications 
DROP COLUMN IF EXISTS product_id,
DROP COLUMN IF EXISTS product_amount;

-- O total_cost na tabela applications será a soma de todos os produtos
-- Vamos manter esse campo para facilitar consultas