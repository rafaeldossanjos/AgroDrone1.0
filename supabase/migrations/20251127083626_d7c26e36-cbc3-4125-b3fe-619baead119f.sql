-- Criar tabela de equipamentos/drones
CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  model TEXT NOT NULL,
  battery_capacity INTEGER NOT NULL DEFAULT 0,
  flight_time_minutes INTEGER NOT NULL DEFAULT 0,
  tank_capacity DECIMAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'operacional',
  total_flights INTEGER NOT NULL DEFAULT 0,
  total_flight_hours DECIMAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver seus próprios equipamentos"
ON public.equipment
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios equipamentos"
ON public.equipment
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios equipamentos"
ON public.equipment
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios equipamentos"
ON public.equipment
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_equipment_updated_at
BEFORE UPDATE ON public.equipment
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();