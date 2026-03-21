
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, UserPlus, User, Loader2, ChevronRight, Save, ArrowLeft, Smartphone, Briefcase, CheckCircle2, DollarSign, Sparkles, Mail, Instagram, ChevronDown, Check, Layout, CreditCard, Layers } from 'lucide-react';
import { db, auth, fieldValue } from '../../firebase';
import { Lead, Producer, Usuario } from '../../types';
import { Avatar } from '../Avatar';
import { useEvolution } from '../../contexts/EvolutionContext';

interface NewChatModalProps {
    onClose: () => void;
    onSelectChat: (phone: string) => void;
}

// Interface unificada para exibição
interface ContactItem {
    id: string;
    name: string;
    avatar: string;
    phone: string;
    email: string;
    type: 'LEAD' | 'CLIENT';
    status?: string;
    originalData?: any;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ onClose, onSelectChat }) => {
    const { instances } = useEvolution();
    const [view, setView] = useState<'LIST' | 'CREATE'>('LIST');
    const [searchTerm, setSearchTerm] = useState('');
    const [contacts, setContacts] = useState<ContactItem[]>([]);
    const [loading, setLoading] = useState(true);
    
    // State para Criação (Padronizado)
    const [isCreating, setIsCreating] = useState(false);
    const [teamMembers, setTeamMembers] = useState<Usuario[]>([]);
    const [isManagerListOpen, setIsManagerListOpen] = useState(false);

    const [newLeadData, setNewLeadData] = useState({
        name: '',
        phone: '',
        email: '',
        instagram: '',
        produto: '',
        plataforma: 'Kiwify',
        mrr: '',
        cnpj: '',
        gerente_conta: auth.currentUser?.uid || ''
    });

    // Máscaras
    const phoneMask = (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15);
    const currencyMask = (v: string) => {
        let val = v.replace(/\D/g, '');
        val = (Number(val) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        return val;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewLeadData({ ...newLeadData, phone: phoneMask(e.target.value) });
    };

    const handleMrrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewLeadData({ ...newLeadData, mrr: currencyMask(e.target.value) });
    };

    // Buscar Leads, Produtores e Equipe ao abrir
    useEffect(() => {
        const fetchData = async () => {
            if (!auth.currentUser) return;
            try {
                // 1. Buscar Leads
                const leadsPromise = db.collection('leads')
                    .orderBy('createdAt', 'desc')
                    .limit(50)
                    .get();

                // 2. Buscar Produtores (Clientes)
                const producersPromise = db.collection('producers')
                    .orderBy('updatedAt', 'desc')
                    .limit(50)
                    .get();
                
                // 3. Buscar Equipe (Para o dropdown de gerente)
                const teamPromise = db.collection('users').get();

                const [leadsSnap, producersSnap, teamSnap] = await Promise.all([leadsPromise, producersPromise, teamPromise]);

                // Processar Equipe
                const users = teamSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Usuario));
                const managers = users.filter(u => ['admin', 'cs_manager', 'hunter'].includes(u.role));
                setTeamMembers(managers);

                // Processar Leads
                const mappedLeads: ContactItem[] = leadsSnap.docs.map(doc => {
                    const data = doc.data() as Lead;
                    return {
                        id: doc.id,
                        name: data.nome_display,
                        avatar: data.foto_url,
                        phone: data.dados_contato?.whatsapp || '',
                        email: data.dados_contato?.email || '',
                        type: 'LEAD' as const,
                        status: data.status,
                        originalData: data
                    };
                }).filter(c => c.phone);

                // Processar Clientes
                const mappedClients: ContactItem[] = producersSnap.docs.map(doc => {
                    const data = doc.data() as Producer;
                    return {
                        id: doc.id,
                        name: data.nome_display,
                        avatar: data.foto_url,
                        phone: data.whatsapp_contato || '',
                        email: data.email_contato || '',
                        type: 'CLIENT' as const,
                        status: 'Ativo',
                        originalData: data
                    };
                }).filter(c => c.phone);

                // Merge e Remoção de Duplicatas
                const unifiedMap = new Map<string, ContactItem>();
                mappedLeads.forEach(c => unifiedMap.set(c.phone.replace(/\D/g, ''), c));
                mappedClients.forEach(c => unifiedMap.set(c.phone.replace(/\D/g, ''), c));

                setContacts(Array.from(unifiedMap.values()));

            } catch (error) {
                console.error("Erro ao buscar dados:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredContacts = contacts.filter(contact => 
        (contact.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.phone || '').includes(searchTerm)
    );

    const handleCreateLead = async () => {
        if (!auth.currentUser) return;
        
        if (!newLeadData.name || !newLeadData.phone) {
            alert("Nome e WhatsApp são obrigatórios.");
            return;
        }

        setIsCreating(true);
        try {
            // Normalização do Telefone
            const cleanPhone = newLeadData.phone.replace(/\D/g, '');
            const formattedPhone = cleanPhone.length < 12 ? `55${cleanPhone}` : cleanPhone;

            const leadId = `lead_${Date.now()}`;
            // Se criando manualmente, usa avatar gerado
            const generatedAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(newLeadData.name)}&background=random`;
            
            const newLeadPayload: Partial<Lead> = {
                id: leadId,
                ownerId: auth.currentUser.uid,
                nome_display: newLeadData.name.trim(),
                instagram_username: newLeadData.instagram.replace('@', '').trim() || '',
                foto_url: generatedAvatar,
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
                    resumo: 'Lead cadastrado manualmente via Nova Conversa.',
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
            
            // Iniciar conversa imediatamente
            const contactItem: ContactItem = {
                id: leadId,
                name: newLeadPayload.nome_display!,
                avatar: newLeadPayload.foto_url!,
                phone: formattedPhone,
                email: newLeadPayload.dados_contato?.email || '',
                type: 'LEAD',
                originalData: newLeadPayload
            };
            handleSelectContact(contactItem);
            
        } catch (error) {
            console.error("Erro ao criar lead:", error);
            alert("Erro ao salvar lead. Tente novamente.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleSelectContact = async (contact: ContactItem) => {
        if (!contact.phone) {
            alert("Este contato não possui número de WhatsApp cadastrado.");
            return;
        }
        
        // Determina qual instância usar (pega a primeira ativa)
        const activeInstance = instances.find(i => i.connectionStatus === 'ONLINE') || instances[0];
        const instanceId = activeInstance?.id;

        const cleanPhone = contact.phone.replace(/\D/g, '');
        const jid = `${cleanPhone}@s.whatsapp.net`;

        // Se tivermos uma instância, atualizamos o documento do chat com os dados do contato
        // CORREÇÃO: Força o uso do avatar do contato (CRM) no chat para que apareça corretamente
        if (instanceId) {
            try {
                await db.collection('instances').doc(instanceId).collection('chats').doc(jid).set({
                    leadId: contact.id,
                    leadName: contact.name,
                    pushName: contact.name, // Fallback visual
                    profilePicUrl: contact.avatar || '', // Use contact avatar explicitly
                    remoteJid: jid,
                    lastMessageAt: Date.now(), // Atualiza para aparecer no topo
                    type: 'private'
                }, { merge: true });
            } catch (error) {
                console.error("Erro ao pre-configurar chat:", error);
            }
        }

        onSelectChat(jid);
        onClose();
    };

    const selectedManager = teamMembers.find(u => u.id === newLeadData.gerente_conta);

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#09090b]/70 backdrop-blur-md animate-in fade-in duration-200 font-sans">
            <div className={`bg-white rounded-[2rem] w-full ${view === 'CREATE' ? 'max-w-2xl' : 'max-w-md'} shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 transition-all`}>
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        {view === 'CREATE' ? (
                            <button onClick={() => setView('LIST')} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 border border-transparent hover:border-gray-200">
                                <ArrowLeft size={20} />
                            </button>
                        ) : (
                            <div className="p-3 bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-200">
                                <UserPlus size={24}/>
                            </div>
                        )}
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none">
                                {view === 'LIST' ? 'Nova Conversa' : 'Novo Cadastro'}
                            </h2>
                            <p className="text-xs text-gray-500 font-semibold mt-1">
                                {view === 'LIST' ? 'Inicie um atendimento' : 'Adicione um novo lead à carteira'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-[#FAFAFA] custom-scrollbar">
                    
                    {/* VIEW: LIST */}
                    {view === 'LIST' && (
                        <div className="flex flex-col min-h-full p-2">
                            <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm mx-4 mt-4 sticky top-0 z-10">
                                <div className="relative group">
                                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-600 transition-colors"/>
                                    <input 
                                        autoFocus
                                        type="text" 
                                        placeholder="Buscar cliente ou lead..." 
                                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all outline-none font-semibold text-gray-900 placeholder:text-gray-400"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="p-4 space-y-2">
                                {loading ? (
                                    <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-gray-400"/></div>
                                ) : filteredContacts.length > 0 ? (
                                    filteredContacts.map(contact => (
                                        <button 
                                            key={contact.id}
                                            onClick={() => handleSelectContact(contact)}
                                            className="w-full flex items-center gap-4 p-4 hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-transparent hover:border-gray-100 rounded-2xl transition-all group text-left relative"
                                        >
                                            <Avatar src={contact.avatar} name={contact.name} alt="" className="w-12 h-12 rounded-xl border border-gray-200 group-hover:scale-105 transition-transform" />
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <h4 className="font-bold text-gray-900 text-sm truncate">{contact.name}</h4>
                                                    {contact.type === 'CLIENT' ? (
                                                        <span className="text-[9px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded border border-green-200 flex items-center gap-1 uppercase tracking-wide">
                                                            <CheckCircle2 size={10}/> Cliente
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-wide">
                                                            Lead
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 truncate flex items-center gap-1.5 font-medium">
                                                    {contact.phone ? <Smartphone size={12}/> : null}
                                                    {contact.phone || 'Sem WhatsApp'}
                                                </p>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-gray-50 rounded-full text-gray-400 group-hover:text-brand-600">
                                                <ChevronRight size={20} />
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="py-16 text-center text-gray-400 text-sm flex flex-col items-center">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 opacity-50">
                                            <User size={32} />
                                        </div>
                                        <p className="font-medium">Nenhum contato encontrado.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* VIEW: CREATE (ELITE UI MATCH) */}
                    {view === 'CREATE' && (
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Coluna 1: Dados Pessoais */}
                                <div className="space-y-6">
                                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-gray-200">
                                        <User size={14} className="text-brand-500"/> DADOS PESSOAIS
                                    </h3>
                                    
                                    <div className="space-y-5">
                                        <div className="group relative">
                                            <User size={18} className="absolute left-4 top-3.5 text-gray-400"/>
                                            <input autoFocus type="text" value={newLeadData.name} onChange={e => setNewLeadData({...newLeadData, name: e.target.value})} className="w-full pl-12 p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all placeholder:text-gray-400" placeholder="Ex: João Silva" />
                                        </div>
                                        
                                        <div className="group relative">
                                            <Mail size={18} className="absolute left-4 top-3.5 text-gray-400"/>
                                            <input type="email" value={newLeadData.email} onChange={e => setNewLeadData({...newLeadData, email: e.target.value})} className="w-full pl-12 p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:border-brand-500 transition-all" placeholder="email@cliente.com" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="group relative">
                                                <Smartphone size={18} className="absolute left-4 top-3.5 text-gray-400"/>
                                                <input type="tel" value={newLeadData.phone} onChange={handlePhoneChange} className="w-full pl-12 p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:border-brand-500 transition-all" placeholder="(00) 0..." />
                                            </div>
                                            <div className="group relative">
                                                <Instagram size={18} className="absolute left-4 top-3.5 text-gray-400"/>
                                                <input type="text" value={newLeadData.instagram} onChange={e => setNewLeadData({...newLeadData, instagram: e.target.value})} className="w-full pl-12 p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:border-brand-500 transition-all" placeholder="@usuario" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Coluna 2: Dados do Negócio */}
                                <div className="space-y-6">
                                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-gray-200">
                                        <Briefcase size={14} className="text-brand-500"/> DADOS DO NEGÓCIO
                                    </h3>

                                    <div className="space-y-5">
                                        <div className="group relative">
                                            <Layers size={18} className="absolute left-4 top-3.5 text-gray-400"/>
                                            <input type="text" value={newLeadData.produto} onChange={e => setNewLeadData({...newLeadData, produto: e.target.value})} className="w-full pl-12 p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:border-brand-500 transition-all" placeholder="Ex: Método 10k" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="group relative">
                                                <DollarSign size={18} className="absolute left-4 top-3.5 text-gray-400"/>
                                                <input type="text" value={newLeadData.mrr} onChange={handleMrrChange} className="w-full pl-12 p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:border-brand-500 transition-all" placeholder="R$ 0,00" />
                                            </div>
                                            <div className="group relative">
                                                <CreditCard size={18} className="absolute left-4 top-3.5 text-gray-400"/>
                                                <input type="text" value={newLeadData.cnpj} onChange={e => setNewLeadData({...newLeadData, cnpj: e.target.value})} className="w-full pl-12 p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:border-brand-500 transition-all" placeholder="Documento" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block ml-1">Plataforma</label>
                                            <div className="grid grid-cols-2 gap-2.5">
                                                {['Kiwify', 'Hotmart', 'Eduzz', 'Kirvano'].map(p => (
                                                    <button 
                                                        key={p} 
                                                        onClick={() => setNewLeadData({...newLeadData, plataforma: p})} 
                                                        className={`p-3.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${newLeadData.plataforma === p ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
                                                    >
                                                        {p}
                                                        {newLeadData.plataforma === p && <Check size={16}/>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Gerente Responsável</label>
                                            <div className="relative">
                                                <button 
                                                    type="button"
                                                    onClick={() => setIsManagerListOpen(!isManagerListOpen)}
                                                    className="w-full pl-4 pr-4 p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-left focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none font-semibold transition-all shadow-sm flex items-center justify-between"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {selectedManager ? (
                                                            <>
                                                                <Avatar src={selectedManager.avatar} name={selectedManager.nome} alt="" className="w-5 h-5 rounded-full border border-gray-200"/>
                                                                <span className="text-gray-900">{selectedManager.nome}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-gray-400">Sem gerente</span>
                                                        )}
                                                    </div>
                                                    {isManagerListOpen ? <ChevronDown size={16} className="text-gray-400 rotate-180 transition-transform"/> : <ChevronDown size={16} className="text-gray-400 transition-transform"/>}
                                                </button>
                                                
                                                {isManagerListOpen && (
                                                    <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 custom-scrollbar">
                                                        {teamMembers.map(u => (
                                                            <button 
                                                                key={u.id} 
                                                                type="button"
                                                                onClick={() => {
                                                                    setNewLeadData({...newLeadData, gerente_conta: u.id});
                                                                    setIsManagerListOpen(false);
                                                                }}
                                                                className={`w-full p-3 text-left text-sm flex items-center gap-3 hover:bg-brand-50 transition-colors ${newLeadData.gerente_conta === u.id ? 'bg-brand-50/50' : ''}`}
                                                            >
                                                                <Avatar src={u.avatar} name={u.nome} alt="" className="w-8 h-8 rounded-lg border border-gray-200"/>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-bold text-gray-900 flex items-center justify-between">
                                                                        {u.nome}
                                                                        {u.id === auth.currentUser?.uid && <span className="text-[9px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded uppercase">Você</span>}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-500 uppercase">{u.role}</div>
                                                                </div>
                                                                {newLeadData.gerente_conta === u.id && <Check size={14} className="text-brand-600"/>}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-200 bg-gray-50/50 sticky bottom-0 z-20 flex gap-4">
                    {view === 'LIST' ? (
                        <button 
                            onClick={() => setView('CREATE')}
                            className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 group active:scale-95 text-sm uppercase tracking-wide"
                        >
                            <UserPlus size={20} className="group-hover:scale-110 transition-transform"/>
                            Cadastrar Novo Cliente
                        </button>
                    ) : (
                        <>
                            <button onClick={() => setView('LIST')} className="flex-1 py-4 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-100 transition-all uppercase text-xs">
                                Voltar
                            </button>
                            <button 
                                onClick={handleCreateLead}
                                disabled={isCreating}
                                className="flex-[2] py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 active:scale-95 uppercase text-xs"
                            >
                                {isCreating ? <Loader2 size={18} className="animate-spin"/> : <Save size={18} />}
                                Salvar e Conversar
                            </button>
                        </>
                    )}
                </div>

            </div>
        </div>,
        document.body
    );
};
