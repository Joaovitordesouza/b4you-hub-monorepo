import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { KanbanBoard } from './pages/KanbanBoard';
import { LeadDetails } from './pages/LeadDetails';
import { Campaigns } from './pages/Campaigns';
import { CampaignDetails } from './pages/CampaignDetails';
import { Login } from './pages/Login';
import { KiwifyDownloader } from './pages/KiwifyDownloader';
import { KiwifyGallery } from './pages/KiwifyGallery';
import { HunterAgent } from './pages/HunterAgent';
import { CreatorDashboard } from './pages/CreatorDashboard';
import { CSPipeline } from './pages/CSPipeline'; 
import { ConnectHub } from './pages/ConnectHub';
import { Inbox } from './pages/Inbox'; 
import { OnboardingBoard } from './pages/OnboardingBoard';
import { HealthBoard } from './pages/HealthBoard'; // NOVA PÁGINA
import { LaunchPipeline } from './pages/LaunchPipeline';
import { HelpScreen } from './pages/HelpScreen';
import { AdminPanel } from './pages/AdminPanel';
import { MyWork } from './pages/MyWork'; 
import { SimpleTaskManager } from './pages/SimpleTaskManager'; // NEW PAGE
import { MyAgenda } from './pages/MyAgenda';
import { CalendarDashboard } from './pages/CalendarDashboard';
import { PublicScheduler } from './pages/PublicScheduler';
import { AuthProvider, useAuth } from './AuthContext';
import { EvolutionProvider } from './contexts/EvolutionContext'; 
import { ToastProvider } from './contexts/ToastContext'; 
import { Lead, Campanha, OnboardingStage, Producer, WorkTask } from './types';
import { db } from './firebase';
import { Loader2 } from 'lucide-react';
import { HashRouter } from 'react-router-dom';

