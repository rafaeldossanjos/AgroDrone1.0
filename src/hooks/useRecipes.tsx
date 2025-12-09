import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface RecipeProduct {
  id: string;
  recipe_id: string;
  product_id: string;
  dose_per_ha: number;
  dose_unit: string;
  created_at: string;
  products?: {
    id: string;
    name: string;
    unit: string;
    unit_price: number;
  };
}

export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  recipe_products?: RecipeProduct[];
}

export const useRecipes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ["recipes", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("recipes")
        .select(`
          *,
          recipe_products (
            *,
            products (id, name, unit, unit_price)
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Recipe[];
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      description?: string;
      products: Array<{ product_id: string; dose_per_ha: number; dose_unit: string }> 
    }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      
      // Create recipe
      const { data: recipe, error: recipeError } = await supabase
        .from("recipes")
        .insert([{ name: data.name, description: data.description, user_id: user.id }])
        .select()
        .single();

      if (recipeError) throw recipeError;

      // Create recipe products
      if (data.products.length > 0) {
        const { error: productsError } = await supabase
          .from("recipe_products")
          .insert(data.products.map(p => ({ ...p, recipe_id: recipe.id })));

        if (productsError) throw productsError;
      }

      return recipe;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Receituário criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar receituário");
      console.error(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { 
      id: string;
      name: string; 
      description?: string;
      products: Array<{ product_id: string; dose_per_ha: number; dose_unit: string }> 
    }) => {
      // Update recipe
      const { error: recipeError } = await supabase
        .from("recipes")
        .update({ name: data.name, description: data.description })
        .eq("id", data.id);

      if (recipeError) throw recipeError;

      // Delete existing products and insert new ones
      await supabase.from("recipe_products").delete().eq("recipe_id", data.id);

      if (data.products.length > 0) {
        const { error: productsError } = await supabase
          .from("recipe_products")
          .insert(data.products.map(p => ({ ...p, recipe_id: data.id })));

        if (productsError) throw productsError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Receituário atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar receituário");
      console.error(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recipes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Receituário excluído com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir receituário");
      console.error(error);
    },
  });

  return {
    recipes,
    isLoading,
    createRecipe: createMutation.mutateAsync,
    updateRecipe: updateMutation.mutateAsync,
    deleteRecipe: deleteMutation.mutateAsync,
  };
};
