
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Save, Clock, CheckCircle2, 
    AlertCircle, PauseCircle, Loader2, Link2, 
    StickyNote, Activity, History, DownloadCloud, 
    FileText, ArrowUpRight, DollarSign, Send, 
    MessageSquare, Briefcase, Calendar, Shield, MoreHorizontal,
    ArrowRight, CheckSquare, Plus, Paperclip, ChevronRight, Check, Trash2,
    AlertTriangle, Smartphone, Zap, CheckCircle, UserPlus, User, Instagram, ChevronDown,
    ExternalLink, ListTodo, CalendarDays, ChevronLeft, Sparkles, RefreshCw, Edit2
} from 'lucide-react';
import { db, auth, fieldValue } from '../../firebase';

import { NotificationService } from '../../services/systemServices';
import { Lead, Producer, Usuario, WorkTask, TimelineEvent, TrackingStatus, TaskStatus, EvolutionChat, ProducerStage } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useMedia } from '../../hooks/useMedia';
import { Avatar } from '../Avatar';
import { useAuth } from '../../AuthContext';
import { SmartTaskCard } from '../Task/SmartTaskCard';
import { MentionsInput, Mention } from 'react-mentions';

// --- SUB-COMPONENT: MINI CALENDAR ---
const MiniCalendar = ({ selectedDate, onChange, onClose }: { selectedDate: string, onChange: (date: string) => void, onClose: () => void }) => {
    const [viewDate, setViewDate] = useState(selectedDate ? new Date(selectedDate) : new Date());
    
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay, year, month };
    };

    const { days, firstDay, year, month } = getDaysInMonth(viewDate);

    const handleDateClick = (day: number) => {
        const d = new Date(year, month, day);
        const isoDate = d.toLocaleDateString('en-CA');
        onChange(isoDate);
        onClose();
    };

    const changeMonth = (delta: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setViewDate(newDate);
    };

    return (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 w-72 animate-in fade-in zoom-in-95 origin-top-right ring-1 ring-black/5">
            <div className="flex items-center justify-between mb-4 px-1">
                <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><ChevronLeft size={16}/></button>
                <span className="text-sm font-bold text-gray-800 capitalize">{monthNames[month]} {year}</span>
                <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><ChevronRight size={16}/></button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((d, i) => (
                    <div key={i} className="text-[10px] font-bold text-gray-400 text-center uppercase">{d}</div>
                ))}
                {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: days }).map((_, i) => {
                    const day = i + 1;
                    const currentDateStr = new Date(year, month, day).toLocaleDateString('en-CA');
                    const isSelected = selectedDate === currentDateStr;
                    const isToday = new Date().toLocaleDateString('en-CA') === currentDateStr;

                    return (
                        <button 
                            key={day} 
                            onClick={() => handleDateClick(day)}
                            className={`
                                h-8 w-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all
                                ${isSelected ? 'bg-gray-900 text-white shadow-md' : isToday ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-700 hover:bg-gray-100'}
                            `}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// --- CONFIGURAÇÕES VISUAIS ---

const TRACKING_STATUS_CONFIG: Record<string, { label: string, color: string, bg: string, border: string, icon: any }> = {
    'PRECISA_CONTATO': { label: 'Precisa Contato', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: AlertTriangle },
    'EM_ANDAMENTO': { label: 'Em Andamento', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: Smartphone },
    'AGUARDANDO_RETORNO': { label: 'Aguardando', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: Clock },
    'EM_SUPORTE': { label: 'Suporte', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', icon: Briefcase },
    'ACAO_ESTRATEGICA': { label: 'Estratégico', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: Zap },
    'null': { label: 'Sem Status', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', icon: CheckCircle } 
};

// Helper para data segura
const safeDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
        if (typeof timestamp === 'number') return new Date(timestamp).toLocaleDateString();
        if (timestamp.toDate) return timestamp.toDate().toLocaleDateString(); 
        if (typeof timestamp === 'string') return new Date(timestamp).toLocaleDateString();
        return '';
    } catch (e) {
        return '';
    }
};

interface CRMPanelProps {
  lead: Lead | null;
  chat?: EvolutionChat | null;
  onUpdateStage: (stage: ProducerStage) => void;
  onAddTask?: (task: { title: string; dueDate: string; priority: string }) => void;
  onLinkChat?: (leadId: string) => void;
  onClose?: () => void;
  className?: string;
}

const STAGES: ProducerStage[] = ['AQUISICAO', 'ONBOARDING', 'GROWTH', 'RISCO'];

export const CRMPanel: React.FC<CRMPanelProps> = ({ lead, chat, onUpdateStage, onLinkChat, onClose, className = "" }) => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const { uploadFile, isUploading } = useMedia();
  
  const [activeTab, setActiveTab] = useState<'timeline' | 'playbook' | 'files'>('timeline');
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  
  // Task States
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'LOW'|'MEDIUM'|'HIGH'>('MEDIUM');
  
  // Date Picker State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  
  // State para Criação de Lead
  const [isCreating, setIsCreating] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Usuario[]>([]);
  const [isManagerListOpen, setIsManagerListOpen] = useState(false);
  
  const [newLeadData, setNewLeadData] = useState({
      name: '', phone: '', email: '', instagram: '',
      produto: '', plataforma: 'Kiwify', mrr: '', cnpj: '',
      gerente_conta: currentUser?.uid || ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);
  const trackingMenuRef = useRef<HTMLDivElement>(null);

  const targetCollection = lead?.convertedToProducerId ? 'producers' : 'leads';
  const targetId = lead?.convertedToProducerId || lead?.id;

  // Helper: Log Timeline Event
  const logTimelineEvent = async (type: 'TASK_UPDATE' | 'SYSTEM_LOG' | 'NOTE' | 'STAGE_CHANGE', category: 'TASK' | 'SYSTEM' | 'NOTE', content: string, metadata?: any) => {
      if (!targetId) return;
      try {
          await db.collection(targetCollection).doc(targetId).collection('timeline').add({
              type,
              content,
              timestamp: Date.now(),
              authorName: currentUser?.nome || 'Sistema',
              authorId: currentUser?.uid || 'SYSTEM',
              category,
              metadata: metadata || {}
          });
      } catch (e) {
          console.error("Erro ao logar na timeline:", e);
      }
  };

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (trackingMenuRef.current && !trackingMenuRef.current.contains(event.target as Node)) {
              setIsTrackingOpen(false);
          }
          if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
              setIsDatePickerOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Atualiza Tracking Status
  const handleTrackingChange = async (newStatus: TrackingStatus) => {
      if (targetCollection !== 'producers' || !targetId) return;
      
      const statusKey = newStatus || 'null';
      const config = TRACKING_STATUS_CONFIG[statusKey];
      
      try {
          await db.collection('producers').doc(targetId).update({
              tracking_status: newStatus,
              updatedAt: fieldValue.serverTimestamp()
          });
          
          await logTimelineEvent('SYSTEM_LOG', 'SYSTEM', `Status de acompanhamento alterado para: ${config.label}`);

          addToast({ type: 'success', message: `Status alterado para ${config.label}` });
          setIsTrackingOpen(false);
      } catch (error) {
          console.error(error);
          addToast({ type: 'error', message: 'Erro ao atualizar status.' });
      }
  };

  // Carrega Usuários (Equipe)
  useEffect(() => {
      let hasError = false;
      const unsub = db.collection('users').onSnapshot(
          (snap) => {
              setTeamMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Usuario)));
          },
          (error) => {
              console.error("Erro ao carregar membros da equipe:", error);
              hasError = true;
          }
      );
      return () => {
          if (!hasError) {
              try { unsub(); } catch (e) { console.error(e); }
          }
      };
  }, []);

  // Inicializa dados de Criação
  useEffect(() => {
      if (!lead && chat) {
          setNewLeadData(prev => ({
              ...prev,
              name: chat.pushName || '',
              phone: chat.id.replace('@s.whatsapp.net', '').replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2'),
              gerente_conta: currentUser?.uid || ''
          }));
      }
  }, [chat, lead, currentUser]);

  // Handlers de Formatação
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15);
      setNewLeadData({ ...newLeadData, phone: val });
  };

  const handleMrrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/\D/g, '');
      const currency = (Number(val) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      setNewLeadData({ ...newLeadData, mrr: currency });
  };

  // Listener Unificado de Dados
  useEffect(() => {
      if (!targetId) return;

      // 1. Timeline
      const unsubTimeline = db.collection(targetCollection).doc(targetId).collection('timeline')
          .orderBy('timestamp', 'desc')
          .limit(50)
          .onSnapshot(snapshot => {
              setTimelineEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimelineEvent)));
          });

      // 2. Tasks
      const ids = [targetId, lead?.id].filter(Boolean);
      let unsubTasks = () => {};
      if (ids.length > 0) {
          unsubTasks = db.collection('tasks')
              .where('leadId', 'in', ids)
              .orderBy('createdAt', 'desc')
              .onSnapshot(snapshot => {
                  const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkTask));
                  const uniqueTasks = Array.from(new Map(tasksData.map(item => [item.id, item])).values()) as WorkTask[];
                  setTasks(uniqueTasks);
              });
      } else {
          setTasks([]);
      }

      // 3. Files
      const unsubFiles = db.collection(targetCollection).doc(targetId).collection('files')
          .orderBy('createdAt', 'desc')
          .onSnapshot(snapshot => {
              setFiles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
          });

      return () => {
          unsubTimeline();
          unsubTasks();
          unsubFiles();
      };
  }, [targetId, targetCollection, lead]);

  const groupedTimeline = useMemo(() => {
      let events: any[] = [];

      if ((lead as any)?.createdAt) {
          events.push({
              id: 'creation',
              type: 'CLIENT_CREATED',
              timestamp: (lead as any).createdAt,
              content: 'Cliente cadastrado na plataforma.',
              authorName: 'Sistema',
              icon: UserPlus,
              category: 'SYSTEM'
          });
      }

      // Merge Real Timeline with Synthetic Task Events (Fallback)
      timelineEvents.forEach(e => {
          let category = e.category || 'SYSTEM';
          if (e.type === 'NOTE') category = 'NOTE';
          if (e.type === 'TASK_UPDATE') category = 'TASK';
          
          events.push({
              ...e,
              icon: e.type === 'NOTE' ? StickyNote : e.category === 'TASK' ? CheckSquare : e.type === 'STAGE_CHANGE' ? Activity : History,
              category
          });
      });

      // Add Synthetic Task Creation (Only if no real log exists to avoid dups - simple check by ID not fully implemented, allowing visual mix for now as real logs are preferred)
      // We will skip synthetic creation events if we start using real logs, but keep for older tasks
      tasks.forEach(t => {
          // Check if we have a real log for this task creation
          const hasRealLog = timelineEvents.some(e => e.metadata?.taskId === t.id && e.metadata?.action === 'CREATE');
          
          if (!hasRealLog) {
              events.push({
                  id: `task_create_${t.id}`,
                  type: 'TASK_LINKED',
                  timestamp: t.createdAt,
                  content: `Tarefa vinculada: "${t.title}"`,
                  authorName: 'Work OS',
                  metadata: { taskId: t.id, status: 'PENDING' },
                  icon: Link2,
                  category: 'TASK'
              });
          }
      });

      const sortedEvents = events.sort((a, b) => {
          const timeA = a.timestamp?.toMillis?.() || (typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime() || 0);
          const timeB = b.timestamp?.toMillis?.() || (typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime() || 0);
          return timeB - timeA;
      });

      const groups: Record<string, any[]> = {};
      sortedEvents.forEach(event => {
          const date = new Date(event.timestamp);
          if (isNaN(date.getTime())) return;
          
          const today = new Date();
          const yesterday = new Date();
          yesterday.setDate(today.getDate() - 1);

          let groupKey = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
          if (date.toDateString() === today.toDateString()) groupKey = 'Hoje';
          else if (date.toDateString() === yesterday.toDateString()) groupKey = 'Ontem';

          if (!groups[groupKey]) groups[groupKey] = [];
          groups[groupKey].push(event);
      });

      return groups;
  }, [timelineEvents, tasks, lead]);

  const handleCreateLead = async () => {
      // ... Logic kept same as previous code ...
      // Assuming previous implementation for brevity
      if (!currentUser || !chat) return;
      if (!newLeadData.name) { addToast({ type: 'error', message: 'Nome é obrigatório' }); return; }
      setIsCreating(true);
      try {
          const leadId = `lead_${Date.now()}`;
          const photoUrl = chat.profilePicUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(newLeadData.name)}&background=random`;
          const cleanPhone = newLeadData.phone.replace(/\D/g, '');
          const formattedPhone = cleanPhone.length < 12 ? `55${cleanPhone}` : cleanPhone;

          const newLeadPayload: Partial<Lead> = {
              id: leadId,
              ownerId: currentUser.uid,
              nome_display: newLeadData.name.trim(),
              instagram_username: newLeadData.instagram.replace('@', '').trim() || '',
              foto_url: photoUrl,
              status: 'NOVO', 
              tags: ['Manual', 'WhatsApp', newLeadData.plataforma],
              responsavelId: newLeadData.gerente_conta,
              cnpj: newLeadData.cnpj,
              dados_contato: {
                  whatsapp: formattedPhone,
                  email: newLeadData.email.trim(),
                  instagram: newLeadData.instagram.replace('@', '').trim()
              },
              analise_ia_json: {
                  resumo: 'Lead cadastrado manualmente via Inbox.',
                  pontos_fortes: [],
                  sinais_monetizacao: !!newLeadData.mrr,
                  plataforma_detectada: newLeadData.plataforma as any,
                  produto_detectado: {
                      tipo: 'Curso',
                      nome: newLeadData.produto || 'Produto Principal',
                      preco: newLeadData.mrr,
                      plataforma: newLeadData.plataforma
                  }
              },
              // @ts-ignore
              createdAt: fieldValue.serverTimestamp()
          };

          await db.collection('leads').doc(leadId).set(newLeadPayload);
          addToast({ type: 'success', message: 'Lead cadastrado com sucesso!' });
          if(onLinkChat) onLinkChat(leadId);
      } catch (error) {
          console.error("Erro lead:", error);
          addToast({ type: 'error', message: 'Erro ao salvar.' });
      } finally {
          setIsCreating(false);
      }
  };

  const handleStageChangeInternal = async (stage: ProducerStage) => {
      onUpdateStage(stage);
      await logTimelineEvent('STAGE_CHANGE', 'SYSTEM', `Fase alterada para ${stage}`);
  };

  const handleSaveNote = async () => {
      if (!noteContent.trim() || !targetId) return;
      setIsSavingNote(true);
      try {
          // Extract mentions from react-mentions format: @[display](id)
          const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
          const mentions: string[] = [];
          let match;
          while ((match = mentionRegex.exec(noteContent)) !== null) {
              mentions.push(match[2]);
          }

          // Clean content for storage (optional, but good to keep the format for rendering)
          // We'll keep the format @[display](id) in the database to allow easy highlighting on render
          
          await logTimelineEvent('NOTE', 'NOTE', noteContent, { 
              isInternal: true,
              mentions: mentions 
          });

          // Trigger notifications
          if (mentions.length > 0) {
              const leadName = lead?.nome_display || 'um cliente';
              const authorName = currentUser?.nome || 'Um colega';
              
              const notificationPromises = mentions.map(userId => {
                  if (userId === currentUser?.uid) return Promise.resolve(); // Don't notify self
                  
                  return NotificationService.notifyUser(userId, {
                      title: 'Menção em Nota',
                      body: `${authorName} mencionou você em uma nota sobre ${leadName}.`,
                      type: 'MENTION',
                      link: `#/crm/${targetId}`, // Assuming this is the link format
                      priority: 'NORMAL'
                  });
              });
              await Promise.all(notificationPromises);
          }

          setNoteContent('');
          addToast({ type: 'success', message: 'Nota salva!' });
      } catch (error) {
          console.error(error);
          addToast({ type: 'error', message: 'Erro ao salvar nota.' });
      } finally {
          setIsSavingNote(false);
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && targetId) {
          const file = e.target.files[0];
          try {
              const url = await uploadFile(file, `attachments/${targetId}/${Date.now()}_${file.name}`);
              await db.collection(targetCollection).doc(targetId).collection('files').add({
                  name: file.name,
                  url,
                  size: (file.size / 1024).toFixed(2) + ' KB',
                  createdAt: new Date().toISOString(),
                  type: file.type
              });
              addToast({type: 'success', message: 'Arquivo enviado'});
          } catch(err) {
              console.error(err);
              addToast({type: 'error', message: 'Erro no upload'});
          }
      }
  };

  // --- TASK MANAGEMENT (REFACTORED WITH LOGGING) ---

  const handleCreateTask = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!newTaskTitle.trim()) {
          addToast({ type: 'error', message: 'Título obrigatório' });
          return;
      }
      try {
          const taskRef = db.collection('tasks').doc();
          await taskRef.set({
              id: taskRef.id,
              title: newTaskTitle,
              description: `Tarefa criada no painel de ${lead?.nome_display || 'Cliente'}`,
              dueDate: newTaskDate || new Date().toLocaleDateString('en-CA'),
              priority: newTaskPriority,
              status: 'PENDING',
              type: 'MANUAL',
              leadId: targetId,
              userId: currentUser?.id,
              assignedTo: [currentUser?.id],
              creatorName: currentUser?.nome,
              createdAt: fieldValue.serverTimestamp(),
              updatedAt: fieldValue.serverTimestamp()
          });
          
          await logTimelineEvent('TASK_UPDATE', 'TASK', `Nova tarefa criada: "${newTaskTitle}"`, { taskId: taskRef.id, action: 'CREATE' });

          setNewTaskTitle('');
          setNewTaskDate('');
          addToast({ type: 'success', message: 'Tarefa adicionada' });
      } catch (error) {
          console.error(error);
          addToast({ type: 'error', message: 'Erro ao criar tarefa' });
      }
  };

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
      try {
          await db.collection('tasks').doc(taskId).update({
              status: newStatus,
              updatedAt: fieldValue.serverTimestamp()
          });
          
          const taskTitle = tasks.find(t => t.id === taskId)?.title || 'Tarefa';
          let label = 'atualizada';
          if (newStatus === 'COMPLETED') label = 'concluída';
          if (newStatus === 'IN_PROGRESS') label = 'iniciada';
          
          await logTimelineEvent('TASK_UPDATE', 'TASK', `Tarefa "${taskTitle}" ${label}.`, { taskId, action: 'STATUS_CHANGE', newValue: newStatus });

      } catch (error) {
          console.error(error);
          addToast({ type: 'error', message: 'Erro ao atualizar status' });
      }
  };

  const handleUpdateTaskTitle = async (taskId: string, title: string) => {
      try {
          await db.collection('tasks').doc(taskId).update({
              title,
              updatedAt: fieldValue.serverTimestamp()
          });
      } catch (error) {
          addToast({ type: 'error', message: 'Erro ao atualizar título.' });
      }
  };

  const handleUpdateTaskDate = async (taskId: string, date: string) => {
      try {
          await db.collection('tasks').doc(taskId).update({
              dueDate: date,
              updatedAt: fieldValue.serverTimestamp()
          });
          const taskTitle = tasks.find(t => t.id === taskId)?.title || 'Tarefa';
          await logTimelineEvent('TASK_UPDATE', 'TASK', `Prazo da tarefa "${taskTitle}" alterado para ${new Date(date).toLocaleDateString()}`, { taskId, action: 'UPDATE', newValue: date });
      } catch (error) {
          addToast({ type: 'error', message: 'Erro ao atualizar data.' });
      }
  };

  const handleUpdateTaskAssignee = async (taskId: string, userIds: string[]) => {
      try {
          await db.collection('tasks').doc(taskId).update({
              assignedTo: userIds,
              updatedAt: fieldValue.serverTimestamp()
          });
          
          const taskTitle = tasks.find(t => t.id === taskId)?.title || 'Tarefa';
          const assigneeName = teamMembers.find(u => u.id === userIds[0])?.nome || 'Desconhecido';
          await logTimelineEvent('TASK_UPDATE', 'TASK', `Tarefa "${taskTitle}" atribuída a ${assigneeName}`, { taskId, action: 'UPDATE', newValue: userIds });

          addToast({ type: 'success', message: 'Responsável atualizado.' });
      } catch (error) {
          addToast({ type: 'error', message: 'Erro ao atualizar responsável.' });
      }
  };

  const handleDeleteTask = async (taskId: string) => {
      if (!confirm('Excluir esta tarefa permanentemente?')) return;
      const taskTitle = tasks.find(t => t.id === taskId)?.title || 'Tarefa';
      try {
          await db.collection('tasks').doc(taskId).delete();
          await logTimelineEvent('TASK_UPDATE', 'TASK', `Tarefa "${taskTitle}" excluída.`, { taskId, action: 'DELETE' });
      } catch (error) {
          console.error(error);
      }
  };

  // Render Functions
  if (!lead && !chat) return <div className={`w-full flex flex-col items-center justify-center text-gray-300 bg-[#FAFAFA] border-l ${className}`}><User size={48} className="mb-2 opacity-50"/><p className="text-sm font-bold">Selecione uma conversa</p></div>;

  if (!lead && chat) {
      // ... Render logic for creating new lead (unchanged) ...
      const selectedManager = teamMembers.find(m => m.id === newLeadData.gerente_conta);
      return (
        <div className={`w-full h-full flex flex-col bg-[#FAFAFA] font-sans ${className}`}>
            <div className="px-6 py-5 border-b border-gray-200 bg-white flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <div><h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2"><UserPlus size={20} className="text-brand-600"/> Novo Cadastro</h2><p className="text-xs text-gray-500 font-medium mt-0.5">Vincular este chat a um novo lead</p></div>
                {onClose && <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X size={18}/></button>}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-gray-200"><User size={14} className="text-brand-500"/> Dados Pessoais</h3>
                    <input type="text" value={newLeadData.name} onChange={e => setNewLeadData({...newLeadData, name: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm" placeholder="Nome Completo" />
                    <input type="tel" value={newLeadData.phone} onChange={handlePhoneChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm" placeholder="WhatsApp" />
                </div>
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-gray-200"><Briefcase size={14} className="text-brand-500"/> Dados do Negócio</h3>
                    <input type="text" value={newLeadData.produto} onChange={e => setNewLeadData({...newLeadData, produto: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm" placeholder="Produto" />
                </div>
            </div>
            <div className="p-6 border-t border-gray-200 bg-white sticky bottom-0 z-10">
                <button onClick={handleCreateLead} disabled={isCreating} className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70">
                    {isCreating ? <Loader2 size={20} className="animate-spin"/> : <CheckCircle2 size={20} />} 
                    {isCreating ? 'Salvando...' : 'Cadastrar e Vincular'}
                </button>
            </div>
        </div>
      );
  }

  const trackingStatus = (lead as any).tracking_status as TrackingStatus || null;
  const statusKey = trackingStatus || 'null';
  const trackingConfig = TRACKING_STATUS_CONFIG[statusKey];

  return (
    <div className={`w-full flex-shrink-0 bg-[#FAFAFA] flex flex-col h-full overflow-hidden border-l border-gray-200 font-sans ${className}`}>
      <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 text-[10px] rounded-lg z-[999999] pointer-events-none">
          CRM DEBUG: {teamMembers.length} membros
      </div>
      {/* Header Profile */}
      <div className="bg-white border-b border-gray-200 shadow-sm relative z-20 flex-shrink-0">
          <div className="px-6 py-4 flex justify-between items-start">
              <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded border border-gray-100">
                  <Briefcase size={10} className="text-gray-500"/> {lead!.convertedToProducerId ? 'Cliente Ativo' : 'Lead em Potencial'}
              </div>
              {onClose && <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"><X size={18}/></button>}
          </div>

          <div className="px-6 pb-6 flex flex-col items-center">
                <div className="relative group cursor-pointer mb-3">
                    <Avatar src={lead!.foto_url} name={lead!.nome_display} alt="" className="w-24 h-24 rounded-[2rem] border-4 border-white shadow-xl object-cover transition-transform group-hover:scale-105" />
                    {lead!.convertedToProducerId && (
                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full border-4 border-white shadow-sm" title="Score Alto">
                            <Activity size={14} strokeWidth={3} />
                        </div>
                    )}
                </div>
                <h2 className="text-xl font-black text-gray-900 leading-tight mb-1 text-center">{lead!.nome_display}</h2>
                <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                    {lead!.instagram_username && <span className="flex items-center gap-1"><Instagram size={10}/> {lead!.instagram_username}</span>}
                </p>
                
                {/* Status Control */}
                {lead?.convertedToProducerId && (
                    <div className="mt-4 w-full flex justify-center relative" ref={trackingMenuRef}>
                        <button 
                            onClick={() => setIsTrackingOpen(!isTrackingOpen)}
                            className={`flex items-center justify-between gap-3 px-4 py-2 rounded-xl text-xs font-bold border transition-all w-full max-w-[240px] shadow-sm hover:shadow-md ${trackingConfig.bg} ${trackingConfig.color} ${trackingConfig.border} hover:brightness-95`}
                        >
                            <div className="flex items-center gap-2">
                                {React.createElement(trackingConfig.icon, { size: 14 })}
                                {trackingConfig.label}
                            </div>
                            <ChevronDown size={14} className={`transition-transform ${isTrackingOpen ? 'rotate-180' : ''}`}/>
                        </button>
                        
                        {isTrackingOpen && (
                            <div className="absolute top-full mt-2 w-full max-w-[260px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 origin-top">
                                <div className="p-1.5 space-y-0.5">
                                    {(Object.keys(TRACKING_STATUS_CONFIG) as string[]).map((status) => {
                                        if (status === 'null') return null;
                                        const cfg = TRACKING_STATUS_CONFIG[status];
                                        return (
                                            <button 
                                                key={status}
                                                onClick={() => handleTrackingChange(status as TrackingStatus)}
                                                className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-3 ${trackingStatus === status ? 'bg-gray-100 text-gray-900 shadow-inner' : 'hover:bg-gray-50 text-gray-600'}`}
                                            >
                                                <div className={`p-1.5 rounded-md ${cfg.bg} ${cfg.color}`}>
                                                    {React.createElement(cfg.icon, { size: 12 })}
                                                </div>
                                                {cfg.label}
                                                {trackingStatus === status && <Check size={14} className="ml-auto text-brand-600"/>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
          </div>

          {/* Journey Stepper */}
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between relative px-2">
                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-200 -z-10 mx-6 rounded-full"></div>
                {STAGES.map((stage, idx) => {
                    // @ts-ignore
                    const producerStage = lead.stage as ProducerStage || (lead.status === 'FECHADO' ? 'GROWTH' : 'AQUISICAO');
                    const currentIndex = STAGES.indexOf(producerStage);
                    const isCompleted = idx < currentIndex;
                    const isActive = idx === currentIndex;
                    
                    return (
                        <button 
                            key={stage} 
                            onClick={() => handleStageChangeInternal(stage)}
                            className={`flex flex-col items-center gap-1.5 group cursor-pointer transition-all ${isActive ? 'scale-110' : 'hover:scale-105'}`}
                            title={`Mover para ${stage}`}
                        >
                            <div className={`w-3 h-3 rounded-full border-2 transition-all duration-500 shadow-sm ${isActive ? 'bg-brand-500 border-brand-500 ring-4 ring-brand-100' : isCompleted ? 'bg-brand-500 border-brand-500' : 'bg-white border-gray-300'}`}></div>
                            <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors ${isActive ? 'text-brand-700' : isCompleted ? 'text-brand-600' : 'text-gray-400'}`}>{stage.slice(0,3)}</span>
                        </button>
                    );
                })}
            </div>
          </div>
      </div>

      {/* Tabs */}
      <div className="bg-white px-2 border-b border-gray-200 flex justify-around shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02)] z-10 flex-shrink-0">
          <button onClick={() => setActiveTab('timeline')} className={`flex-1 py-3 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-2 ${activeTab === 'timeline' ? 'border-brand-600 text-brand-600 bg-brand-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><History size={14}/> Timeline</button>
          <button onClick={() => setActiveTab('playbook')} className={`flex-1 py-3 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-2 ${activeTab === 'playbook' ? 'border-brand-600 text-brand-600 bg-brand-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><CheckSquare size={14}/> Tarefas</button>
          <button onClick={() => setActiveTab('files')} className={`flex-1 py-3 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-2 ${activeTab === 'files' ? 'border-brand-600 text-brand-600 bg-brand-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><FileText size={14}/> Arquivos</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#FAFAFA] p-6 relative">
          
          {/* TIMELINE TAB */}
          {activeTab === 'timeline' && (
              <div className="space-y-8 pb-10">
                  <div className="bg-[#FEFCE8] p-1.5 rounded-2xl border border-yellow-200 shadow-sm focus-within:ring-4 focus-within:ring-yellow-100 focus-within:border-yellow-300 transition-all group relative">
                        {teamMembers.length === 0 && (
                            <div className="absolute -top-5 left-2 text-[9px] text-amber-600 font-bold uppercase bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 animate-pulse z-10">
                                Carregando membros...
                            </div>
                        )}
                        <MentionsInput
                            value={noteContent || ''}
                            onChange={(e) => setNoteContent(e.target.value || '')}
                            onKeyDown={(e: any) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveNote(); } }}
                            placeholder="Adicionar nota interna... Use @ para mencionar"
                            className="mentions-input w-full min-h-[80px] p-3 text-xs font-medium text-gray-800 outline-none resize-none bg-transparent"
                            suggestionsPortalHost={document.body}
                            allowSuggestionsAboveCursor={true}
                        >
                            <Mention
                                trigger="@"
                                data={teamMembers && teamMembers.length > 0 ? teamMembers.filter(u => u).map(u => ({ id: String(u.id || 'unknown'), display: String(u.nome || 'Usuário') })) : [{ id: 'empty', display: 'Nenhum membro encontrado' }]}
                                displayTransform={(id, display) => `@${display || id || 'Usuário'}`}
                                markup="@[__display__](__id__)"
                                className="bg-yellow-200 text-yellow-900 font-bold px-0.5 rounded"
                                appendSpaceOnAdd
                                renderSuggestion={(suggestion, search, highlightedDisplay, index, focused) => (
                                    <div className={`flex items-center gap-3 px-4 py-2 ${focused ? 'bg-slate-50' : ''}`}>
                                        <div className="w-7 h-7 rounded-lg bg-yellow-100 flex items-center justify-center text-[10px] font-black text-yellow-700 uppercase">
                                            {suggestion.display ? String(suggestion.display).charAt(0) : '?'}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900">{highlightedDisplay}</span>
                                            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Membro da Equipe</span>
                                        </div>
                                    </div>
                                )}
                            />
                        </MentionsInput>
                        <div className="flex justify-between items-center p-2 border-t border-yellow-200/50">
                            <span className="text-[9px] font-bold text-yellow-600 uppercase tracking-wide flex items-center gap-1"><Shield size={10} className="text-amber-500"/> Visível apenas equipe</span>
                            <button onClick={handleSaveNote} disabled={!noteContent.trim() || isSavingNote} className="px-4 py-1.5 bg-yellow-400 text-yellow-900 rounded-lg text-[10px] font-bold hover:bg-yellow-500 transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50">
                                {isSavingNote ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>} Salvar
                            </button>
                        </div>
                  </div>

                  <div className="relative pl-4 space-y-8">
                      <div className="absolute left-[19px] top-4 bottom-0 w-0.5 bg-gray-200/60 rounded-full"></div>
                      
                      {Object.entries(groupedTimeline).map(([dateLabel, events]) => (
                          <div key={dateLabel} className="relative">
                              <div className="sticky top-0 z-10 py-2 -ml-2 mb-4 pointer-events-none">
                                  <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 shadow-sm px-3 py-1 rounded-full text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                      <Calendar size={10} className="text-brand-500"/> {dateLabel}
                                  </span>
                              </div>
                              <div className="space-y-4">
                                  {(events as any[]).map((event: any) => {
                                      // VISUAL PERSONALIZADO PARA EVENTOS DE TAREFA
                                      const isTaskEvent = event.category === 'TASK' || event.type === 'TASK_UPDATE';
                                      
                                      if (isTaskEvent) {
                                          let taskIcon = CheckSquare;
                                          let taskColor = 'text-gray-500';
                                          let taskBg = 'bg-gray-100';
                                          let taskBorder = 'border-gray-200';
                                          const action = event.metadata?.action;

                                          if (action === 'CREATE') { 
                                              taskIcon = Sparkles; 
                                              taskColor = 'text-indigo-600'; 
                                              taskBg = 'bg-indigo-100'; 
                                              taskBorder = 'border-indigo-200'; 
                                          } else if (action === 'STATUS_CHANGE') {
                                              if (event.metadata?.newValue === 'COMPLETED') {
                                                  taskIcon = CheckCircle2; 
                                                  taskColor = 'text-emerald-600'; 
                                                  taskBg = 'bg-emerald-100'; 
                                                  taskBorder = 'border-emerald-200';
                                              } else {
                                                  taskIcon = RefreshCw; 
                                                  taskColor = 'text-blue-600'; 
                                                  taskBg = 'bg-blue-100'; 
                                                  taskBorder = 'border-blue-200';
                                              }
                                          } else if (action === 'DELETE') {
                                              taskIcon = Trash2; 
                                              taskColor = 'text-red-500'; 
                                              taskBg = 'bg-red-100'; 
                                              taskBorder = 'border-red-200';
                                          } else if (action === 'UPDATE') {
                                              taskIcon = Edit2;
                                              taskColor = 'text-orange-500';
                                              taskBg = 'bg-orange-100';
                                              taskBorder = 'border-orange-200';
                                          }

                                          return (
                                              <div key={event.id} className="relative group pl-8">
                                                  <div className={`absolute left-0 top-1.5 w-8 h-8 rounded-full border-4 border-[#F9FAFB] flex items-center justify-center z-10 transition-transform group-hover:scale-110 shadow-sm ${taskBg} ${taskColor}`}>
                                                      {React.createElement(taskIcon, { size: 14 })}
                                                  </div>
                                                  <div className={`p-4 rounded-2xl border ${taskBorder} bg-white shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] relative`}>
                                                      <div className="flex justify-between items-start mb-1">
                                                          <span className={`text-[9px] font-bold uppercase tracking-wide ${taskColor}`}>Atividade de Tarefa</span>
                                                          <span className="text-[9px] font-medium text-gray-400 font-mono">{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                      </div>
                                                      <p className="text-xs text-gray-700 font-medium">
                                                          {event.type === 'NOTE' ? (
                                                              event.content?.split(/(@\[[^\]]+\]\([^)]+\))/g).map((part: string, i: number) => {
                                                                  const match = part.match(/@\[([^\]]+)\]\(([^)]+)\)/);
                                                                  if (match) {
                                                                      return (
                                                                          <span key={i} className="bg-yellow-100 text-yellow-800 px-1 rounded font-bold border border-yellow-200 mx-0.5">
                                                                              @{match[1]}
                                                                          </span>
                                                                      );
                                                                  }
                                                                  return part;
                                                              })
                                                          ) : (
                                                              event.content
                                                          )}
                                                      </p>
                                                      {event.authorName && (
                                                          <div className="mt-2 flex items-center gap-1.5 opacity-60">
                                                              <Avatar src="" name={event.authorName} alt="" className="w-3.5 h-3.5 rounded-full text-[6px] border border-gray-200"/>
                                                              <span className="text-[9px] font-bold text-gray-500">{event.authorName}</span>
                                                          </div>
                                                      )}
                                                  </div>
                                              </div>
                                          );
                                      }

                                      return (
                                          <div key={event.id} className="relative group pl-8">
                                              <div className={`absolute left-0 top-1.5 w-8 h-8 rounded-full border-4 border-[#F9FAFB] flex items-center justify-center z-10 transition-transform group-hover:scale-110 shadow-sm
                                                  ${event.type === 'NOTE' ? 'bg-amber-100 text-amber-600' : 'bg-white text-gray-400 border-gray-200'}
                                              `}>
                                                  {event.type === 'NOTE' ? <StickyNote size={12} fill="currentColor"/> : <div className="w-2 h-2 rounded-full bg-gray-300"></div>}
                                              </div>
                                              
                                              {event.type === 'NOTE' ? (
                                                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow relative overflow-hidden">
                                                      <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                                                      <div className="flex justify-between items-center mb-2">
                                                          <div className="flex items-center gap-2">
                                                              <Avatar name={event.authorName || 'User'} src="" alt="" className="w-5 h-5 rounded-full bg-gray-100 border border-gray-200 text-[8px]"/>
                                                              <span className="text-xs font-bold text-gray-900">{event.authorName}</span>
                                                          </div>
                                                          <span className="text-[10px] text-gray-400 font-medium">{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                      </div>
                                                      <p className="text-sm text-gray-600 leading-relaxed font-normal whitespace-pre-wrap">{event.content}</p>
                                                  </div>
                                              ) : (
                                                  <div className="pt-1.5 pb-4">
                                                      <div className="flex items-center gap-2 mb-1">
                                                          <span className="text-xs font-bold text-gray-900">Sistema</span>
                                                          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                          <span className="text-[10px] text-gray-400">{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                      </div>
                                                      <p className="text-sm text-gray-500 font-medium">{event.content}</p>
                                                  </div>
                                              )}
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}
          
          {/* TASKS TAB - UPGRADED TO SMART CARD & QUICK ADD */}
          {activeTab === 'playbook' && (
              <div className="space-y-4 pb-20">
                  {/* Quick Add Bar */}
                  <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-2 relative z-20 group focus-within:shadow-md focus-within:border-brand-200 transition-all">
                        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
                            <ListTodo size={20} />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Adicionar tarefa rápida..." 
                            className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-gray-900 placeholder:text-gray-400 h-10 px-2"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateTask(e)}
                        />
                        
                        <div className="h-8 w-px bg-gray-100 mx-1"></div>
                        
                        {/* Date Picker Trigger */}
                        <div className="relative" ref={datePickerRef}>
                            <button 
                                type="button"
                                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-bold text-gray-600 transition-colors"
                            >
                                <CalendarDays size={14}/>
                                {newTaskDate ? new Date(newTaskDate).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'}) : 'Hoje'}
                            </button>
                            {isDatePickerOpen && (
                                <MiniCalendar 
                                    selectedDate={newTaskDate} 
                                    onChange={setNewTaskDate} 
                                    onClose={() => setIsDatePickerOpen(false)}
                                />
                            )}
                        </div>

                        <button 
                            onClick={handleCreateTask}
                            disabled={!newTaskTitle.trim()}
                            className="bg-gray-900 text-white p-2.5 rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                        >
                            <Plus size={16} />
                        </button>
                  </div>

                  {/* Task List */}
                  {tasks.length > 0 ? (
                      <div className="space-y-3">
                          {tasks.map(task => (
                              <SmartTaskCard 
                                key={task.id}
                                task={task}
                                onUpdateStatus={updateTaskStatus}
                                onUpdateTitle={handleUpdateTaskTitle}
                                onUpdateDate={handleUpdateTaskDate}
                                onUpdateAssignee={handleUpdateTaskAssignee}
                                onDelete={handleDeleteTask}
                                teamMembers={teamMembers}
                              />
                          ))}
                      </div>
                  ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-gray-300 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50">
                          <CheckSquare size={48} className="mb-3 opacity-30"/>
                          <p className="text-xs font-bold">Nenhuma tarefa pendente para este cliente.</p>
                      </div>
                  )}
              </div>
          )}

          {/* FILES TAB */}
          {activeTab === 'files' && (
              <div className="space-y-4 pb-10">
                  <div 
                    onClick={() => fileInputRef.current?.click()} 
                    className="border-2 border-dashed border-gray-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 hover:border-brand-300 transition-all cursor-pointer group bg-white"
                  >
                      <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                          {isUploading ? <Loader2 size={24} className="animate-spin"/> : <DownloadCloud size={24}/>}
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Upload de Arquivo</h4>
                      <p className="text-xs text-gray-500 mt-1">Arraste ou clique para enviar</p>
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                  </div>
                  
                  <div className="space-y-2">
                      {files.map((file) => (
                          <a key={file.id} href={file.url} target="_blank" className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl hover:shadow-md hover:border-blue-200 transition-all group">
                              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                  <FileText size={20}/>
                              </div>
                              <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-bold text-gray-900 truncate">{file.name}</h4>
                                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">{file.size} • {new Date(file.createdAt).toLocaleDateString()}</p>
                              </div>
                              <ExternalLink size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors"/>
                          </a>
                      ))}
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};
