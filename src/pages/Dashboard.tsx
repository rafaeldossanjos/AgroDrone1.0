import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Droplet, 
  MapPin, 
  Clock,
  DollarSign,
  Calculator
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApplications } from "@/hooks/useApplications";
import { useProperties } from "@/hooks/useProperties";
import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type PeriodFilter = 1 | 7 | 15 | 30 | 'month';

export default function Dashboard() {
  const navigate = useNavigate();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>(30);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const { applications, isLoading: loadingApps } = useApplications();
  const { properties } = useProperties();

  // Gerar lista de meses disponíveis baseado nas aplicações
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    (applications || []).forEach((app: any) => {
      const date = new Date(app.application_date + 'T00:00:00');
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    return Array.from(months).sort().reverse();
  }, [applications]);

  const getMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return format(date, "MMM yyyy", { locale: ptBR });
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    if (month !== "all") {
      setPeriodFilter('month');
    }
  };

  const handlePeriodChange = (period: PeriodFilter) => {
    setPeriodFilter(period);
    if (period !== 'month') {
      setSelectedMonth("all");
    }
  };

  // Calcular estatísticas reais
  const stats = useMemo(() => {
    const now = new Date();
    let periodApps: typeof applications = [];
    let previousPeriodApps: typeof applications = [];
    let periodLabel = '';

    if (periodFilter === 'month' && selectedMonth !== 'all') {
      // Filtro por mês específico
      const [year, month] = selectedMonth.split('-').map(Number);
      periodApps = applications.filter(app => {
        const appDate = new Date(app.application_date + 'T00:00:00');
        return appDate.getFullYear() === year && appDate.getMonth() + 1 === month && app.status === 'concluída';
      });
      
      // Mês anterior para comparação
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      previousPeriodApps = applications.filter(app => {
        const appDate = new Date(app.application_date + 'T00:00:00');
        return appDate.getFullYear() === prevYear && appDate.getMonth() + 1 === prevMonth && app.status === 'concluída';
      });
      periodLabel = getMonthLabel(selectedMonth);
    } else {
      const days = periodFilter === 'month' ? 30 : periodFilter;
      const periodStart = subDays(now, days);

      // Filtrar apenas aplicações CONCLUÍDAS do período selecionado
      periodApps = applications.filter(app => {
        const appDate = new Date(app.application_date + 'T00:00:00');
        return appDate >= periodStart && appDate <= now && app.status === 'concluída';
      });

      // Período anterior para comparação (apenas concluídas)
      const previousPeriodStart = subDays(periodStart, days);
      previousPeriodApps = applications.filter(app => {
        const appDate = new Date(app.application_date + 'T00:00:00');
        return appDate >= previousPeriodStart && appDate < periodStart && app.status === 'concluída';
      });
      periodLabel = `${days}d`;
    }

    // Área aplicada no período
    const totalAreaPeriod = periodApps.reduce((sum, app) => sum + Number(app.area_applied), 0);
    const totalAreaPrevious = previousPeriodApps.reduce((sum, app) => sum + Number(app.area_applied), 0);
    const areaChange = totalAreaPrevious > 0 
      ? ((totalAreaPeriod - totalAreaPrevious) / totalAreaPrevious * 100).toFixed(0)
      : "0";

    // Aplicações realizadas
    const appsChange = periodApps.length - previousPeriodApps.length;

    // Horas de voo
    const totalFlightTimePeriod = periodApps.reduce((sum, app) => 
      sum + (app.flight_time_minutes || 0), 0
    );
    const totalFlightTimePrevious = previousPeriodApps.reduce((sum, app) => 
      sum + (app.flight_time_minutes || 0), 0
    );
    const flightTimeDiff = totalFlightTimePeriod - totalFlightTimePrevious;

    // Custo médio por hectare
    const totalCost = periodApps.reduce((sum, app) => sum + Number(app.total_cost), 0);
    const avgCostPerHa = totalAreaPeriod > 0 ? totalCost / totalAreaPeriod : 0;
    
    const previousTotalCost = previousPeriodApps.reduce((sum, app) => sum + Number(app.total_cost), 0);
    const previousAvgCost = totalAreaPrevious > 0 ? previousTotalCost / totalAreaPrevious : 0;
    const costChange = previousAvgCost > 0
      ? ((avgCostPerHa - previousAvgCost) / previousAvgCost * 100).toFixed(0)
      : "0";

    // Área em andamento
    const areaEmAndamento = applications
      .filter(app => app.status === 'em_andamento')
      .reduce((sum, app) => sum + Number(app.area_applied), 0);

    // Área planejada
    const areaPlanejada = applications
      .filter(app => app.status === 'planejada')
      .reduce((sum, app) => sum + Number(app.area_applied), 0);

    return {
      periodLabel,
      items: [
        {
          label: `Área (${periodLabel})`,
          value: `${totalAreaPeriod.toFixed(1)} ha`,
          change: `${Number(areaChange) > 0 ? '+' : ''}${areaChange}%`,
          icon: MapPin,
          color: "text-primary",
        },
        {
          label: "Aplicações",
          value: periodApps.length.toString(),
          change: `${appsChange > 0 ? '+' : ''}${appsChange}`,
          icon: Droplet,
          color: "text-success",
        },
        {
          label: "Em Andamento",
          value: `${areaEmAndamento.toFixed(1)} ha`,
          change: "",
          icon: Clock,
          color: "text-blue-500",
        },
        {
          label: "Planejadas",
          value: `${areaPlanejada.toFixed(1)} ha`,
          change: "",
          icon: TrendingUp,
          color: "text-warning",
        },
      ]
    };
  }, [applications, periodFilter, selectedMonth]);

  // Buscar aplicações recentes
  const recentApplications = useMemo(() => {
    return applications
      .sort((a, b) => new Date(b.application_date).getTime() - new Date(a.application_date).getTime())
      .slice(0, 3)
      .map(app => {
        const property = properties.find(p => p.id === app.property_id);
        return {
          property: property?.name || 'Propriedade',
          plotName: app.plot_name || '-',
          area: `${Number(app.area_applied).toFixed(1)} ha`,
          date: format(new Date(app.application_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }),
          status: app.status,
        };
      });
  }, [applications, properties]);

  // Contar aplicações pendentes
  const pendingCount = useMemo(() => {
    return applications.filter(app => 
      app.status === 'planejada' || app.status === 'em_andamento'
    ).length;
  }, [applications]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            Visão geral das operações
          </p>
        </div>
        {pendingCount > 0 && (
          <button
            onClick={() => navigate('/applications')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium hover:bg-warning/20 transition-colors"
          >
            <Clock className="h-3 w-3" />
            {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Filtros de Período */}
      <div className="flex gap-1.5 flex-wrap items-center">
        {[
          { value: 1, label: 'Hoje' },
          { value: 7, label: '7d' },
          { value: 15, label: '15d' },
          { value: 30, label: '30d' },
        ].map(({ value, label }) => (
          <Button
            key={value}
            variant={periodFilter === value ? "default" : "outline"}
            size="sm"
            onClick={() => handlePeriodChange(value as PeriodFilter)}
            className="h-7 px-2.5 text-xs"
          >
            {label}
          </Button>
        ))}
        
        <span className="text-xs text-muted-foreground mx-1">ou</span>
        
        <Select value={selectedMonth} onValueChange={handleMonthChange}>
          <SelectTrigger className="h-7 w-[100px] text-xs">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent className="bg-popover max-h-[200px]">
            <SelectItem value="all">Todos</SelectItem>
            {availableMonths.map((month) => (
              <SelectItem key={month} value={month} className="capitalize">
                {getMonthLabel(month)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid - Compacto */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stats.items.map((stat) => (
          <Card key={stat.label} className="p-3">
            <div className="flex items-start justify-between">
              <div className={cn("p-1.5 rounded-md bg-muted", stat.color)}>
                <stat.icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-[10px] font-medium text-success">
                {stat.change}
              </span>
            </div>
            <div className="mt-2">
              <p className="text-lg font-bold text-foreground leading-none">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Info sobre porcentagem */}
      <p className="text-[10px] text-muted-foreground text-center">
        % compara com o período anterior
      </p>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Recent Applications */}
        <Card className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Aplicações Recentes
            </h2>
            <button 
              onClick={() => navigate('/applications')}
              className="text-xs font-medium text-primary hover:underline"
            >
              Ver todas
            </button>
          </div>
          <div className="space-y-2">
            {loadingApps ? (
              <p className="text-xs text-muted-foreground">Carregando...</p>
            ) : recentApplications.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma aplicação registrada.</p>
            ) : (
              recentApplications.map((app, index) => (
              <div
                key={index}
                className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{app.property}</p>
                  <p className="text-[10px] text-muted-foreground">{app.plotName} • {app.date}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-sm font-semibold text-foreground">{app.area}</p>
                  <span className={cn(
                    "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    app.status === 'concluída' ? "bg-success/10 text-success" :
                    app.status === 'em_andamento' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                    app.status === 'planejada' ? "bg-warning/10 text-warning" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {app.status === 'concluída' ? 'OK' : 
                     app.status === 'em_andamento' ? 'Andamento' : 
                     app.status === 'planejada' ? 'Planejada' : 'Cancelada'}
                  </span>
                </div>
              </div>
              ))
            )}
          </div>
        </Card>

      </div>

      {/* Quick Actions - Compacto */}
      <Card className="p-3">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <button 
            onClick={() => navigate('/applications')}
            className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border p-3 transition-colors hover:border-primary hover:bg-muted"
          >
            <Droplet className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium text-foreground">Aplicação</span>
          </button>
          <button 
            onClick={() => navigate('/calculator')}
            className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border p-3 transition-colors hover:border-primary hover:bg-muted"
          >
            <Calculator className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium text-foreground">Calda</span>
          </button>
          <button 
            onClick={() => navigate('/reports')}
            className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border p-3 transition-colors hover:border-primary hover:bg-muted"
          >
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium text-foreground">Relatórios</span>
          </button>
          <button 
            onClick={() => navigate('/properties')}
            className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border p-3 transition-colors hover:border-primary hover:bg-muted"
          >
            <MapPin className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium text-foreground">Propriedades</span>
          </button>
          <button 
            onClick={() => navigate('/products')}
            className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border p-3 transition-colors hover:border-primary hover:bg-muted"
          >
            <DollarSign className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium text-foreground">Produtos</span>
          </button>
          <button 
            onClick={() => navigate('/recipes')}
            className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border p-3 transition-colors hover:border-primary hover:bg-muted"
          >
            <Droplet className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium text-foreground">Receituários</span>
          </button>
        </div>
      </Card>
    </div>
  );
}