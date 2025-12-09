import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProperties, Property } from '@/hooks/useProperties';
import { toast } from 'sonner';
import { z } from 'zod';
import { Plus } from 'lucide-react';

const propertySchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  location: z.string().min(3, 'Localização deve ter pelo menos 3 caracteres').max(200),
  total_area: z.number().min(0.01, 'Área deve ser maior que 0').max(999999),
  plot_count: z.number().int().min(1, 'Deve ter pelo menos 1 talhão').max(1000),
  notes: z.string().max(500).optional(),
});

type PropertyDialogProps = {
  property?: Property;
  trigger?: React.ReactNode;
};

export const PropertyDialog = ({ property, trigger }: PropertyDialogProps) => {
  const [open, setOpen] = useState(false);
  const { createProperty, updateProperty } = useProperties();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: property?.name || '',
    location: property?.location || '',
    total_area: property?.total_area || 0,
    plot_count: property?.plot_count || 1,
    notes: property?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validated = propertySchema.parse(formData);

      if (property) {
        await updateProperty.mutateAsync({ id: property.id, ...validated });
      } else {
        await createProperty.mutateAsync({
          name: validated.name,
          location: validated.location,
          total_area: validated.total_area,
          plot_count: validated.plot_count,
          notes: validated.notes,
        });
      }

      setOpen(false);
      setFormData({ name: '', location: '', total_area: 0, plot_count: 1, notes: '' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
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
            Nova Propriedade
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {property ? 'Editar Propriedade' : 'Nova Propriedade'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Fazenda São João"
              required
            />
          </div>
          <div>
            <Label htmlFor="location">Localização *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ex: Ribeirão Preto, SP"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="total_area">Área Total (ha) *</Label>
              <Input
                id="total_area"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.total_area || ''}
                onChange={(e) => setFormData({ ...formData, total_area: parseFloat(e.target.value) })}
                required
              />
            </div>
            <div>
              <Label htmlFor="plot_count">Número de Talhões *</Label>
              <Input
                id="plot_count"
                type="number"
                min="1"
                value={formData.plot_count || ''}
                onChange={(e) => setFormData({ ...formData, plot_count: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informações adicionais..."
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Salvando...' : property ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
