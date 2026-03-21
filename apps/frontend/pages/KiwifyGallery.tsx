
import React, { useState, useEffect, useMemo } from 'react';
import { PlayCircle, ArrowLeft, Loader2, RefreshCw, FileWarning, Zap, Search, ChevronDown, ChevronRight, MonitorPlay, Play, CheckCircle2, Video, User, Link as LinkIcon } from 'lucide-react';
import { LocalCourse, Module, Lesson, Workspace, Lead } from '../types';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { bridgeApi } from '../services/bridgeApi';
import { Avatar } from '../components/Avatar';

export const KiwifyGallery: React.FC = () => {
  const { currentUser } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWsId, setSelectedWsId] = useState<string>('all');
  const [courses, setCourses] = useState<LocalCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<LocalCourse | null>(null);
  const [activeCourseModules, setActiveCourseModules] = useState<Module[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<{ lesson: Lesson, module: Module, lessonIndex: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializingCourse, setInitializingCourse] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); 
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  
  // Dados do Creator vinculado ao curso selecionado
  const [linkedCreator, setLinkedCreator] = useState<Lead | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    return db.collection("workspaces").where("ownerId", "==", currentUser.id).onSnapshot((snapshot) => {
      setWorkspaces(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Workspace[]);
    });
  }, [currentUser]);

  useEffect(() => {
    const loadMetadata = async () => {
        setLoading(true);
        try {
            const metadata = await bridgeApi.getGalleryMetadata(selectedWsId);
            setCourses(metadata);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    loadMetadata();
  }, [selectedWsId]);

  useEffect(() => {
      if (!selectedCourse) { 
          setActiveCourseModules([]); 
          setLinkedCreator(null);
          return; 
      }
      
      // Busca dados do Lead se houver vínculo
      // @ts-ignore - Propriedade extra vinda da bridgeApi
      if (selectedCourse.leadId) {
          // @ts-ignore
          db.collection('leads').doc(selectedCourse.leadId).get().then(doc => {
              if (doc.exists) {
                  setLinkedCreator({ id: doc.id, ...doc.data() } as Lead);
              }
          });
      }

      setInitializingCourse(true);
      const docId = selectedCourse.workspaceId ? `${selectedCourse.workspaceId}_${selectedCourse.course.id}` : selectedCourse.course.id;
      
      const unsubscribe = bridgeApi.subscribeToCourseLessons(docId, (lessons) => {
          if (!lessons || lessons.length === 0) {
              setInitializingCourse(false);
              return;
          }

          const modulesMap = new Map<string, Module>();
          lessons.forEach(lesson => {
              const modName = lesson.module_name || 'Geral';
              const modIndex = lesson.moduleIndex ?? 0;
              const modKey = `mod_${modIndex}_${modName}`;
              
              if (!modulesMap.has(modKey)) {
                  modulesMap.set(modKey, { 
                      id: modKey, 
                      name: modName, 
                      order: modIndex, 
                      lessons: [] 
                  });
              }
              modulesMap.get(modKey)!.lessons.push(lesson);
          });
          
          const sortedModules = Array.from(modulesMap.values()).sort((a,b) => a.order - b.order);
          // Ordenar lições dentro de cada módulo
          sortedModules.forEach(m => m.lessons.sort((a,b) => (a.lessonIndex ?? 0) - (b.lessonIndex ?? 0)));
          
          setActiveCourseModules(sortedModules);
          setInitializingCourse(false);
          if (sortedModules.length > 0 && expandedModules.size === 0) setExpandedModules(new Set([sortedModules[0].id]));
      });
      return () => unsubscribe();
  }, [selectedCourse?.course.id]);

  const handleOpenCourse = (course: LocalCourse) => {
      setSelectedCourse(course);
      setSelectedLesson(null);
      setSearchQuery('');
      setExpandedModules(new Set());
  };

  const filteredModules = useMemo(() => {
    if (!activeCourseModules) return [];
    if (!searchQuery) return activeCourseModules;
    const lowerQuery = searchQuery.toLowerCase();
    return activeCourseModules.map(mod => ({
            ...mod,
            lessons: mod.lessons.filter(l => l.title.toLowerCase().includes(lowerQuery))
        })).filter(mod => mod.lessons.length > 0 || mod.name.toLowerCase().includes(lowerQuery));
  }, [activeCourseModules, searchQuery]);

  const getSafeCoverUrl = (url?: string) => {
    if (!url) return '';
    if (url.includes('firebasestorage')) return url;
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
  };

  const renderPlayerContent = () => {
    if (!selectedLesson) return (
      <div className="text-white/20 flex flex-col items-center">
        <MonitorPlay size={100} className="mb-6 stroke-[0.5]" />
        <p className="font-bold uppercase tracking-[0.3em] text-xs">Selecione uma aula</p>
      </div>
    );
    
    const { lesson } = selectedLesson;
    const streamUrl = lesson.video?.streamUrl;

    if (lesson.processingStatus === 'error') return (
      <div className="text-red-400 text-center space-y-4">
        <FileWarning size={48} className="mx-auto" />
        <h3 className="text-lg font-bold">Erro de Processamento</h3>
      </div>
    );

    if (lesson.processingStatus === 'pending' || lesson.processingStatus === 'processing') return (
      <div className="text-white text-center space-y-8">
        <RefreshCw size={56} className="animate-spin text-brand-500 mx-auto" />
        <h3 className="text-2xl font-bold">Otimizando Stream...</h3>
      </div>
    );

    if (!streamUrl) return <div className="text-gray-500 font-bold">Aguardando Link Seguro...</div>;

    const posterUrl = getSafeCoverUrl(selectedCourse?.course.config.premium_members_area.cover_image_desktop);

    return (
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        <video 
          key={lesson.id} 
          controls 
          autoPlay 
          playsInline
          className="w-full h-full object-contain focus:outline-none"
          poster={posterUrl}
        >
          <source src={streamUrl} type="video/mp4" />
        </video>
      </div>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      {selectedCourse ? (
        <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col">
          <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/50 backdrop-blur-md z-20">
            <div className="flex items-center gap-4">
                <button onClick={() => { setSelectedCourse(null); setSelectedLesson(null); }} className="flex items-center text-gray-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-all">
                  <ArrowLeft className="mr-2" size={16} /> Voltar para Galeria
                </button>
                <div className="h-4 w-px bg-white/10"></div>
                <h1 className="text-white font-bold text-sm truncate max-w-md">{selectedCourse.course.name}</h1>
                
                {/* Vínculo com Creator */}
                {linkedCreator && (
                    <div className="hidden md:flex items-center gap-3 px-3 py-1 bg-white/5 border border-white/10 rounded-full ml-4">
                        <Avatar src={linkedCreator.foto_url} name={linkedCreator.nome_display} alt="" className="w-5 h-5 rounded-full border border-white/20"/>
                        <span className="text-[10px] text-gray-300 font-bold uppercase">{linkedCreator.nome_display}</span>
                        <button 
                            onClick={() => window.location.hash = '#/onboarding'}
                            className="text-[10px] bg-brand-600 hover:bg-brand-500 text-white px-2 py-0.5 rounded font-bold flex items-center gap-1 transition-colors"
                        >
                            Ver no Pipeline <LinkIcon size={10}/>
                        </button>
                    </div>
                )}
            </div>
            <div className="hidden md:flex items-center px-3 py-1.5 bg-brand-900/30 text-brand-400 rounded-full border border-brand-500/20 text-[10px] font-bold uppercase tracking-wide">
                <Zap size={12} className="mr-1.5 fill-current" /> B4You Hub Stream v7.0
            </div>
          </div>
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 bg-black flex items-center justify-center relative">
              {renderPlayerContent()}
            </div>
            <div className="w-[400px] bg-white border-l border-gray-200 flex flex-col hidden lg:flex">
               <div className="p-5 border-b border-gray-100 bg-gray-50/80 space-y-4">
                 <h3 className="font-black text-gray-900 text-sm uppercase tracking-wide">Conteúdo do Curso</h3>
                 <div className="relative">
                     <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                     <input type="text" placeholder="Buscar aula..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20" />
                 </div>
               </div>
               <div className="flex-1 overflow-y-auto p-3 space-y-2">
                 {filteredModules.map(module => (
                   <div key={module.id} className="bg-white rounded-xl border border-transparent overflow-hidden">
                     <button onClick={() => setExpandedModules(prev => { const n = new Set(prev); if(n.has(module.id)) n.delete(module.id); else n.add(module.id); return n; })} className="w-full flex items-center justify-between p-3.5 text-left hover:bg-gray-50 rounded-xl transition-colors">
                       <span className="text-xs font-bold uppercase tracking-wide truncate">{module.name}</span>
                       {expandedModules.has(module.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                     </button>
                     {expandedModules.has(module.id) && (
                       <div className="pl-3 pr-1 pb-2 pt-1 space-y-1">
                         {module.lessons.map((lesson, idx) => {
                           const isSelected = selectedLesson?.lesson.id === lesson.id;
                           return (
                             <button key={lesson.id} onClick={() => setSelectedLesson({ lesson, module, lessonIndex: idx })} className={`w-full text-left p-2.5 rounded-lg flex items-center border-l-2 transition-all ${isSelected ? 'bg-gray-900 text-white border-brand-500 shadow-md' : 'text-gray-600 border-transparent hover:bg-gray-50'}`}>
                               <PlayCircle size={16} className={`mr-3 ${isSelected ? 'text-brand-500' : 'text-gray-300'}`} />
                               <span className="text-xs font-medium truncate">{lesson.title}</span>
                               {lesson.processingStatus === 'completed' && <CheckCircle2 size={12} className="ml-auto text-green-500" />}
                             </button>
                           );
                         })}
                       </div>
                     )}
                   </div>
                 ))}
                 {activeCourseModules.length === 0 && !initializingCourse && (
                    <div className="p-8 text-center text-gray-400">
                        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                        <p className="text-xs font-bold">Sincronizando estrutura...</p>
                    </div>
                 )}
               </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-gray-100 pb-6 px-4 md:px-0">
            <div>
              <div className="flex items-center space-x-2 text-brand-600 mb-2"><PlayCircle size={20} className="fill-brand-100" /><span className="text-xs font-black uppercase tracking-widest">B4You Hub Play</span></div>
              <h1 className="text-4xl font-black text-[#111827] tracking-tight">BIBLIOTECA SEGURA</h1>
            </div>
            <div className="flex bg-gray-100/50 p-1.5 rounded-xl">
              <button onClick={() => setSelectedWsId('all')} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${selectedWsId === 'all' ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}>Todos</button>
              {workspaces.map(ws => <button key={ws.id} onClick={() => setSelectedWsId(ws.id)} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${selectedWsId === ws.id ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}>{ws.nome}</button>)}
            </div>
          </div>
          {loading ? (
            <div className="py-40 flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-brand-600 mb-4" size={40} />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Carregando Acervo...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10 px-4 md:px-0">
              {courses.map((item) => (
                <div key={item.course.id} onClick={() => handleOpenCourse(item)} className="group cursor-pointer flex flex-col gap-3">
                  <div className="aspect-video bg-gray-900 rounded-2xl relative overflow-hidden shadow-lg group-hover:shadow-2xl transition-all group-hover:-translate-y-2">
                    <img src={getSafeCoverUrl(item.course.config.premium_members_area.cover_image_desktop)} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-500" />
                    
                    {/* Badge Creator (Thumbnail) */}
                    {/* @ts-ignore */}
                    {item.leadId && (
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full border border-white/20 flex items-center gap-1.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                            <User size={10} className="text-white"/>
                            <span className="text-[9px] font-bold text-white uppercase tracking-wide">Creator</span>
                        </div>
                    )}

                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center border border-white/40"><Play size={24} className="text-white fill-white ml-1" /></div>
                    </div>
                  </div>
                  <h3 className="font-bold text-[#111827] text-base group-hover:text-brand-600 transition-colors leading-tight">{item.course.name}</h3>
                </div>
              ))}
              {courses.length === 0 && (
                <div className="col-span-full py-32 flex flex-col items-center justify-center text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                    <Video size={32} className="text-gray-300 mb-4" />
                    <h3 className="text-xl font-bold text-gray-900">Sua biblioteca está vazia</h3>
                    <p className="text-gray-500 text-sm mt-1">Conecte um workspace e migre seus cursos na aba anterior.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
