import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Calendar, Clock, TrendingUp, Plus, Activity as ActivityIcon } from "lucide-react";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomizationContext } from "@/contexts/CustomizationContext";
import { useAppointmentStatusConfigContext } from "@/contexts/AppointmentStatusConfigContext";
import { useToast } from "@/components/ui/use-toast";
import { ViewRecordModal } from "@/components/ViewRecordModal";

interface DashboardAppointment {
  id: string;
  patient_id: string | null;
  patient_name: string;
  appointment_time: string;
  service_name: string | null;
  status: string;
}

interface DashboardActivity {
  id: string;
  action: string;
  time: string;
  type: 'completed' | 'new' | 'report' | 'scheduled';
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [todaysAppointments, setTodaysAppointments] = useState<DashboardAppointment[]>([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    weekAppointments: 0,
    pendingReports: 0
  });
  const [recentActivities, setRecentActivities] = useState<DashboardActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const { user } = useAuth();
  const { customizationData } = useCustomizationContext();
  const { getLabel: getStatusLabel } = useAppointmentStatusConfigContext();
  const { toast } = useToast();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const today = format(new Date(), 'yyyy-MM-dd');
        const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

        // Fetch all data in parallel
        const [
          patientsResult,
          todayApptsResult,
          weekApptsResult,
          pendingRecordsResult
        ] = await Promise.all([
          supabase.from('patients').select('id', { count: 'exact', head: true }),
          supabase
            .from('appointments')
            .select('id, patient_id, patient_name, appointment_time, service_name, status')
            .eq('appointment_date', today)
            .order('appointment_time', { ascending: true }),
          supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .gte('appointment_date', weekStart)
            .lte('appointment_date', weekEnd),
          supabase
            .from('medical_records')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'starting')
        ]);

        setStats({
          totalPatients: patientsResult.count || 0,
          todayAppointments: todayApptsResult.data?.length || 0,
          weekAppointments: weekApptsResult.count || 0,
          pendingReports: pendingRecordsResult.count || 0
        });

        setTodaysAppointments(todayApptsResult.data || []);

        // Build recent activities from appointments
        const activities: DashboardActivity[] = [];
        if (todayApptsResult.data) {
          todayApptsResult.data.slice(0, 4).forEach((apt, index) => {
            activities.push({
              id: apt.id,
              action: `Consulta agendada com ${apt.patient_name}`,
              time: apt.appointment_time,
              type: apt.status === 'confirmed' ? 'scheduled' : 'new'
            });
          });
        }
        setRecentActivities(activities);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusBadge = (status: string) => {
    const label = getStatusLabel(status);
    const classMap: Record<string, string> = {
      confirmed: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200",
      pending: "bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200",
      paid: "bg-violet-100 text-violet-700 hover:bg-violet-100 border-violet-200",
      cancelled: "bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200",
      completed: "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200",
    };
    return (
      <Badge className={classMap[status] ?? "bg-muted text-muted-foreground"} variant={classMap[status] ? undefined : "secondary"}>
        {label}
      </Badge>
    );
  };

  const handleViewRecord = async (patientId: string | null, patientName: string) => {
    if (!patientId) {
      toast({
        title: "Dados insuficientes",
        description: "Não foi possível identificar o paciente para buscar o prontuário.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', patientId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Prontuário não encontrado",
          description: `O paciente ${patientName} não possui prontuário cadastrado.`,
          variant: "destructive",
        });
        return;
      }

      // Map DB record to Modal format
      const statusMap: Record<string, string> = {
        'starting': 'Iniciando',
        'in_treatment': 'Em Tratamento',
        'completed': 'Concluído',
        'paused': 'Pausado'
      };

      setSelectedRecord({
        id: data.id,
        patientName: patientName,
        patientId: patientId,
        diagnosis: data.diagnosis,
        notes: data.notes || '',
        status: statusMap[data.status] || 'Iniciando',
        sessions: data.sessions || 0,
        lastUpdate: format(new Date(data.updated_at), "dd/MM/yyyy"),
        nextAppointment: data.next_appointment ? format(new Date(data.next_appointment), "dd/MM/yyyy") : "A definir"
      });
      setIsRecordModalOpen(true);
    } catch (err) {
      console.error("Error fetching record:", err);
      toast({
        title: "Erro ao buscar prontuário",
        description: "Ocorreu um erro ao tentar acessar os dados do paciente.",
        variant: "destructive",
      });
    }
  };

  const getActivityIcon = (type: string) => {
    const baseClasses = "w-2 h-2 rounded-full";
    switch (type) {
      case 'completed':
        return <div className={`${baseClasses} bg-green-400`} />;
      case 'new':
        return <div className={`${baseClasses} bg-blue-400`} />;
      case 'report':
        return <div className={`${baseClasses} bg-orange-400`} />;
      case 'scheduled':
        return <div className={`${baseClasses} bg-purple-400`} />;
      default:
        return <div className={`${baseClasses} bg-gray-400`} />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-6 animate-fade-in p-2 md:p-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Skeleton className="h-6 md:h-8 w-36 md:w-48 mb-2" />
            <Skeleton className="h-4 w-48 md:w-64" />
          </div>
          <Skeleton className="h-9 md:h-10 w-28 md:w-36" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 md:h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <Skeleton className="lg:col-span-2 h-72 md:h-96" />
          <Skeleton className="h-72 md:h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10 max-w-7xl mx-auto">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row items-center justify-between gap-6 bg-card/40 p-6 rounded-3xl border border-border/50 backdrop-blur-sm">
        <div className="space-y-1 text-center md:text-left">
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground">
            Olá, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-muted-foreground font-medium">
            Hoje é {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}. O sistema possui <span className="text-foreground font-bold">{stats.todayAppointments} compromissos</span> agendados.
          </p>
        </div>
        <Button
          className="text-white hover:opacity-90 px-8 h-12 text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
          style={{ backgroundColor: customizationData.primaryColor }}
          onClick={() => navigate('/agenda')}
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Agendamento
        </Button>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Pacientes"
          value={stats.totalPatients}
          subtitle="Base de dados completa"
          icon={Users}
          iconColor="text-blue-500"
        />
        <StatCard
          title="Agenda de Hoje"
          value={stats.todayAppointments}
          subtitle={todaysAppointments[0] ? `Próximo: ${todaysAppointments[0].appointment_time}` : "Sem consultas próximas"}
          icon={Calendar}
          iconColor="text-emerald-500"
        />
        <StatCard
          title="Consultas na Semana"
          value={stats.weekAppointments}
          subtitle="Fluxo semanal"
          icon={Clock}
          iconColor="text-amber-500"
        />
        <StatCard
          title="Prontuários"
          value={stats.pendingReports}
          subtitle="Pendentes de finalização"
          icon={TrendingUp}
          iconColor="text-rose-500"
        />
      </section>

      {/* Main Content */}
      <div className="space-y-4">
        {/* Today's Appointments List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-6 h-6" style={{ color: customizationData.primaryColor }} />
              Próximos Atendimentos
            </h2>
            <Button variant="link" onClick={() => navigate('/agenda')} className="text-muted-foreground text-xs hover:text-foreground transition-colors">
              Ver agenda completa
            </Button>
          </div>

          <div className="bg-card/30 rounded-3xl border border-border/40 overflow-hidden backdrop-blur-sm">
            {todaysAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Calendar className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Tudo tranquilo por aqui</h3>
                <p className="text-xs text-muted-foreground mt-1">Nenhuma consulta agendada para o restante do dia.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {todaysAppointments.map((appointment) => (
                  <div key={appointment.id} className="p-5 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-muted flex flex-col items-center justify-center border border-border/50 shrink-0">
                        <span className="text-xs font-bold leading-none">{appointment.appointment_time.split(':')[0]}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">{appointment.appointment_time.split(':')[1]}</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-foreground truncate max-w-[150px] md:max-w-xs">{appointment.patient_name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <ActivityIcon className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground font-medium">{appointment.service_name || 'Consulta'}</span>
                          {getStatusBadge(appointment.status)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg text-[11px] font-bold px-3"
                        onClick={() => handleViewRecord(appointment.patient_id, appointment.patient_name)}
                      >
                        Prontuário
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <ViewRecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        record={selectedRecord}
        onEdit={() => navigate('/prontuarios')}
      />
    </div>
  );
};

export default Dashboard;
