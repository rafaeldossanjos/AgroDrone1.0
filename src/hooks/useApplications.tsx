import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Application {
  id: string;
  user_id: string;
  property_id: string;
  plot_name?: string | null;
  application_date: string;
  application_type: 'pulverização' | 'adubação' | 'semeadura' | 'outro';
  status: 'planejada' | 'em_andamento' | 'concluída' | 'cancelada';
  area_applied: number;
  total_cost: number;
  flight_time_minutes: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  properties?: { name: string };
  application_products?: Array<{
    id: string;
    product_id: string;
    dose_per_ha: number;
    total_amount: number;
    unit_cost: number;
    total_cost: number;
    products?: { name: string; unit: string };
  }>;
}

export const useApplications = () => {
  const queryClient = useQueryClient();

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          properties(name),
          application_products(
            id,
            product_id,
            dose_per_ha,
            total_amount,
            unit_cost,
            total_cost,
            products(name, unit)
          )
        `)
        .order('application_date', { ascending: false });

      if (error) throw error;
      return data as Application[];
    },
  });

  const createApplication = useMutation({
    mutationFn: async (application: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Criar a aplicação principal
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .insert([{
          user_id: user.id,
          property_id: application.property_id,
          plot_name: application.plot_name || null,
          application_date: application.application_date,
          application_type: application.application_type,
          status: application.status,
          area_applied: application.area_applied,
          total_cost: application.total_cost,
          flight_time_minutes: application.flight_time_minutes,
          notes: application.notes,
        }])
        .select()
        .single();

      if (appError) throw appError;

      // Inserir os produtos da aplicação
      if (application.products && application.products.length > 0) {
        const productsData = application.products.map((p: any) => ({
          application_id: appData.id,
          product_id: p.product_id,
          dose_per_ha: p.dose_per_ha,
          total_amount: p.total_amount,
          unit_cost: p.unit_cost,
          total_cost: p.total_cost,
        }));

        const { error: productsError } = await supabase
          .from('application_products')
          .insert(productsData);

        if (productsError) throw productsError;
      }

      return appData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Aplicação criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar aplicação');
    },
  });

  const updateApplication = useMutation({
    mutationFn: async ({ id, ...application }: Partial<Application> & { id: string }) => {
      // Atualizar a aplicação principal
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .update({
          property_id: application.property_id,
          plot_name: application.plot_name || null,
          application_date: application.application_date,
          application_type: application.application_type,
          status: application.status,
          area_applied: application.area_applied,
          total_cost: application.total_cost,
          flight_time_minutes: application.flight_time_minutes,
          notes: application.notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (appError) throw appError;

      // Atualizar produtos (deletar e recriar por simplicidade)
      if ((application as any).products) {
        // Deletar produtos existentes
        await supabase
          .from('application_products')
          .delete()
          .eq('application_id', id);

        // Inserir novos produtos
        const productsData = (application as any).products.map((p: any) => ({
          application_id: id,
          product_id: p.product_id,
          dose_per_ha: p.dose_per_ha,
          total_amount: p.total_amount,
          unit_cost: p.unit_cost,
          total_cost: p.total_cost,
        }));

        const { error: productsError } = await supabase
          .from('application_products')
          .insert(productsData);

        if (productsError) throw productsError;
      }

      return appData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Aplicação atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar aplicação');
    },
  });

  const deleteApplication = useMutation({
    mutationFn: async (id: string) => {
      // Primeiro deletar os produtos da aplicação
      await supabase
        .from('application_products')
        .delete()
        .eq('application_id', id);

      // Depois deletar a aplicação
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Aplicação removida com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover aplicação');
    },
  });

  return {
    applications,
    isLoading,
    createApplication,
    updateApplication,
    deleteApplication,
  };
};
