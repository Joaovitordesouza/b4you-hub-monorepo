


import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Trello, Users, Menu, LogOut, DownloadCloud, PlaySquare, X, HelpCircle, Bot, Gem, MessageCircle, PieChart, Target, User, Truck, Shield, Monitor, ChevronRight, Bell, Calendar, PanelLeftClose, PanelLeftOpen, ChevronLeft, HeartPulse, ListChecks, CheckSquare, Rocket, Map } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';

interface LayoutProps {
  children: React.ReactNode;
}

// Notification Center Popover (Mantido Igual)
const NotificationCenter = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const { currentUser } = useAuth();

    useEffect(() => {
        if (!currentUser) return;
        const unsub = db.collection('users').doc(currentUser.id).collection('notifications')
            .where('read', '==', false)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .onSnapshot(snap => {
                setNotifications(snap.docs.map(d => ({id: d.id, ...d.data()})));
            });
        return () => unsub();
    }, [currentUser]);

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-500 hover:bg-white hover:text-brand-600 hover:shadow-sm transition-all relative"
            >
                <Bell size={20} />
                {notifications.length > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-gray-50"></span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute bottom-12 left-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in slide-in-from-bottom-2 origin-bottom-left">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-900 text-sm">Notificações</h3>
                            <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{notifications.length} novas</span>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 text-xs">
                                    <Bell size={24} className="mx-auto mb-2 opacity-20"/>
                                    Tudo limpo por aqui!
                                </div>
                            ) : (
                                notifications.map(notif => (
                                    <div key={notif.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-gray-800 text-xs">{notif.title}</h4>
                                            <span className="text-[9px] text-gray-400">Agora</span>
                                        </div>
                                        <p className="text-xs text-gray-500 leading-snug">{notif.body}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const SidebarItem = ({ icon: Icon, label, active, onClick, badge, collapsed }: { icon: any, label: string, active?: boolean, onClick?: () => void, badge?: string, collapsed?: boolean }) => (
  <button
    onClick={onClick}
    className={`flex items-center transition-all duration-300 group relative
      ${collapsed 
        ? 'w-10 h-10 justify-center rounded-xl mx-auto mb-2' 
        : 'w-full justify-between px-5 py-3.5 mx-2 rounded-xl mb-1'
      }
      ${active 
        ? 'bg-brand-600 text-white shadow-card font-semibold' 
        : 'text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827]'
      }
    `}
    style={{ width: collapsed ? '40px' : 'calc(100% - 16px)' }}
    title={collapsed ? label : ''}
  >
    <div className={`flex items-center relative z-10 ${collapsed ? 'justify-center' : 'space-x-3'}`}>
      <Icon size={collapsed ? 20 : 20} className={`transition-transform duration-200 ${active ? 'text-white' : 'text-[#4B5563] group-hover:text-[#111827]'}`} strokeWidth={2} />
      {!collapsed && <span className="text-sm tracking-wide whitespace-nowrap">{label}</span>}
    </div>
    
    {!collapsed && badge && (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm relative z-10 ${active ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-700 border border-brand-100'}`}>
        {badge}
      </span>
    )}
    
    {collapsed && (
        <div className="absolute left-full ml-4 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none transition-opacity shadow-lg">
            {label}
        </div>
    )}
  </button>
);

const SidebarSection = ({ title, collapsed }: { title: string, collapsed?: boolean }) => {
    if (collapsed) return <div className="h-px bg-gray-100 mx-4 my-4"></div>;
    
    return (
        <div className="px-6 mb-3 mt-6 flex items-center space-x-2 animate-in fade-in duration-300">
            <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest whitespace-nowrap">{title}</span>
            <div className="h-px bg-gray-100 flex-1"></div>
        </div>
    );
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentUser, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  const [isManualCollapsed, setIsManualCollapsed] = useState(false);

  useEffect(() => {
      const handleHashChange = () => setCurrentHash(window.location.hash);
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const isFocusMode = currentHash.includes('#/inbox') || currentHash.includes('#/connect');
  const isCollapsed = isFocusMode || isManualCollapsed;
  const isFullHeightPage = currentHash.includes('#/my-work') || currentHash.includes('#/inbox') || currentHash.includes('#/kanban') || currentHash.includes('#/onboarding') || currentHash.includes('#/cs-pipeline') || currentHash.includes('#/health-kanban') || currentHash.includes('#/tasks');

  const getRoleLabel = (role?: string) => {
      switch(role) {
          case 'admin': return 'Admin Global';
          case 'hunter': return 'Hunter (SDR)';
          case 'support': return 'Suporte';
          case 'cs_manager': return 'CS Manager';
          case 'prospector': return 'Hunter';
          default: return 'Membro';
      }
  };

  return (
    <div className="h-screen w-screen flex bg-[#FAFAFA] text-[#111827] font-sans selection:bg-brand-100 selection:text-brand-900 overflow-hidden">
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 right-4 z-50 bg-white p-3 rounded-full shadow-card border border-[#E5E7EB] text-[#374151] hover:text-brand-600 transition-colors"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-[#111827]/30 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-40 bg-white border-r border-[#E5E7EB] shadow-card flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] h-full
        ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full'}
        ${isCollapsed ? 'md:translate-x-0 md:w-20' : 'md:translate-x-0 md:w-72'}
      `}>
        <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-6'} border-b border-[#F9FAFB] relative bg-white transition-all shrink-0`}>
          {isCollapsed ? (
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  B4
              </div>
          ) : (
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/b4you-hub.firebasestorage.app/o/logoDark.png?alt=media&token=307bf6df-6078-45f9-83a1-fff18657053b" 
                alt="B4You" 
                className="max-h-8 w-auto object-contain hover:opacity-90 transition-opacity"
              />
          )}
          
          {!isFocusMode && !isCollapsed && (
             <button onClick={() => setIsManualCollapsed(true)} className="hidden md:flex p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                 <PanelLeftClose size={18} />
             </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-1 scrollbar-hide">
          
          {/* TESTING MODE: Force Simple Task Manager for everyone including Admins */}
          <SidebarItem collapsed={isCollapsed} icon={CheckSquare} label="Minhas Tarefas" onClick={() => window.location.hash = '#/tasks'} active={window.location.hash.includes('tasks')} badge="New" />

          {isCollapsed ? (
              <SidebarItem collapsed={true} icon={LayoutDashboard} label="Visão Geral" onClick={() => window.location.hash = '#/'} active={window.location.hash === '#/' || window.location.hash === ''} />
          ) : (
              <div className="px-2 mb-2 mt-1">
                <button 
                  onClick={() => window.location.hash = '#/'} 
                  className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl border transition-all ${window.location.hash === '#/' || window.location.hash === '' ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                >
                    <LayoutDashboard size={18} />
                    <span className="text-sm font-bold">Visão Geral</span>
                </button>
              </div>
          )}

          <SidebarSection title="Gestão & Sucesso" collapsed={isCollapsed} />
          <SidebarItem collapsed={isCollapsed} icon={Map} label="Onboarding" onClick={() => window.location.hash = '#/onboarding'} active={window.location.hash.includes('onboarding')} badge="Novo" />
          <SidebarItem collapsed={isCollapsed} icon={Rocket} label="Lançamentos" onClick={() => window.location.hash = '#/launch-control'} active={window.location.hash.includes('launch-control')} badge="Pico" />
          <SidebarItem collapsed={isCollapsed} icon={ListChecks} label="Acompanhamento" onClick={() => window.location.hash = '#/cs-pipeline'} active={window.location.hash.includes('cs-pipeline')} badge="CRM" />
          <SidebarItem collapsed={isCollapsed} icon={User} label="Carteira de Clientes" onClick={() => window.location.hash = '#/creators'} active={window.location.hash.includes('creators')} />
          <SidebarItem collapsed={isCollapsed} icon={MessageCircle} label="Connect Hub" onClick={() => window.location.hash = '#/connect'} active={window.location.hash.includes('connect')} badge="Chat" />

          {currentUser?.role === 'admin' && (
            <>
              <SidebarSection title="Administração" collapsed={isCollapsed} />
              <SidebarItem 
                collapsed={isCollapsed} 
                icon={Shield} 
                label="Painel Admin" 
                onClick={() => window.location.hash = '#/admin'} 
                active={window.location.hash.includes('admin')} 
              />
            </>
          )}

          <div className="mt-8 border-t border-gray-50 pt-4">
             <SidebarItem collapsed={isCollapsed} icon={HelpCircle} label="Ajuda & Guia" onClick={() => window.location.hash = '#/help'} active={window.location.hash.includes('help')} />
          </div>
        </div>

        <div className={`border-t border-[#F9FAFB] bg-white shrink-0 ${isCollapsed ? 'p-2' : 'p-4'}`}>
          <div className={`bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB] hover:border-[#CBD5E1] transition-all duration-200 ${isCollapsed ? 'p-2 flex flex-col gap-2 items-center' : 'p-3'}`}>
            
            {isCollapsed && !isFocusMode && (
                <button onClick={() => setIsManualCollapsed(false)} className="mb-2 p-1.5 bg-white border border-gray-200 rounded-lg hover:border-brand-300 hover:text-brand-600 transition-all shadow-sm">
                    <PanelLeftOpen size={16} />
                </button>
            )}

            {isCollapsed && <div className="mb-2"><NotificationCenter /></div>}

            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3 mb-3'}`}>
              <div className="relative group">
                <img src={currentUser?.avatar} alt="User" className={`${isCollapsed ? 'w-8 h-8' : 'w-10 h-10'} rounded-xl object-cover border border-white shadow-sm`} />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              {!isCollapsed && (
                  <div className="flex-1 overflow-hidden min-w-0">
                    <p className="text-sm font-bold text-[#111827] truncate">{currentUser?.nome}</p>
                    <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide">
                      {getRoleLabel(currentUser?.role)}
                    </p>
                  </div>
              )}
              
              {!isCollapsed && <NotificationCenter />}
            </div>
            {!isCollapsed && (
                <button 
                  onClick={logout}
                  className="w-full flex items-center justify-center space-x-2 py-2 bg-white border border-[#E5E7EB] text-[#374151] hover:text-red-600 hover:border-red-100 hover:bg-red-50 rounded-lg transition-all duration-200 text-xs font-bold uppercase tracking-wide shadow-sm"
                >
                  <LogOut size={14} strokeWidth={2} />
                  <span>Sair</span>
                </button>
            )}
          </div>
        </div>
      </aside>

      <main className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 bg-[#FAFAFA] relative ${isCollapsed ? 'md:ml-20' : 'md:ml-72'}`}>
        <div className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden ${isFullHeightPage ? 'p-0' : 'overflow-y-auto p-6 md:p-8'}`}>
          {children}
        </div>
      </main>
    </div>
  );
};