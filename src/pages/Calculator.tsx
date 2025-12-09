import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator as CalcIcon, Plus, Trash2, Package, Save, Settings2, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useProducts } from "@/hooks/useProducts";
import { useProperties } from "@/hooks/useProperties";
import { useApplications } from "@/hooks/useApplications";
import { useRecipes } from "@/hooks/useRecipes";
import { ProductDialog } from "@/components/ProductDialog";
import { ProductAutocomplete } from "@/components/ProductAutocomplete";

const SAVED_PARAMS_KEY = "calculator_default_params";

const calculationSchema = z.object({
  area: z.number().min(0.0001, 'Área deve ser maior que 0').max(100000, 'Área muito grande'),
  flowRate: z.number().min(0.1, 'Vazão deve ser maior que 0').max(1000, 'Vazão muito alta'),
  tankVolume: z.number().min(1, 'Capacidade do tanque deve ser maior que 0').max(10000, 'Capacidade muito alta'),
});

const productSchema = z.object({
  name: z.string().min(1, 'Nome do produto é obrigatório').max(100),
  dose: z.number().min(0.0001, 'Dose deve ser maior que 0').max(100000, 'Dose muito alta'),
  unit: z.string().min(1, 'Unidade é obrigatória'),
});

type Product = {
  id: string;
  productId?: string;
  name: string;
  dose: string;
  unit: string;
};

type CalculationResults = {
  totalVolume: number;
  tanks: number;
  volumePerTank: number;
  totalProductVolume: number;
  waterPerTank: number;
  totalWater: number;
  productPerTank: Array<{
    id: string;
    productId?: string;
    name: string;
    dose: number;
    unit: string;
    quantityPerTank: number;
    totalQuantity: number;
  }>;
};

type SavedParams = {
  flowRate: string;
  tankVolume: string;
};

// Helper para formatar quantidade com unidade adequada
const formatQuantity = (value: number, unit: string): string => {
  const baseUnit = unit.replace('/ha', '');
  
  // Converter L para mL se for menor que 1L
  if (baseUnit === 'L' && value < 1 && value > 0) {
    return `${Math.round(value * 1000)} mL`;
  }
  // Converter kg para g se for menor que 1kg
  if (baseUnit === 'kg' && value < 1 && value > 0) {
    return `${Math.round(value * 1000)} g`;
  }
  
  // Arredondar valores pequenos para 2 casas decimais
  if (value < 10) {
    return `${value.toFixed(2)} ${baseUnit}`;
  }
  return `${value.toFixed(1)} ${baseUnit}`;
};

