import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts } from "@/hooks/useProducts";
import { useRecipes, Recipe } from "@/hooks/useRecipes";
import { Plus, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

interface RecipeProductItem {
  product_id: string;
  dose_per_ha: string;
  dose_unit: string;
}

interface RecipeDialogProps {
  recipe?: Recipe;
  trigger?: React.ReactNode;
}

export function RecipeDialog({ recipe, trigger }: RecipeDialogProps) {
  const [open, setOpen] = useState(false);
  const { products } = useProducts();
  const { createRecipe, updateRecipe } = useRecipes();
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [recipeProducts, setRecipeProducts] = useState<RecipeProductItem[]>([
    { product_id: "", dose_per_ha: "", dose_unit: "L/ha" }
  ]);

  useEffect(() => {
    if (recipe) {
      setName(recipe.name);
      setDescription(recipe.description || "");
      setRecipeProducts(
        recipe.recipe_products?.map(rp => ({
          product_id: rp.product_id,
          dose_per_ha: String(rp.dose_per_ha),
          dose_unit: rp.dose_unit
        })) || [{ product_id: "", dose_per_ha: "", dose_unit: "L/ha" }]
      );
    } else {
      setName("");
      setDescription("");
      setRecipeProducts([{ product_id: "", dose_per_ha: "", dose_unit: "L/ha" }]);
    }
  }, [recipe, open]);

  const addProduct = () => {
    setRecipeProducts([...recipeProducts, { product_id: "", dose_per_ha: "", dose_unit: "L/ha" }]);
  };

  const removeProduct = (index: number) => {
    if (recipeProducts.length > 1) {
      setRecipeProducts(recipeProducts.filter((_, i) => i !== index));
    }
  };

  const updateProduct = (index: number, field: keyof RecipeProductItem, value: string) => {
    const updated = [...recipeProducts];
    updated[index] = { ...updated[index], [field]: value };
    setRecipeProducts(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Nome do receituário é obrigatório");
      return;
    }

    const validProducts = recipeProducts.filter(p => p.product_id && parseFloat(p.dose_per_ha) > 0);
    if (validProducts.length === 0) {
      toast.error("Adicione pelo menos um produto com dose válida");
      return;
    }

    setIsLoading(true);
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || undefined,
        products: validProducts.map(p => ({
          product_id: p.product_id,
          dose_per_ha: parseFloat(p.dose_per_ha),
          dose_unit: p.dose_unit
        }))
      };

      if (recipe) {
        await updateRecipe({ id: recipe.id, ...data });
      } else {
        await createRecipe(data);
      }

      setOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Receituário
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {recipe ? "Editar Receituário" : "Novo Receituário"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Receituário *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Dessecação pré-plantio"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional do receituário..."
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <Label>Produtos e Doses *</Label>
            {recipeProducts.map((item, index) => (
              <Card key={index} className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Produto {index + 1}</span>
                  {recipeProducts.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProduct(index)}
                      className="h-6 w-6 p-0 text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                <Select
                  value={item.product_id}
                  onValueChange={(v) => updateProduct(index, "product_id", v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.filter(p => p.active).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Dose</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={item.dose_per_ha}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || /^\d*\.?\d*$/.test(val)) {
                          updateProduct(index, "dose_per_ha", val);
                        }
                      }}
                      placeholder="0.5"
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Unidade</Label>
                    <Select
                      value={item.dose_unit}
                      onValueChange={(v) => updateProduct(index, "dose_unit", v)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L/ha">L/ha</SelectItem>
                        <SelectItem value="mL/ha">mL/ha</SelectItem>
                        <SelectItem value="kg/ha">kg/ha</SelectItem>
                        <SelectItem value="g/ha">g/ha</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addProduct}
              className="w-full gap-1"
            >
              <Plus className="h-3 w-3" />
              Adicionar Produto
            </Button>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Salvando..." : recipe ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
