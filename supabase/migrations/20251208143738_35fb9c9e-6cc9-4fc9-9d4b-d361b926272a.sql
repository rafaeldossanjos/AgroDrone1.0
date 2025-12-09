-- Tabela para armazenar receituários prontos (templates de receitas)
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para armazenar os produtos de cada receituário
CREATE TABLE public.recipe_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  dose_per_ha NUMERIC NOT NULL,
  dose_unit TEXT NOT NULL DEFAULT 'L/ha',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_products ENABLE ROW LEVEL SECURITY;

-- Policies for recipes
CREATE POLICY "Usuários podem ver seus próprios receituários" 
ON public.recipes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios receituários" 
ON public.recipes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios receituários" 
ON public.recipes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios receituários" 
ON public.recipes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Policies for recipe_products
CREATE POLICY "Usuários podem ver produtos de seus receituários" 
ON public.recipe_products 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM recipes 
  WHERE recipes.id = recipe_products.recipe_id 
  AND recipes.user_id = auth.uid()
));

CREATE POLICY "Usuários podem inserir produtos em seus receituários" 
ON public.recipe_products 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM recipes 
  WHERE recipes.id = recipe_products.recipe_id 
  AND recipes.user_id = auth.uid()
));

CREATE POLICY "Usuários podem atualizar produtos de seus receituários" 
ON public.recipe_products 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM recipes 
  WHERE recipes.id = recipe_products.recipe_id 
  AND recipes.user_id = auth.uid()
));

CREATE POLICY "Usuários podem deletar produtos de seus receituários" 
ON public.recipe_products 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM recipes 
  WHERE recipes.id = recipe_products.recipe_id 
  AND recipes.user_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_recipes_updated_at
BEFORE UPDATE ON public.recipes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();