export default function Calculator() {
  const { products: registeredProducts, isLoading: loadingProducts } = useProducts();
  const { properties } = useProperties();
  const { createApplication } = useApplications();
  const { recipes } = useRecipes();
  
  const getSavedParams = (): SavedParams | null => {
    try {
      const saved = localStorage.getItem(SAVED_PARAMS_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };
  
  const savedParams = getSavedParams();
  const [area, setArea] = useState<string>("");
  const [flowRate, setFlowRate] = useState<string>(savedParams?.flowRate || "");
  const [tankVolume, setTankVolume] = useState<string>(savedParams?.tankVolume || "");
  const [products, setProducts] = useState<Product[]>([]);
  const [calculated, setCalculated] = useState(false);
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [hasSavedParams, setHasSavedParams] = useState(!!savedParams);
  const [showSaveParamsDialog, setShowSaveParamsDialog] = useState(false);
  
  // Dialog para salvar como aplicação
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savePropertyId, setSavePropertyId] = useState<string>("");
  const [savePlotName, setSavePlotName] = useState<string>("");
  const [saveDate, setSaveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [saveStatus, setSaveStatus] = useState<string>("planejada");

  useEffect(() => {
    if (products.length === 0) {
      addProduct();
    }
  }, []);

  const addProduct = () => {
    setProducts([
      ...products,
      {
        id: Date.now().toString(),
        productId: undefined,
        name: "",
        dose: "",
        unit: "L/ha",
      },
    ]);
  };

  const selectRegisteredProduct = (localId: string, selectedProduct: typeof registeredProducts[0]) => {
    setProducts(
      products.map((p) => 
        p.id === localId 
          ? { 
              ...p, 
              productId: selectedProduct.id,
              name: selectedProduct.name,
              unit: selectedProduct.recommended_dose_unit || 
                    (selectedProduct.unit === 'L' ? 'L/ha' : 
                     selectedProduct.unit === 'mL' ? 'mL/ha' :
                     selectedProduct.unit === 'kg' ? 'kg/ha' : 'g/ha'),
              dose: selectedProduct.recommended_dose ? String(selectedProduct.recommended_dose) : ""
            } 
          : p
      )
    );
    setCalculated(false);
  };

  const loadRecipe = (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe || !recipe.recipe_products) return;

    const newProducts = recipe.recipe_products.map(rp => {
      const registeredProduct = registeredProducts.find(p => p.id === rp.product_id);
      return {
        id: Date.now().toString() + Math.random(),
        productId: rp.product_id,
        name: registeredProduct?.name || rp.products?.name || "",
        dose: String(rp.dose_per_ha),
        unit: rp.dose_unit,
      };
    });

    setProducts(newProducts);
    setCalculated(false);
    toast.success(`Receituário "${recipe.name}" carregado!`);
  };

  const removeProduct = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
    setCalculated(false);
  };

  const updateProduct = (id: string, field: keyof Product, value: any) => {
    setProducts(
      products.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
    setCalculated(false);
  };

  const saveDefaultParams = () => {
    const params: SavedParams = { flowRate, tankVolume };
    localStorage.setItem(SAVED_PARAMS_KEY, JSON.stringify(params));
    setHasSavedParams(true);
    setShowSaveParamsDialog(false);
    toast.success("Parâmetros salvos como padrão!");
  };

  const clearDefaultParams = () => {
    localStorage.removeItem(SAVED_PARAMS_KEY);
    setHasSavedParams(false);
    setFlowRate("");
    setTankVolume("");
    setCalculated(false);
    toast.success("Parâmetros limpos!");
  };

  const calculate = () => {
    const areaNum = parseFloat(area) || 0;
    const flowRateNum = parseFloat(flowRate) || 0;
    const tankVolumeNum = parseFloat(tankVolume) || 0;
    
    if (!area || areaNum <= 0) {
      toast.error("Área é obrigatória");
      return;
    }
    if (!flowRate || flowRateNum <= 0) {
      toast.error("Vazão é obrigatória");
      return;
    }
    if (!tankVolume || tankVolumeNum <= 0) {
      toast.error("Capacidade do tanque é obrigatória");
      return;
    }
    
    try {
      calculationSchema.parse({ area: areaNum, flowRate: flowRateNum, tankVolume: tankVolumeNum });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    if (products.length === 0) {
      toast.error("Adicione pelo menos um produto");
      return;
    }

    for (const p of products) {
      const doseValue = parseFloat(p.dose) || 0;
      try {
        productSchema.parse({ ...p, dose: doseValue });
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast.error(`Produto "${p.name || 'sem nome'}": ${error.errors[0].message}`);
          return;
        }
      }
    }

    const totalVolume = areaNum * flowRateNum;
    const tanks = Math.ceil(totalVolume / tankVolumeNum);
    const volumePerTank = totalVolume / tanks;

    const productPerTank = products.map((p) => {
      const doseValue = parseFloat(p.dose) || 0;
      const totalQuantity = doseValue * areaNum;
      const quantityPerTank = totalQuantity / tanks;

      return {
        ...p,
        dose: doseValue,
        quantityPerTank,
        totalQuantity,
      };
    });

    const totalProductVolume = productPerTank.reduce(
      (sum, p) => sum + p.quantityPerTank,
      0
    );

    const waterPerTank = volumePerTank - totalProductVolume;
    const totalWater = waterPerTank * tanks;

    const calculationResults: CalculationResults = {
      totalVolume,
      tanks,
      volumePerTank,
      totalProductVolume,
      waterPerTank,
      totalWater,
      productPerTank,
    };

    setResults(calculationResults);
    setCalculated(true);
    toast.success(`Cálculo realizado! ${tanks} tanque(s) necessário(s)`);
    
    if (!hasSavedParams && flowRate && tankVolume) {
      setShowSaveParamsDialog(true);
    }
  };

  const handleSaveAsApplication = () => {
    if (!savePropertyId) {
      toast.error("Selecione uma propriedade");
      return;
    }

    if (!results) return;

    const productsWithId = results.productPerTank.filter(p => p.productId);
    if (productsWithId.length !== results.productPerTank.length) {
      toast.error("Todos os produtos precisam estar cadastrados no sistema para salvar como aplicação");
      return;
    }

    const applicationData = {
      property_id: savePropertyId,
      plot_name: savePlotName || null,
      application_date: saveDate,
      application_type: 'pulverização' as const,
      status: saveStatus,
      area_applied: parseFloat(area) || 0,
      total_cost: 0,
      flight_time_minutes: null,
      notes: `Gerado pela calculadora de calda. Volume total: ${results.totalVolume.toFixed(0)}L, ${results.tanks} tanque(s).`,
      products: productsWithId.map(p => ({
        product_id: p.productId!,
        dose_per_ha: p.dose,
        total_amount: p.totalQuantity,
        unit_cost: 0,
        total_cost: 0,
      })),
    };

    createApplication.mutate(applicationData, {
      onSuccess: () => {
        setSaveDialogOpen(false);
        setSavePropertyId("");
        setSavePlotName("");
        setSaveDate(new Date().toISOString().split('T')[0]);
        setSaveStatus("planejada");
        toast.success("Aplicação salva com sucesso!");
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          Calculadora de Calda
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Calcule a quantidade de produtos e volume necessários
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Input Form */}
        <div className="space-y-3">
          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">
                Parâmetros
              </h2>
              {hasSavedParams && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearDefaultParams}
                  className="gap-1 text-xs h-6 px-2 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                  Limpar
                </Button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="area" className="text-xs">Área (ha) *</Label>
                <Input
                  id="area"
                  type="text"
                  inputMode="decimal"
                  value={area}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d*\.?\d*$/.test(val)) {
                      setArea(val);
                      setCalculated(false);
                    }
                  }}
                  placeholder="0"
                  className="h-8"
                  required
                />
              </div>
              <div>
                <Label htmlFor="flowRate" className="text-xs">Vazão (L/ha) *</Label>
                <Input
                  id="flowRate"
                  type="text"
                  inputMode="decimal"
                  value={flowRate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d*\.?\d*$/.test(val)) {
                      setFlowRate(val);
                      setCalculated(false);
                    }
                  }}
                  placeholder="0"
                  className="h-8"
                  required
                />
              </div>
              <div>
                <Label htmlFor="tankVolume" className="text-xs">Tanque (L) *</Label>
                <Input
                  id="tankVolume"
                  type="text"
                  inputMode="decimal"
                  value={tankVolume}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d*\.?\d*$/.test(val)) {
                      setTankVolume(val);
                      setCalculated(false);
                    }
                  }}
                  placeholder="0"
                  className="h-8"
                  required
                />
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                Produtos
              </h2>
              <div className="flex gap-1">
                {recipes.length > 0 && (
                  <Select onValueChange={loadRecipe}>
                    <SelectTrigger className="h-7 text-xs w-auto gap-1">
                      <FileText className="h-3 w-3" />
                      <span className="hidden sm:inline">Receituário</span>
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {recipes.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-xs">
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <ProductDialog 
                  trigger={
                    <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2">
                      <Package className="h-3 w-3" />
                      Cadastrar
                    </Button>
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              {products.map((product, index) => (
                <div key={product.id}>
                  <div className="rounded-lg border border-border p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Produto {index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => removeProduct(product.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <ProductAutocomplete
                      products={registeredProducts}
                      value={product.name}
                      onSelect={(p) => selectRegisteredProduct(product.id, p)}
                      onManualInput={(name) => {
                        updateProduct(product.id, "name", name);
                        updateProduct(product.id, "productId", undefined);
                      }}
                      placeholder="Buscar produto..."
                    />
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px]">Dose</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={product.dose}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || /^\d*\.?\d*$/.test(val)) {
                              updateProduct(product.id, "dose", val);
                            }
                          }}
                          placeholder="0.5"
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Unidade</Label>
                        <Select
                          value={product.unit}
                          onValueChange={(value) =>
                            updateProduct(product.id, "unit", value)
                          }
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            <SelectItem value="L/ha" className="text-xs">L/ha</SelectItem>
                            <SelectItem value="mL/ha" className="text-xs">mL/ha</SelectItem>
                            <SelectItem value="kg/ha" className="text-xs">kg/ha</SelectItem>
                            <SelectItem value="g/ha" className="text-xs">g/ha</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  {index === products.length - 1 && (
                    <Button 
                      onClick={addProduct} 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2 gap-1 text-xs h-7"
                    >
                      <Plus className="h-3 w-3" />
                      Adicionar Produto
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-3">
              <Button onClick={calculate} className="w-full h-9" size="default">
                <CalcIcon className="mr-2 h-4 w-4" />
                Calcular
              </Button>
            </div>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="space-y-3">
          <Card className="p-3 sm:p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              Resultados
            </h2>

            {!calculated ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CalcIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground px-4">
                  Configure os parâmetros e clique em Calcular
                </p>
              </div>
            ) : (
              results && (
                <div className="space-y-3">
                  {/* Resumo Geral */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-foreground border-l-2 border-primary pl-2">
                      Resumo Geral
                    </h3>
                    
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <p className="text-[10px] text-muted-foreground">Volume Total</p>
                      <p className="text-base font-bold text-primary">
                        {Math.round(results.totalVolume)} L
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-muted p-2">
                        <p className="text-[10px] text-muted-foreground">Tanques</p>
                        <p className="text-sm font-semibold text-foreground">
                          {results.tanks}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted p-2">
                        <p className="text-[10px] text-muted-foreground">Vol/Tanque</p>
                        <p className="text-sm font-semibold text-foreground">
                          {results.volumePerTank.toFixed(1)} L
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Receita por Tanque */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-foreground border-l-2 border-primary pl-2">
                      Receita por Tanque
                    </h3>
                    
                    <div className="rounded-lg border border-border p-2 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Água</span>
                        <span className="font-medium text-foreground">
                          {Math.round(results.waterPerTank)} L
                        </span>
                      </div>
                      {results.productPerTank.map((p) => (
                        <div key={p.id} className="flex justify-between text-xs">
                          <span className="text-muted-foreground truncate max-w-[60%]">{p.name}</span>
                          <span className="font-medium text-foreground">
                            {formatQuantity(p.quantityPerTank, p.unit)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total Geral */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-foreground border-l-2 border-primary pl-2">
                      Total Geral
                    </h3>
                    
                    <div className="rounded-lg border border-border p-2 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Água Total</span>
                        <span className="font-medium text-foreground">
                          {Math.round(results.totalWater)} L
                        </span>
                      </div>
                      {results.productPerTank.map((p) => (
                        <div key={p.id} className="flex justify-between text-xs">
                          <span className="text-muted-foreground truncate max-w-[60%]">{p.name}</span>
                          <span className="font-medium text-foreground">
                            {formatQuantity(p.totalQuantity, p.unit)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Teste de Compatibilidade */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-foreground border-l-2 border-warning pl-2">
                      Teste de Compatibilidade
                    </h3>
                    <div className="rounded-lg bg-warning/10 border border-warning/20 p-2.5 space-y-2">
                      <p className="text-[10px] text-muted-foreground">
                        Antes de preparar a calda completa, faça um teste em pequena escala:
                      </p>
                      {[2, 5].map((liters) => {
                        const ratio = liters / results.volumePerTank;
                        return (
                          <div key={liters} className="rounded bg-background/50 p-2">
                            <p className="text-xs font-medium text-foreground mb-1">
                              Receita para {liters}L:
                            </p>
                            <div className="space-y-0.5">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-muted-foreground">Água</span>
                                <span className="font-medium text-foreground">
                                  {(results.waterPerTank * ratio).toFixed(2)} L
                                </span>
                              </div>
                              {results.productPerTank.map((p) => (
                                <div key={p.id} className="flex justify-between text-[10px]">
                                  <span className="text-muted-foreground truncate max-w-[50%]">{p.name}</span>
                                  <span className="font-medium text-foreground">
                                    {formatQuantity(p.quantityPerTank * ratio, p.unit)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Salvar como Aplicação */}
                  <Button 
                    onClick={() => setSaveDialogOpen(true)} 
                    variant="outline" 
                    className="w-full h-8 gap-2 text-xs"
                  >
                    <Save className="h-3 w-3" />
                    Salvar como Aplicação
                  </Button>
                </div>
              )
            )}
          </Card>
        </div>
      </div>

      {/* Dialog para salvar como aplicação */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Salvar como Aplicação</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Propriedade *</Label>
              <Select value={savePropertyId} onValueChange={setSavePropertyId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Talhão/Parcela</Label>
              <Input
                value={savePlotName}
                onChange={(e) => setSavePlotName(e.target.value)}
                placeholder="Ex: Talhão 1"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Data *</Label>
              <Input
                type="date"
                value={saveDate}
                onChange={(e) => setSaveDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={saveStatus} onValueChange={setSaveStatus}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="planejada" className="text-xs">Planejada</SelectItem>
                  <SelectItem value="em_andamento" className="text-xs">Em Andamento</SelectItem>
                  <SelectItem value="concluída" className="text-xs">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)} size="sm" className="text-xs">
              Cancelar
            </Button>
            <Button onClick={handleSaveAsApplication} size="sm" className="text-xs">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para salvar parâmetros */}
      <Dialog open={showSaveParamsDialog} onOpenChange={setShowSaveParamsDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Salvar Parâmetros?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Deseja salvar esses parâmetros como padrão para próximos cálculos?
          </p>
          <div className="text-xs space-y-1 bg-muted p-2 rounded-md">
            <p><strong>Vazão:</strong> {flowRate} L/ha</p>
            <p><strong>Tanque:</strong> {tankVolume} L</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSaveParamsDialog(false)} size="sm" className="text-xs">
              Não
            </Button>
            <Button onClick={saveDefaultParams} size="sm" className="text-xs">
              Sim, Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
