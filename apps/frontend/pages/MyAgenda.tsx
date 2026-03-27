import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db, functions } from '../firebase';
import { CalendarSettings, GoogleCalendarIntegration, WorkingHours } from '../types';
import { 
    Calendar, Settings, ShieldCheck, 
    Clock, RefreshCw, 
    Save, Plus, Minus, Info, Coffee, Trash2, Globe, AlertTriangle
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const DAYS = [
    { id: 'monday', label: 'Segunda-feira' },
    { id: 'tuesday', label: 'Terça-feira' },
    { id: 'wednesday', label: 'Quarta-feira' },
    { id: 'thursday', label: 'Quinta-feira' },
    { id: 'friday', label: 'Sexta-feira' },
    { id: 'saturday', label: 'Sábado' },
    { id: 'sunday', label: 'Domingo' },
];

export const MyAgenda: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [integration, setIntegration] = useState<GoogleCalendarIntegration | null>(null);
    const [settings, setSettings] = useState<CalendarSettings>({
        working_hours: {
            monday: { start: "09:00", end: "18:00", enabled: true, breakStart: "12:00", breakEnd: "13:00" },
            tuesday: { start: "09:00", end: "18:00", enabled: true, breakStart: "12:00", breakEnd: "13:00" },
            wednesday: { start: "09:00", end: "18:00", enabled: true, breakStart: "12:00", breakEnd: "13:00" },
            thursday: { start: "09:00", end: "18:00", enabled: true, breakStart: "12:00", breakEnd: "13:00" },
            friday: { start: "09:00", end: "18:00", enabled: true, breakStart: "12:00", breakEnd: "13:00" },
            saturday: { start: "09:00", end: "12:00", enabled: false },
            sunday: { start: "09:00", end: "12:00", enabled: false },
        },
        buffer_minutes: 15,
        slot_duration: 45,
        timezone: 'America/Sao_Paulo'
    });

    useEffect(() => {
        if (!currentUser) return;

        const loadData = async () => {
            try {
                // Carrega Integração
                const intDoc = await db.collection('users').doc(currentUser.id).collection('integrations').doc('google_calendar').get();
                if (intDoc.exists) setIntegration(intDoc.data() as GoogleCalendarIntegration);

                // Carrega Configurações
                const setDoc = await db.collection('users').doc(currentUser.id).collection('calendar_settings').doc('default').get();
                if (setDoc.exists) {
                    const data = setDoc.data() as CalendarSettings;
                    if (!data.timezone) data.timezone = 'America/Sao_Paulo';
                    setSettings(data);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [currentUser]);

    const handleConnect = async () => {
        try {
            const getAuthUrl = functions.httpsCallable('getGoogleAuthUrl');
            const { data: url } = await getAuthUrl();
            window.location.href = url;
        } catch (e) {
            addToast({ type: 'error', message: 'Erro ao iniciar conexão com Google.' });
        }
    };

    const handleSaveSettings = async () => {
        if (!currentUser) return;
        setSaving(true);
        try {
            await db.collection('users').doc(currentUser.id).collection('calendar_settings').doc('default').set(settings);
            addToast({ type: 'success', message: 'Configurações de agenda salvas com sucesso!' });
        } catch (e) {
            addToast({ type: 'error', message: 'Erro ao salvar configurações.' });
        } finally {
            setSaving(false);
        }
    };

    const updateDaySetting = (dayId: string, field: keyof WorkingHours, value: any) => {
        setSettings(s => ({
            ...s,
            working_hours: {
                ...s.working_hours,
                [dayId]: { ...s.working_hours[dayId], [field]: value }
            }
        }));
    };

    const addBreak = (dayId: string) => {
        setSettings(s => ({
            ...s,
            working_hours: {
                ...s.working_hours,
                [dayId]: { ...s.working_hours[dayId], breakStart: '12:00', breakEnd: '13:00' }
            }
        }));
    };

    const removeBreak = (dayId: string) => {
        setSettings(s => {
            const currentDaySettings = { ...s.working_hours[dayId] };
            delete currentDaySettings.breakStart;
            delete currentDaySettings.breakEnd;
            return {
                ...s,
                working_hours: {
                    ...s.working_hours,
                    [dayId]: currentDaySettings
                }
            };
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-20 space-y-3">
                <RefreshCw className="animate-spin text-brand-500" size={24} />
                <p className="text-gray-400 font-semibold text-xs tracking-wide">Carregando Agenda...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 mb-6 border-b border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
                        <Calendar size={24} className="text-brand-600" />
                        Minha Agenda
                    </h1>
                    <p className="text-gray-500 text-sm mt-1.5 max-w-xl">
                        Conecte seu Google Calendar e configure horários para o onboarding automático de produtores.
                    </p>
                </div>
                
                {!integration ? (
                    <button 
                        onClick={handleConnect}
                        className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all flex items-center gap-2"
                    >
                        <ShieldCheck size={18} /> Conectar Google Workspace
                    </button>
                ) : (
                    <div className="bg-green-50 text-green-700 px-4 py-2.5 rounded-xl border border-green-100 flex items-center gap-2.5 shadow-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-semibold">Calendário Sincronizado</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Lateral Esquerda */}
                <div className="lg:col-span-4 space-y-4">
                    {/* Status Sync Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Info size={16} className="text-brand-500" />
                            Status da Automação
                        </h3>
                        
                        {integration ? (
                            <div className="space-y-4">
                                <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    A leitura automática da sua agenda <strong>Principal</strong> está ativada. Eventos criados no Google bloquearão horários no B4You.
                                </p>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-xs bg-white border border-gray-100 px-3 py-2 rounded-lg">
                                        <span className="text-gray-500">Links Google Meet</span>
                                        <span className="text-green-600 font-medium">Automático</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs bg-white border border-gray-100 px-3 py-2 rounded-lg">
                                        <span className="text-gray-500">Última checagem</span>
                                        <span className="text-gray-900 font-medium">Tempo real</span>
                                    </div>
                                </div>
                                <button className="w-full py-2.5 text-gray-500 hover:text-red-600 font-medium text-xs rounded-lg transition-colors border border-transparent hover:border-red-100 hover:bg-red-50 mt-2">
                                    Revogar Acesso OAuth
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100 text-xs text-yellow-800 leading-relaxed font-medium">
                                    <AlertTriangle className="text-yellow-600 mb-2" size={18} />
                                    Sem a conexão com o Google, os produtores poderão agendar horários em conflito com seus outros compromissos diários.
                                </div>
                                <button onClick={handleConnect} className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-medium text-sm transition-colors hover:bg-black">
                                    Conectar Agora
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Dicas */}
                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                        <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-gray-800"><Settings size={16} className="text-gray-400"/> Boas Práticas</h3>
                        <div className="space-y-3">
                            <p className="text-xs text-gray-600 leading-relaxed">
                                <strong className="text-gray-800">Buffer:</strong> Recomendamos 15 minutos de intervalo entre reuniões para evitar atrasos em cascata.
                            </p>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                <strong className="text-gray-800">Pausas:</strong> Configure pelo menos 1 hora de almoço clara para bloquear agendamentos no meio do dia.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Área Principal - Configurações */}
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        
                        {/* Control Panel (Top) */}
                        <div className="bg-gray-50/50 p-5 border-b border-gray-200">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div className="flex flex-wrap items-center gap-4">
                                    
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-semibold text-gray-500 uppercase flex items-center gap-1"><Clock size={12}/> Duração (min)</label>
                                        <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm">
                                            <button onClick={() => setSettings(s => ({...s, slot_duration: Math.max(15, s.slot_duration - 15)}))} className="p-1.5 hover:bg-gray-50 text-gray-500 transition-colors"><Minus size={14}/></button>
                                            <span className="text-sm font-bold text-gray-800 w-8 text-center">{settings.slot_duration}</span>
                                            <button onClick={() => setSettings(s => ({...s, slot_duration: s.slot_duration + 15}))} className="p-1.5 hover:bg-gray-50 text-gray-500 transition-colors"><Plus size={14}/></button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-semibold text-gray-500 uppercase flex items-center gap-1"><Save size={12}/> Buffer (min)</label>
                                        <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm">
                                            <button onClick={() => setSettings(s => ({...s, buffer_minutes: Math.max(0, s.buffer_minutes - 5)}))} className="p-1.5 hover:bg-gray-50 text-gray-500 transition-colors"><Minus size={14}/></button>
                                            <span className="text-sm font-bold text-gray-800 w-8 text-center">{settings.buffer_minutes}</span>
                                            <button onClick={() => setSettings(s => ({...s, buffer_minutes: s.buffer_minutes + 5}))} className="p-1.5 hover:bg-gray-50 text-gray-500 transition-colors"><Plus size={14}/></button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-semibold text-gray-500 uppercase flex items-center gap-1"><Globe size={12}/> Timezone</label>
                                        <select 
                                            className="bg-white border border-gray-200 text-sm font-medium text-gray-700 py-1.5 px-3 rounded-lg outline-none focus:border-brand-300 shadow-sm"
                                            value={settings.timezone}
                                            onChange={(e) => setSettings(s => ({...s, timezone: e.target.value}))}
                                        >
                                            <option value="America/Sao_Paulo">Brasília (BRT)</option>
                                            <option value="America/Manaus">Manaus (AMT)</option>
                                        </select>
                                    </div>

                                </div>
                                <button 
                                    onClick={handleSaveSettings}
                                    disabled={saving}
                                    className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
                                >
                                    {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                                    Salvar Alterações
                                </button>
                            </div>
                        </div>

                        {/* Listagem de Dias */}
                        <div className="divide-y divide-gray-100">
                            {DAYS.map((day, idx) => {
                                const daySettings = settings.working_hours[day.id];
                                const hasBreak = !!daySettings?.breakStart && !!daySettings?.breakEnd;

                                return (
                                    <div key={day.id} className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${daySettings?.enabled ? 'bg-white' : 'bg-gray-50/30'}`}>
                                        
                                        {/* Canto Esquerdo: Toggle + Label */}
                                        <div className="flex items-center gap-3 w-40">
                                            <button 
                                                onClick={() => updateDaySetting(day.id, 'enabled', !daySettings?.enabled)}
                                                className={`w-10 h-5 rounded-full relative transition-colors ${daySettings?.enabled ? 'bg-brand-500' : 'bg-gray-300'}`}
                                            >
                                                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${daySettings?.enabled ? 'translate-x-5' : ''}`}></div>
                                            </button>
                                            <span className={`text-sm font-semibold ${daySettings?.enabled ? 'text-gray-900' : 'text-gray-400'}`}>{day.label}</span>
                                        </div>

                                        {/* Canto Direito: Inputs */}
                                        {daySettings?.enabled && (
                                            <div className="flex flex-wrap items-center gap-3 md:flex-1 md:justify-end">
                                                
                                                {/* Start/End */}
                                                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg">
                                                    <input 
                                                        type="time" 
                                                        value={daySettings.start} 
                                                        onChange={e => updateDaySetting(day.id, 'start', e.target.value)}
                                                        className="bg-transparent text-sm font-medium text-gray-700 outline-none w-[68px] cursor-pointer"
                                                    />
                                                    <span className="text-gray-300 text-xs">-</span>
                                                    <input 
                                                        type="time" 
                                                        value={daySettings.end} 
                                                        onChange={e => updateDaySetting(day.id, 'end', e.target.value)}
                                                        className="bg-transparent text-sm font-medium text-gray-700 outline-none w-[68px] cursor-pointer text-right"
                                                    />
                                                </div>

                                                {/* Pausa */}
                                                {hasBreak ? (
                                                    <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 px-2 py-1.5 rounded-lg group">
                                                        <Coffee size={14} className="text-orange-400 ml-1" />
                                                        <input 
                                                            type="time" 
                                                            value={daySettings.breakStart} 
                                                            onChange={e => updateDaySetting(day.id, 'breakStart', e.target.value)}
                                                            className="bg-transparent text-sm font-medium text-orange-800 outline-none w-[68px] cursor-pointer"
                                                        />
                                                        <span className="text-orange-300 text-xs">-</span>
                                                        <input 
                                                            type="time" 
                                                            value={daySettings.breakEnd} 
                                                            onChange={e => updateDaySetting(day.id, 'breakEnd', e.target.value)}
                                                            className="bg-transparent text-sm font-medium text-orange-800 outline-none w-[68px] cursor-pointer text-right"
                                                        />
                                                        <button 
                                                            onClick={() => removeBreak(day.id)} 
                                                            className="p-1 text-orange-400 hover:text-red-500 hover:bg-orange-100 rounded ml-1 transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Remover Pausa"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => addBreak(day.id)} 
                                                        className="flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-gray-800 bg-white hover:bg-gray-50 border border-transparent hover:border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        <Plus size={14} /> Pausa
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