const AppContent: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const [route, setRoute] = useState(window.location.hash || '#/');
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [producers, setProducers] = useState<Producer[]>([]); 
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash || '#/');
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    setLoadingData(true);

    let campaignsQuery: any = db.collection("campaigns");
    let leadsQuery: any = db.collection("leads");

    if (currentUser.role !== 'admin') {
      campaignsQuery = campaignsQuery.where("ownerId", "==", currentUser.id);
      leadsQuery = leadsQuery.where("ownerId", "==", currentUser.id);
    }

    const unsubCampaigns = campaignsQuery.onSnapshot((snapshot: any) => {
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Campanha[];
      data.sort((a, b) => new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime());
      setCampanhas(data);
    }, (error: any) => {
      console.error("Erro no listener de campanhas:", error);
    });

    const unsubLeads = leadsQuery.onSnapshot((snapshot: any) => {
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Lead[];
      setLeads(data);
      setLoadingData(false);
    }, (error: any) => {
      console.error("Erro no listener de leads:", error);
      setLoadingData(false);
    });

    const unsubProducers = db.collection('producers')
      .onSnapshot((snapshot: any) => {
        const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Producer[];
        setProducers(data);
      }, (error: any) => {
        console.error("Erro no listener de producers:", error);
      });

    const unsubTasks = db.collection('tasks')
      .onSnapshot((snapshot: any) => {
        const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as WorkTask[];
        setTasks(data);
      }, (error: any) => {
        console.error("Erro no listener de tasks:", error);
      });

    return () => {
      unsubCampaigns();
      unsubLeads();
      unsubProducers();
      unsubTasks();
    };
  }, [currentUser]);

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 space-y-4">
        <Loader2 className="animate-spin text-brand-600" size={40} />
        <p className="text-slate-500 font-medium animate-pulse">Inicializando B4You Hub...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  const handleUpdateLeadStatus = async (leadId: string, newStatus: any) => {
    try {
      await db.collection("leads").doc(leadId).update({ status: newStatus });
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  };

  const handleUpdateOnboardingStatus = async (itemId: string, newStatus: OnboardingStage) => {
    try {
      const producer = producers.find(p => p.id === itemId);
      if (producer) {
          await db.collection('producers').doc(itemId).update({ onboarding_stage: newStatus });
      } else {
          await db.collection("leads").doc(itemId).update({ onboardingStatus: newStatus });
      }
    } catch (err) {
      console.error("Erro ao atualizar status de onboarding:", err);
    }
  };

  const handleToggleCampaignStatus = async (id: string) => {
    const campanha = campanhas.find(c => c.id === id);
    if (!campanha) return;
    try {
      await db.collection("campaigns").doc(id).update({ 
        status: campanha.status === 'RODANDO' ? 'PAUSADA' : 'RODANDO' 
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Excluir campanha e todos os seus leads permanentemente?')) return;
    try {
      const batch = db.batch();
      const relatedLeads = leads.filter(l => l.campanha_id === id);
      relatedLeads.forEach(l => batch.delete(db.collection("leads").doc(l.id)));
      batch.delete(db.collection("campaigns").doc(id));
      await batch.commit();
      if (window.location.hash.includes(id)) window.location.hash = '#/campanhas';
    } catch (err) {
      console.error(err);
    }
  };

  const renderContent = () => {
    if (loadingData) return (
      <div className="flex flex-col items-center justify-center h-full py-20 space-y-3">
        <Loader2 className="animate-spin text-slate-300" size={32} />
        <span className="text-slate-400 text-sm">Sincronizando dados...</span>
      </div>
    );

    if (route === '#/' || route === '') return <Dashboard leads={leads} campanhas={campanhas} producers={producers} tasks={tasks} />;
    if (route.startsWith('#/my-work')) return <MyWork leads={leads} />;
    if (route.startsWith('#/tasks')) return <SimpleTaskManager />;
    if (route.startsWith('#/kanban')) return <KanbanBoard leads={leads} onUpdateStatus={handleUpdateLeadStatus} />;
    if (route.startsWith('#/onboarding')) return <OnboardingBoard producers={producers} onUpdateStatus={handleUpdateOnboardingStatus} />;
    if (route.startsWith('#/cs-pipeline')) return <CSPipeline producers={producers} />;
    if (route.startsWith('#/health-kanban')) return <HealthBoard producers={producers} />;
    if (route.startsWith('#/launch-control')) return <LaunchPipeline producers={producers} />;
    if (route.startsWith('#/kiwify-download')) return <KiwifyDownloader />;
    if (route.startsWith('#/kiwify-gallery')) return <KiwifyGallery />;
    if (route.startsWith('#/hunter')) return <HunterAgent />;
    if (route.startsWith('#/creators')) return <CreatorDashboard leads={leads} producers={producers} />;
    if (route.startsWith('#/connect')) return <ConnectHub leads={leads} />;
    if (route.startsWith('#/inbox')) return <Inbox />;
    if (route.startsWith('#/help')) return <HelpScreen />;
    
    if (route.startsWith('#/admin')) {
        if (currentUser.role === 'admin') return <AdminPanel />;
        return <div className="p-8 text-center text-red-500 font-bold">Acesso Negado.</div>;
    }

    if (route.startsWith('#/calendar')) return <CalendarDashboard />;
    if (route.startsWith('#/agenda')) return <MyAgenda />;
    if (route.startsWith('#/schedule/')) return <PublicScheduler />;

    if (route.startsWith('#/campanhas/')) {
       const campanhaId = route.replace('#/campanhas/', '');
       return <CampaignDetails campanhaId={campanhaId} campanhas={campanhas} leads={leads} />;
    }
    if (route.startsWith('#/campanhas')) {
      return (
        <Campaigns 
          campanhas={campanhas} 
          onCreateCampaign={() => {}} 
          onAddLeads={() => {}} 
          onToggleStatus={handleToggleCampaignStatus}
          onDeleteCampaign={handleDeleteCampaign}
        />
      );
    }
    if (route.startsWith('#/leads/')) {
      const leadId = route.replace('#/leads/', '');
      const lead = leads.find(l => l.id === leadId);
      return lead ? <LeadDetails lead={lead} /> : <div>Lead não encontrado</div>;
    }
    return <Dashboard leads={leads} campanhas={campanhas} producers={producers} tasks={tasks} />;
  };

  const isPublicRoute = route.startsWith('#/schedule/');

  if (isPublicRoute) {
    return (
        <HashRouter>
            <div className="bg-[#F9FAFB] min-h-screen">
                {renderContent()}
            </div>
        </HashRouter>
    );
  }

  return (
    <Layout>
      {renderContent()}
    </Layout>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <EvolutionProvider>
        <ToastProvider>
            <HashRouter>
                <AppContent />
            </HashRouter>
        </ToastProvider>
    </EvolutionProvider>
  </AuthProvider>
);

export default App;