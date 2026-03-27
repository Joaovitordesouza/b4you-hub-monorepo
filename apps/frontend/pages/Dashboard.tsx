
import React, { useMemo, useState, useEffect } from 'react';
import { Lead, Campanha, Producer, WorkTask, EvolutionChat } from '../types';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts';
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  Download, 
  Activity, 
  Target,
  Zap,
  MoreHorizontal,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageCircle,
  UserCheck,
  LayoutDashboard,
  ChevronRight,
  Star,
  AlertTriangle,
  Plus
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useEvolution } from '../contexts/EvolutionContext';
import { db, functions } from '../firebase';
import { startOfDay, endOfDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  leads: Lead[];
  campanhas: Campanha[];
  producers: Producer[];
  tasks: WorkTask[];
}

// --- Componentes Auxiliares de UI ---

const KpiCard = ({ title, value, subValue, trend, icon: Icon, colorClass, chartData }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-3xl font-black text-gray-900 tracking-tight">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 text-opacity-100`}>
        <Icon size={20} className={colorClass.replace('bg-', 'text-')} strokeWidth={2.5} />
      </div>
    </div>
    
    <div className="flex items-center justify-between">
      <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-green-50 text-green-700' : trend === 'down' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}`}>
        {trend === 'up' ? <ArrowUpRight size={14} className="mr-1" /> : trend === 'down' ? <ArrowDownRight size={14} className="mr-1" /> : <Activity size={14} className="mr-1" />}
        {subValue}
      </div>
      <span className="text-[10px] text-gray-400 font-medium">Status Atual</span>
    </div>

    {/* Sparkline Decorativo de Fundo */}
    <div className="absolute -bottom-4 -right-4 w-32 h-16 opacity-10 group-hover:opacity-20 transition-opacity">
       <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <Area type="monotone" dataKey="value" stroke="currentColor" fill="currentColor" className={colorClass.replace('bg-', 'text-')} />
          </AreaChart>
       </ResponsiveContainer>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white p-3 rounded-xl shadow-xl border border-gray-700 text-xs">
        <p className="font-bold mb-2 text-gray-300">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></div>
            <span className="font-medium">{entry.name}:</span>
            <span className="font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC<Props> = ({ leads, campanhas, producers, tasks }) => {
  const { currentUser } = useAuth();
  const { instances } = useEvolution();
  const [allChats, setAllChats] = useState<EvolutionChat[]>([]);

  // Fetch chats for unread count
  useEffect(() => {
    if (!currentUser) return;
    const unsub = db.collectionGroup('chats').onSnapshot(snap => {
      try {
        const data = snap.docs.map(doc => {
          const parentDoc = doc.ref.parent.parent;
          return { 
            id: doc.id, 
            ...doc.data(),
            instanceId: parentDoc ? parentDoc.id : null
          } as EvolutionChat & { instanceId: string | null };
        });
        setAllChats(data);
      } catch (err) {
        console.error("Erro ao processar dados de chats:", err);
      }
    });
    return () => unsub();
  }, [currentUser]);

  const [agendaEvents, setAgendaEvents] = useState<any[]>([]);
  const [loadingAgenda, setLoadingAgenda] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const fetchTodayEvents = async () => {
      setLoadingAgenda(true);
      try {
        const now = new Date();
        const listEvents = functions.httpsCallable('listEvents');
        const { data } = await listEvents({ 
          timeMin: startOfDay(now).toISOString(), 
          timeMax: endOfDay(now).toISOString() 
        });
        
        let fetched = data as any[];
        // Filtra para remover eventos que já passaram e limita a 5
        fetched = fetched.filter(e => {
            const ed = e.end?.dateTime ? new Date(e.end.dateTime) : new Date(e.end?.date);
            return ed > now;
        });
        setAgendaEvents(fetched.slice(0, 5));
      } catch (e) {
        console.error("Falha ao carregar agenda:", e);
      } finally {
        setLoadingAgenda(false);
      }
    };
    fetchTodayEvents();
  }, [currentUser]);

  // --- Processamento de Dados (Foco CS Cockpit) ---

  // 1. Meus Clientes (Producers onde sou responsável)
  const myProducers = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return producers;
    return producers.filter(p => p.responsibleInternalId === currentUser.id || p.gerente_conta === currentUser.id);
  }, [producers, currentUser]);

  // 2. Minhas Tarefas Pendentes
  const myPendingTasks = useMemo(() => {
    if (!currentUser) return [];
    return tasks.filter(t => t.assignedTo?.includes(currentUser.id) && t.status !== 'COMPLETED');
  }, [tasks, currentUser]);

  // 3. Chats Não Lidos (Métricas de Atendimento)
  const unreadCount = useMemo(() => {
    // Filtra chats das instâncias que o usuário tem acesso ou é responsável
    if (!currentUser || !currentUser.linkedInstanceId) return 0;
    const userChats = allChats.filter((c: any) => c.instanceId === currentUser.linkedInstanceId);
    return userChats.reduce((acc, chat) => acc + (chat.unreadCount || 0), 0);
  }, [allChats, currentUser]);

  // 4. SLA Score (Tempo Médio de Resposta)
  const avgResponseTime = currentUser?.performance?.avgResponseTime || 0;
  const formatResponseTime = (minutes: number) => {
    if (minutes === 0) return "N/A";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // 5. Saúde da Carteira (Distribuição)
  const healthData = useMemo(() => {
    const counts = { SAUDAVEL: 0, ATENCAO: 0, RISCO: 0, CHURN: 0 };
    myProducers.forEach(p => {
      const status = p.stats_financeiros?.status_health || 'SAUDAVEL';
      counts[status as keyof typeof counts]++;
    });
    return [
      { name: 'Saudável', value: counts.SAUDAVEL, color: '#10B981' },
      { name: 'Atenção', value: counts.ATENCAO, color: '#F59E0B' },
      { name: 'Risco', value: counts.RISCO, color: '#EF4444' },
      { name: 'Churn', value: counts.CHURN, color: '#6B7280' },
    ].filter(d => d.value > 0);
  }, [myProducers]);

  // 6. Timeline de Performance (Mock)
  const timelineData = useMemo(() => {
    const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
    return days.map(day => ({
      name: day,
      sla: 80 + Math.floor(Math.random() * 20),
      tasks: Math.floor(Math.random() * 10),
      value: Math.floor(Math.random() * 100)
    }));
  }, []);

  // 7. Clientes por Etapa de Onboarding
  const onboardingData = useMemo(() => {
    const stages = ['HANDOVER', 'SETUP_ACESSO', 'IMPLEMENTACAO', 'PRONTO_PRA_VENDER', 'FINALIZADO'];
    return stages.map(stage => ({
      name: stage.replace('_', ' '),
      value: myProducers.filter(p => p.onboarding_stage === stage).length
    })).filter(d => d.value > 0);
  }, [myProducers]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      
      {/* Header Cockpit */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-600 mb-1 font-bold text-xs uppercase tracking-widest bg-brand-50 w-fit px-3 py-1 rounded-full border border-brand-100">
             <LayoutDashboard size={12} /> Cockpit de Gestão CS
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Olá, {currentUser?.nome.split(' ')[0]}!</h1>
          <p className="text-gray-500 font-medium">Aqui está o panorama geral da sua carteira e obrigações hoje.</p>
        </div>
        <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-50 transition-colors shadow-sm">
                <Calendar size={16} className="text-gray-400"/>
                {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
            </button>
            <button 
              onClick={() => window.location.hash = '#/tasks'}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
                <Plus size={16} />
                Nova Tarefa
            </button>
        </div>
      </div>

      {/* Grid de KPIs CS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
            title="Minha Carteira" 
            value={myProducers.length}
            subValue="Clientes Ativos"
            trend="neutral"
            icon={Briefcase}
            colorClass="bg-blue-500"
            chartData={timelineData}
        />
        <KpiCard 
            title="Tarefas Pendentes" 
            value={myPendingTasks.length}
            subValue={myPendingTasks.filter(t => t.priority === 'CRITICAL' || t.priority === 'HIGH').length + " Críticas"}
            trend={myPendingTasks.length > 5 ? "down" : "up"}
            icon={CheckCircle2}
            colorClass="bg-orange-500"
            chartData={timelineData}
        />
        <KpiCard 
            title="Mensagens Não Lidas" 
            value={unreadCount}
            subValue="Aguardando Retorno"
            trend={unreadCount > 10 ? "down" : "up"}
            icon={MessageCircle}
            colorClass="bg-brand-500"
            chartData={timelineData}
        />
        <KpiCard 
            title="Tempo Médio de Resposta" 
            value={avgResponseTime > 0 ? formatResponseTime(avgResponseTime) : "N/A"}
            subValue={avgResponseTime > 0 ? `Geralmente em ${formatResponseTime(avgResponseTime)}` : "Sem dados"}
            trend={avgResponseTime > 0 && avgResponseTime <= 30 ? "up" : "down"}
            icon={Clock}
            colorClass="bg-purple-500"
            chartData={timelineData}
        />
      </div>

      {/* Seção Principal: Carteira e Tarefas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Minha Carteira (Foco em Saúde e Status) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-card">
              <div className="flex justify-between items-center mb-6">
                  <div>
                      <h3 className="text-lg font-bold text-gray-900">Minha Carteira de Clientes</h3>
                      <p className="text-xs text-gray-500">Acompanhamento em tempo real dos seus produtores.</p>
                  </div>
                  <button 
                    onClick={() => window.location.hash = '#/cs-pipeline'}
                    className="text-brand-600 text-xs font-bold hover:underline flex items-center gap-1"
                  >
                    Ver Pipeline Completo <ChevronRight size={14} />
                  </button>
              </div>
              
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead>
                          <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                              <th className="pb-3 pl-2">Produtor</th>
                              <th className="pb-3">Etapa</th>
                              <th className="pb-3">Saúde</th>
                              <th className="pb-3">Score</th>
                              <th className="pb-3 text-right pr-2">Ações</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                          {myProducers.slice(0, 6).map((producer) => (
                              <tr key={producer.id} className="group hover:bg-gray-50 transition-colors">
                                  <td className="py-3 pl-2">
                                      <div className="flex items-center gap-3">
                                          <img src={producer.foto_url} alt="" className="w-8 h-8 rounded-full border border-gray-100" referrerPolicy="no-referrer" />
                                          <div>
                                              <p className="text-sm font-bold text-gray-900">{producer.nome_display}</p>
                                              <p className="text-[10px] text-gray-500 font-medium">{producer.produto_principal}</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="py-3">
                                      <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider">
                                          {producer.onboarding_stage?.replace('_', ' ') || 'ATIVO'}
                                      </span>
                                  </td>
                                  <td className="py-3">
                                      <div className="flex items-center gap-1.5">
                                          <div className={`w-2 h-2 rounded-full ${
                                              producer.stats_financeiros?.status_health === 'SAUDAVEL' ? 'bg-green-500' :
                                              producer.stats_financeiros?.status_health === 'ATENCAO' ? 'bg-amber-500' : 'bg-red-500'
                                          }`}></div>
                                          <span className="text-xs font-bold text-gray-700">{producer.stats_financeiros?.status_health || 'SAUDÁVEL'}</span>
                                      </div>
                                  </td>
                                  <td className="py-3">
                                      <div className="flex items-center gap-2">
                                          <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                              <div 
                                                className={`h-full rounded-full ${producer.stats_financeiros?.health_score > 80 ? 'bg-green-500' : 'bg-amber-500'}`} 
                                                style={{ width: `${producer.stats_financeiros?.health_score || 100}%` }}
                                              ></div>
                                          </div>
                                          <span className="text-[10px] font-bold text-gray-500">{producer.stats_financeiros?.health_score || 100}%</span>
                                      </div>
                                  </td>
                                  <td className="py-3 text-right pr-2">
                                      <button 
                                        onClick={() => window.location.hash = `#/inbox?chatId=${producer.leadId}`}
                                        className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-gray-400 hover:text-brand-600 transition-all"
                                      >
                                          <MessageSquare size={16} />
                                      </button>
                                  </td>
                              </tr>
                          ))}
                          {myProducers.length === 0 && (
                              <tr>
                                  <td colSpan={5} className="py-10 text-center text-gray-400 text-sm italic">Você ainda não possui clientes vinculados.</td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Tarefas Críticas / Minha Agenda Hoje */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-card flex flex-col">
              <div className="mb-6 flex justify-between items-center">
                  <div>
                      <h3 className="text-lg font-bold text-gray-900">Minha Agenda Hoje</h3>
                      <p className="text-xs text-gray-500">Seus próximos compromissos.</p>
                  </div>
                  {loadingAgenda && <div className="w-4 h-4 rounded-full border-2 border-brand-500 border-t-transparent animate-spin"></div>}
              </div>
              <div className="flex-1 space-y-3">
                  {agendaEvents.map((event) => {
                      const startTime = event.start?.dateTime ? new Date(event.start.dateTime) : null;
                      const isNow = startTime && startTime <= new Date();
                      
                      return (
                          <div key={event.id} className={`p-3 rounded-xl border transition-all group cursor-pointer ${isNow ? 'bg-brand-50 border-brand-200' : 'bg-white border-gray-100 hover:border-gray-300'}`}>
                              <div className="flex items-start gap-3">
                                  <div className={`mt-0.5 p-1.5 rounded-lg ${isNow ? 'bg-brand-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500'}`}>
                                      {isNow ? <Zap size={14}/> : <Calendar size={14}/>}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <p className={`text-xs font-bold truncate ${isNow ? 'text-brand-900' : 'text-gray-900'}`}>{event.summary || 'Sem Título'}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                          <span className={`text-[10px] font-bold flex items-center gap-1 ${isNow ? 'text-brand-700' : 'text-gray-500'}`}>
                                              <Clock size={10} /> {startTime ? format(startTime, 'HH:mm') : 'Dia Todo'}
                                          </span>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      );
                  })}
                  {!loadingAgenda && agendaEvents.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center py-10">
                          <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-3">
                              <CheckCircle2 size={24} />
                          </div>
                          <p className="text-xs font-bold text-gray-500">Agenda livre!</p>
                          <p className="text-[10px] text-gray-400">Você não tem mais compromissos hoje.</p>
                      </div>
                  )}
              </div>
              <button 
                onClick={() => window.location.hash = '#/calendar'}
                className="mt-6 w-full py-2.5 text-xs font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all border border-dashed border-gray-200"
              >
                  Abrir Agenda Completa
              </button>
          </div>
      </div>

      {/* Terceira Linha: Saúde, Onboarding e Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Distribuição de Saúde */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-card">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Saúde da Carteira</h3>
              <div className="flex flex-col items-center">
                  <div className="w-full h-48 relative">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie 
                                data={healthData} 
                                innerRadius={60} 
                                outerRadius={80} 
                                paddingAngle={5} 
                                dataKey="value"
                              >
                                  {healthData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                  ))}
                              </Pie>
                              <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-2xl font-black text-gray-900">{myProducers.length}</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Total</span>
                      </div>
                  </div>
                  <div className="w-full grid grid-cols-2 gap-3 mt-4">
                      {healthData.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 border border-gray-100">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                              <div className="flex-1">
                                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{item.name}</p>
                                  <p className="text-sm font-black text-gray-900">{item.value}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>

          {/* Onboarding Pipeline Summary */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-card">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Pipeline de Onboarding</h3>
              <div className="space-y-4">
                  {onboardingData.map((stage, idx) => (
                      <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500">
                              <span>{stage.name}</span>
                              <span>{stage.value} Clientes</span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-brand-500 rounded-full" 
                                style={{ width: `${(stage.value / myProducers.length) * 100}%` }}
                              ></div>
                          </div>
                      </div>
                  ))}
                  {onboardingData.length === 0 && (
                      <div className="py-10 text-center text-gray-400 text-xs italic">Nenhum cliente em onboarding no momento.</div>
                  )}
              </div>
          </div>

          {/* Performance Semanal (Tempo de Resposta) */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-card">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Tempo de Resposta</h3>
                  <div className="px-2 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded-lg border border-green-100">
                      Na média
                  </div>
              </div>
              <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timelineData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                          <defs>
                              <linearGradient id="colorSla" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 10, fontWeight: 600}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 10, fontWeight: 600}} domain={[0, 'auto']} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="sla" name="Minutos" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorSla)" />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
              <div className="mt-4 flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-100">
                  <div className="flex items-center gap-2">
                      <Star size={16} className="text-purple-600 fill-purple-600" />
                      <span className="text-xs font-bold text-purple-900">Seu Ranking</span>
                  </div>
                  <span className="text-sm font-black text-purple-900">Top 3 CS</span>
              </div>
          </div>

      </div>
    </div>
  );
};
