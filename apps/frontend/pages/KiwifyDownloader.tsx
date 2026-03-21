

import React, { useState, useEffect } from 'react';
import { Download, Loader2, CheckCircle, Plus, Trash2, FolderOpen, PlayCircle, HardDrive, Wifi, Zap, X, ShieldCheck, Tv, Layers, AlertCircle, Cpu, Clock, FileVideo, Server, Activity, User, Link as LinkIcon, Mail } from 'lucide-react';
import { KiwifyCourse, Workspace, MigrationStatus } from '../types';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { bridgeApi } from '../services/bridgeApi';

// Componente Interno: Modal de Detalhes da Migração (Elite UI Version)
const MigrationStatusModal = ({ course, migration, onClose, getSafeUrl }: { course: KiwifyCourse, migration: MigrationStatus, onClose: () => void, getSafeUrl: (c: KiwifyCourse, m?: MigrationStatus) => string }) => {
    const progress = migration.progress || 0;
    const coverUrl = getSafeUrl(course, migration);
    
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#111827]/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-white/20 relative group">
                
                {/* Botão Fechar Flutuante */}
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 z-20 bg-black/20 hover:bg-black/40 text-white p-2.5 rounded-full backdrop-blur-md transition-all transform hover:scale-105 hover:rotate-90 border border-white/10"
                >
                    <X size={18} />
                </button>

                {/* Header Cinemático */}
                <div className="relative h-56 bg-gray-900 overflow-hidden">
                    <div className="absolute inset-0">
                         <img src={coverUrl} className="w-full h-full object-cover opacity-50 blur-md scale-110 group-hover:scale-105 transition-transform duration-[2s]" alt="Background" />
                         <div className="absolute inset-0 bg-gradient-to-t from-white via-[#111827]/40 to-[#111827]/10"></div>
                         <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/90"></div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-8 flex items-end gap-6 translate-y-2">
                        <div className="relative group/cover">
                            <div className="absolute -inset-0.5 bg-gradient-to-tr from-brand-500 to-blue-500 rounded-2xl blur opacity-30 group-hover/cover:opacity-60 transition duration-500"></div>
                            <img src={coverUrl} className="relative w-28 h-28 rounded-2xl object-cover shadow-2xl border-[3px] border-white" alt="Capa" />
                        </div>
                        <div className="mb-3 flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2.5 py-0.5 rounded-full bg-white/90 text-brand-700 text-[10px] font-black uppercase tracking-widest border border-brand-100 flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                                    </span>
                                    Em Processamento
                                </span>
                            </div>
                            <h2 className="text-3xl font-black text-gray-900 leading-none tracking-tight drop-shadow-sm">{course.name}</h2>
                        </div>
                    </div>
                </div>

                {/* Corpo do Status */}
                <div className="px-8 pb-8 pt-4 bg-white relative">
                    
                    {/* Barra de Progresso High-End */}
                    <div className="mb-10 relative">
                        <div className="flex justify-between items-end mb-3">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Status da Sincronização</span>
                                <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <Activity size={14} className="text-brand-500" />
                                    {migration.status === 'preparing' ? 'Analisando estrutura...' : 'Renderizando streams...'}
                                </span>
                            </div>
                            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-400 tracking-tighter">
                                {progress}%
                            </span>
                        </div>
                        <div className="h-5 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner border border-gray-100/50">
                            <div 
                                className="h-full bg-gradient-to-r from-brand-500 via-brand-400 to-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all duration-700 ease-out relative"
                                style={{ width: `${progress}%` }}
                            >
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                                <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite] -skew-x-12"></div>
                            </div>
                        </div>
                    </div>

                    {/* Grid de Métricas Refinado */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl border border-gray-200/60 flex flex-col items-center justify-center text-center shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 shadow-sm border border-blue-100">
                                <Layers size={20} strokeWidth={2.5} />
                            </div>
                            <span className="text-2xl font-black text-gray-900 tabular-nums tracking-tight">
                                {migration.completedModules !== undefined ? migration.completedModules : '-'}
                                <span className="text-gray-400 text-sm font-bold ml-0.5">/{migration.totalModules || '-'}</span>
                            </span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Módulos</span>
                        </div>
                        
                        <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl border border-gray-200/60 flex flex-col items-center justify-center text-center shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2 shadow-sm border border-purple-100">
                                <FileVideo size={20} strokeWidth={2.5} />
                            </div>
                            <span className="text-2xl font-black text-gray-900 tabular-nums tracking-tight">
                                {migration.completedLessons !== undefined ? migration.completedLessons : 0}
                                <span className="text-gray-400 text-sm font-bold ml-0.5">/{migration.totalLessons || '?'}</span>
                            </span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Aulas</span>
                        </div>

                        <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl border border-gray-200/60 flex flex-col items-center justify-center text-center shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow">
                             <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-2 shadow-sm border border-orange-100">
                                <Clock size={20} strokeWidth={2.5} />
                            </div>
                             <span className="text-lg font-black text-gray-900 tabular-nums tracking-tight mt-1">
                                {migration.updatedAt ? new Date(migration.updatedAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                             </span>
                             <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Atualizado</span>
                        </div>
                    </div>

                    {/* Rodapé Técnico */}
                    <div className="bg-[#111827] rounded-xl p-3 flex items-center justify-between shadow-inner">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-500/10 p-1.5 rounded-lg border border-green-500/20">
                                <Server size={14} className="text-green-500" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Worker Node</span>
                                <span className="text-xs text-gray-200 font-mono font-medium">{migration.workerId || 'Allocating...'}</span>
                            </div>
                        </div>
                        <div className="h-8 w-px bg-gray-700/50"></div>
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col text-right">
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Engine</span>
                                <span className="text-xs text-brand-400 font-bold">Fast Stream v7.0</span>
                            </div>
                            <div className="bg-brand-500/10 p-1.5 rounded-lg border border-brand-500/20">
                                <Cpu size={14} className="text-brand-500" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const KiwifyDownloader: React.FC = () => {
  const { currentUser } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [courses, setCourses] = useState<KiwifyCourse[]>([]);
  const [migrations, setMigrations] = useState<MigrationStatus[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmittingWs, setIsSubmittingWs] = useState(false);
  const [wsError, setWsError] = useState('');
  
  // States do Form
  const [newWsName, setNewWsName] = useState('');
  const [newWsToken, setNewWsToken] = useState('');
  const [newWsEmail, setNewWsEmail] = useState(''); 
  
  const [detailedMigration, setDetailedMigration] = useState<{course: KiwifyCourse, migration: MigrationStatus} | null>(null);
  const [linkingLead, setLinkingLead] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
      const params = new URLSearchParams(window.location.hash.split('?')[1]);
      const leadId = params.get('leadId');
      const leadName = params.get('leadName');
      
      if (leadId && leadName) {
          setLinkingLead({ id: leadId, name: decodeURIComponent(leadName) });
          setIsCreating(true);
      }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    return db.collection("workspaces").where("ownerId", "==", currentUser.id).onSnapshot((snapshot) => {
      setWorkspaces(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Workspace[]);
    });
  }, [currentUser]);

  useEffect(() => {
    if (!selectedWorkspace) {
      setMigrations([]);
      return;
    }
    return bridgeApi.subscribeToWorkspaceMigrations(selectedWorkspace.id, setMigrations);
  }, [selectedWorkspace]);

  useEffect(() => {
      if (detailedMigration) {
          const updatedMig = migrations.find(m => m.courseId === detailedMigration.course.id);
          if (updatedMig) {
              setDetailedMigration(prev => prev ? ({...prev, migration: updatedMig}) : null);
          }
      }
  }, [migrations]);

  const handleSelectWorkspace = async (ws: Workspace) => {
    setSelectedWorkspace(ws);
    setLoadingCourses(true);
    try {
      const courseList = await bridgeApi.listCourses(ws.token);
      setCourses(Array.isArray(courseList) ? courseList : []);
    } catch (e) { console.error(e); } finally { setLoadingCourses(false); }
  };

  const createWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newWsName || !newWsToken) return;
    setIsSubmittingWs(true);
    setWsError('');
    try {
        const id = `ws_${Date.now()}`;
        // Adicionando originEmail e linkedLeadId sem quebrar schema antigo
        await db.collection("workspaces").doc(id).set({
          id, 
          ownerId: currentUser.id, 
          nome: newWsName, 
          token: newWsToken,
          originEmail: newWsEmail, 
          linkedLeadId: linkingLead?.id || null, // Vínculo com Lead
          createdAt: new Date().toISOString(), 
          plataforma: 'Kiwify'
        });
        setIsCreating(false); 
        setNewWsName(''); 
        setNewWsToken('');
        setNewWsEmail('');
    } catch (error: any) { setWsError("Erro ao conectar. Verifique as permissões."); } finally { setIsSubmittingWs(false); }
  };

  const deleteWorkspace = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Desconectar esta conta?')) return;
    await db.collection("workspaces").doc(id).delete();
    if (selectedWorkspace?.id === id) setSelectedWorkspace(null);
  };

  const handleCourseAction = async (course: KiwifyCourse) => {
    if (!selectedWorkspace) return;
    const existing = migrations.find(m => m.courseId === course.id);
    
    if (existing?.status === 'completed') {
        window.location.hash = `#/kiwify-gallery?ws=${selectedWorkspace.id}&c=${course.id}`;
        return;
    }
    
    if (existing?.status === 'processing' || existing?.status === 'preparing' || existing?.status === 'downloading') {
        setDetailedMigration({ course, migration: existing });
        return;
    }

    // Inicia migração passando o leadId se houver vínculo
    await bridgeApi.migrateCourse(
        course.id, 
        selectedWorkspace.id, 
        selectedWorkspace.token, 
        course.name, 
        course.cover_image,
        selectedWorkspace.linkedLeadId // Passa o Lead ID vinculado
    );

    // TRIGGER AUTOMÁTICO DE PIPELINE: Atualiza o status do Lead para MIGRATION
    if (selectedWorkspace.linkedLeadId) {
        try {
            await db.collection('leads').doc(selectedWorkspace.linkedLeadId).update({
                onboardingStatus: 'MIGRATION',
                migrationProgress: 0,
                // Opcional: Adicionar timestamp
            });
            console.log(`Lead ${selectedWorkspace.linkedLeadId} movido para MIGRATION.`);
        } catch (e) {
            console.error("Erro ao atualizar status do lead:", e);
        }
    }
  };

  const getSafeCoverUrl = (course: KiwifyCourse, migration?: MigrationStatus) => {
    if (migration?.coverImage) {
        if (migration.coverImage.includes('firebasestorage')) return migration.coverImage;
        return `https://wsrv.nl/?url=${encodeURIComponent(migration.coverImage)}`;
    }
    return `https://wsrv.nl/?url=${encodeURIComponent(course.cover_image)}`;
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-24 animate-in fade-in duration-700">
      
      {/* Contexto de Vínculo (Se houver) */}
      {linkingLead && (
          <div className="bg-brand-50 border-b border-brand-100 p-4 -mt-8 mb-8 flex items-center justify-center gap-2 text-brand-800 text-sm font-medium animate-in slide-in-from-top-4">
              <LinkIcon size={16} />
              Configurando migração para o creator: <strong>{linkingLead.name}</strong>
              <button onClick={() => setLinkingLead(null)} className="ml-4 text-xs text-brand-600 hover:underline">Cancelar Vínculo</button>
          </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-gray-100 pb-6 px-4 md:px-0">
        <div>
           <div className="flex items-center space-x-2 text-brand-600 mb-2 bg-brand-50 w-fit px-3 py-1 rounded-full border border-brand-100 shadow-sm">
             <Tv size={14} strokeWidth={2.5} />
             <span className="text-[10px] font-black uppercase tracking-widest">Sincronizador v7.0 (Fast Stream)</span>
           </div>
           <h1 className="text-3xl md:text-4xl font-black text-[#111827] tracking-tight">CENTRAL DE MIGRAÇÃO</h1>
        </div>
      </div>

      <div className="flex overflow-x-auto pb-4 gap-4 px-4 md:px-0 scrollbar-hide">
            <button onClick={() => setIsCreating(true)} className="min-w-[200px] h-[100px] rounded-2xl border-2 border-dashed border-gray-300 hover:border-brand-500 hover:bg-brand-50 flex flex-col items-center justify-center text-gray-400 hover:text-brand-600 transition-all group">
                <Plus size={20} className="mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold uppercase">Nova Conexão</span>
            </button>
            {workspaces.map(ws => (
                <div key={ws.id} onClick={() => handleSelectWorkspace(ws)} className={`min-w-[280px] h-[100px] p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${selectedWorkspace?.id === ws.id ? 'bg-[#111827] text-white shadow-xl scale-[1.02]' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${selectedWorkspace?.id === ws.id ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{ws.nome.charAt(0)}</div>
                            <div><h4 className="font-bold text-sm truncate">{ws.nome}</h4><span className="text-[10px] opacity-60">Kiwify Connected</span></div>
                        </div>
                        <button onClick={(e) => deleteWorkspace(ws.id, e)} className="p-1.5 opacity-40 hover:opacity-100 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                    </div>
                </div>
            ))}
      </div>

      {selectedWorkspace ? (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 px-4 md:px-0">
           {loadingCourses ? (
             <div className="py-32 flex flex-col items-center justify-center text-center">
                <Loader2 className="animate-spin text-brand-600 mb-4" size={40} />
                <p className="text-gray-900 font-bold">Listando seu catálogo de cursos...</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {courses.map(course => {
                  const migration = migrations.find(m => m.courseId === course.id);
                  const isCompleted = migration?.status === 'completed';
                  const isDownloading = migration?.status === 'processing' || migration?.status === 'pending' || migration?.status === 'preparing';
                  const progress = migration?.progress || 0;
                  const coverUrl = getSafeCoverUrl(course, migration);

                  return (
                    <div key={course.id} className="group relative bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                      <div className="aspect-video relative bg-gray-100 overflow-hidden">
                         <img src={coverUrl} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                            <button onClick={() => handleCourseAction(course)} className="bg-white text-black p-4 rounded-full shadow-2xl transform scale-75 group-hover:scale-100 transition-all hover:bg-brand-500 hover:text-white border-2 border-transparent hover:border-white/20">
                                {isCompleted ? <PlayCircle size={32} /> : isDownloading ? <Layers size={32} /> : <Download size={32} />}
                            </button>
                         </div>
                         {isDownloading && (
                             <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-white text-center cursor-pointer group/loader" onClick={() => handleCourseAction(course)}>
                                 <div className="relative mb-3">
                                    <div className="absolute inset-0 bg-brand-500 blur-xl opacity-20 animate-pulse"></div>
                                    <Loader2 size={32} className="animate-spin text-brand-500 relative z-10" />
                                 </div>
                                 <span className="text-3xl font-black mb-1 tracking-tight">{progress}%</span>
                                 <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 group-hover/loader:text-brand-400 transition-colors">Ver Detalhes</span>
                             </div>
                         )}
                      </div>
                      <div className="p-5 flex flex-col">
                         <h3 className="font-bold text-gray-900 line-clamp-2 mb-4 h-10 leading-tight group-hover:text-brand-700 transition-colors">{course.name}</h3>
                         <button onClick={() => handleCourseAction(course)} className={`w-full py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm ${isCompleted ? 'bg-[#111827] text-white hover:bg-black hover:shadow-lg' : isDownloading ? 'bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100' : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-500 hover:text-brand-600'}`}>
                            {isCompleted ? 'Assistir Agora' : isDownloading ? 'Ver Progresso' : 'Sincronizar'}
                         </button>
                      </div>
                      {isDownloading && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-500 shadow-[0_0_10px_rgba(22,163,74,0.5)]" style={{ width: `${progress}%` }}></div></div>}
                    </div>
                  );
                })}
             </div>
           )}
        </div>
      ) : (
        <div className="py-24 text-center text-gray-300 flex flex-col items-center"><Layers size={64} className="mb-4 stroke-[1.5]" /><h3 className="text-xl font-bold">Selecione uma conta para começar</h3></div>
      )}

      {/* Modal de Nova Conexão */}
      {isCreating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200 relative border border-gray-100">
                <button onClick={() => setIsCreating(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black"><X size={24} /></button>
                <h2 className="text-2xl font-black text-[#111827] mb-2">Conectar Kiwify</h2>
                <p className="text-gray-500 text-sm mb-6">Insira os dados da conta de origem para iniciar a migração.</p>
                
                <form onSubmit={createWorkspace} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                            <User size={12}/> Nome da Conta (Identificação)
                        </label>
                        <input type="text" value={newWsName} onChange={e => setNewWsName(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all" required placeholder="Ex: Conta Principal" />
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                            <Mail size={12}/> Email da Conta de Origem
                        </label>
                        <input type="email" value={newWsEmail} onChange={e => setNewWsEmail(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all" required placeholder="email@origem.com" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Token Kiwify</label>
                        <input type="password" value={newWsToken} onChange={e => setNewWsToken(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-mono focus:ring-2 focus:ring-brand-500 transition-all" required placeholder="Cole o token gerado pela extensão" />
                    </div>
                    
                    <button type="submit" disabled={isSubmittingWs} className="w-full py-4 bg-[#111827] text-white rounded-xl font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 mt-4 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform">{isSubmittingWs ? <Loader2 className="animate-spin" size={20} /> : 'Salvar Conexão'}</button>
                </form>
            </div>
        </div>
      )}

      {/* Modal de Detalhes da Migração */}
      {detailedMigration && (
          <MigrationStatusModal 
              course={detailedMigration.course} 
              migration={detailedMigration.migration} 
              onClose={() => setDetailedMigration(null)}
              getSafeUrl={getSafeCoverUrl}
          />
      )}
    </div>
  );
};