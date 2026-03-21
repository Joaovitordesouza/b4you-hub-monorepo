import React, { useState } from 'react';
import { useOrganization, RoleConfig } from '../hooks/useOrganization';
import { Shield, Building2, Plus, Edit2, Trash2, Save, X, Check } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export const OrganizationSettings: React.FC = () => {
    const { roles, departments, updateRoles, updateDepartments, getRoleIcon, ICON_MAP } = useOrganization();
    const { addToast } = useToast();
    
    const [editingRole, setEditingRole] = useState<RoleConfig | null>(null);
    const [editingDept, setEditingDept] = useState<{oldName: string, newName: string} | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveRole = async () => {
        if (!editingRole || !editingRole.id || !editingRole.label) return;
        setIsSaving(true);
        try {
            const newRoles = [...roles];
            const index = newRoles.findIndex(r => r.id === editingRole.id);
            if (index >= 0) {
                newRoles[index] = editingRole;
            } else {
                newRoles.push(editingRole);
            }
            await updateRoles(newRoles);
            setEditingRole(null);
            addToast({ message: 'Cargo salvo com sucesso!', type: 'success' });
        } catch (error) {
            console.error(error);
            addToast({ message: 'Erro ao salvar cargo.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRole = async (roleId: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este cargo?')) return;
        setIsSaving(true);
        try {
            const newRoles = roles.filter(r => r.id !== roleId);
            await updateRoles(newRoles);
            addToast({ message: 'Cargo excluído com sucesso!', type: 'success' });
        } catch (error) {
            console.error(error);
            addToast({ message: 'Erro ao excluir cargo.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveDept = async () => {
        if (!editingDept || !editingDept.newName) return;
        setIsSaving(true);
        try {
            let newDepts = [...departments];
            if (editingDept.oldName) {
                const index = newDepts.indexOf(editingDept.oldName);
                if (index >= 0) newDepts[index] = editingDept.newName;
            } else {
                if (!newDepts.includes(editingDept.newName)) {
                    newDepts.push(editingDept.newName);
                }
            }
            await updateDepartments(newDepts);
            setEditingDept(null);
            addToast({ message: 'Departamento salvo com sucesso!', type: 'success' });
        } catch (error) {
            console.error(error);
            addToast({ message: 'Erro ao salvar departamento.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteDept = async (dept: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este departamento?')) return;
        setIsSaving(true);
        try {
            const newDepts = departments.filter(d => d !== dept);
            await updateDepartments(newDepts);
            addToast({ message: 'Departamento excluído com sucesso!', type: 'success' });
        } catch (error) {
            console.error(error);
            addToast({ message: 'Erro ao excluir departamento.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Cargos */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Shield className="text-brand-600" size={20} />
                            Cargos e Funções
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Gerencie os cargos e suas permissões no sistema.</p>
                    </div>
                    <button 
                        onClick={() => setEditingRole({ id: '', label: '', color: 'text-gray-700 bg-gray-50 border-gray-200', badgeColor: 'bg-gray-600', iconName: 'User', gradient: 'from-gray-400 to-gray-500', permissions: [] })}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold transition-all text-xs"
                    >
                        <Plus size={16} /> Novo Cargo
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    {roles.map(role => {
                        const Icon = getRoleIcon(role.iconName);
                        return (
                            <div key={role.id} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all bg-white">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${role.gradient} text-white shadow-sm`}>
                                        <Icon size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{role.label}</h3>
                                        <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {role.id}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setEditingRole(role)} className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"><Edit2 size={16}/></button>
                                    <button onClick={() => handleDeleteRole(role.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Departamentos */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Building2 className="text-brand-600" size={20} />
                            Departamentos
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Gerencie as áreas da sua organização.</p>
                    </div>
                    <button 
                        onClick={() => setEditingDept({ oldName: '', newName: '' })}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold transition-all text-xs"
                    >
                        <Plus size={16} /> Novo Departamento
                    </button>
                </div>
                
                <div className="p-6 flex flex-wrap gap-3">
                    {departments.map(dept => (
                        <div key={dept} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700">
                            {dept}
                            <div className="flex items-center ml-2 border-l border-gray-300 pl-2">
                                <button onClick={() => setEditingDept({ oldName: dept, newName: dept })} className="p-1 text-gray-400 hover:text-brand-600 transition-colors"><Edit2 size={14}/></button>
                                <button onClick={() => handleDeleteDept(dept)} className="p-1 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal de Edição de Cargo */}
            {editingRole && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#09090b]/70 backdrop-blur-md">
                    <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-black text-gray-900">
                                {editingRole.id ? 'Editar Cargo' : 'Novo Cargo'}
                            </h2>
                            <button onClick={() => setEditingRole(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={20}/></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">ID do Cargo (único)</label>
                                    <input 
                                        type="text" 
                                        value={editingRole.id} 
                                        onChange={e => setEditingRole({...editingRole, id: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                                        disabled={!!roles.find(r => r.id === editingRole.id) && editingRole.id !== ''}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-500"
                                        placeholder="ex: admin_vendas"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Nome de Exibição</label>
                                    <input 
                                        type="text" 
                                        value={editingRole.label} 
                                        onChange={e => setEditingRole({...editingRole, label: e.target.value})}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-500"
                                        placeholder="ex: Administrador de Vendas"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Ícone</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.keys(ICON_MAP).map(iconName => {
                                        const Icon = ICON_MAP[iconName as keyof typeof ICON_MAP];
                                        return (
                                            <button 
                                                key={iconName}
                                                onClick={() => setEditingRole({...editingRole, iconName})}
                                                className={`p-3 rounded-xl border flex items-center justify-center transition-all ${editingRole.iconName === iconName ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <Icon size={20} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Permissões</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        'manage_users', 'view_financials', 'delete_leads', 
                                        'manage_integrations', 'export_data', 'access_admin_panel',
                                        'access_hunter'
                                    ].map(perm => (
                                        <label key={perm} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white cursor-pointer hover:bg-gray-50">
                                            <input 
                                                type="checkbox" 
                                                checked={editingRole.permissions.includes(perm)}
                                                onChange={(e) => {
                                                    const newPerms = e.target.checked 
                                                        ? [...editingRole.permissions, perm]
                                                        : editingRole.permissions.filter(p => p !== perm);
                                                    setEditingRole({...editingRole, permissions: newPerms});
                                                }}
                                                className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700">{perm}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setEditingRole(null)} className="px-5 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Cancelar</button>
                            <button onClick={handleSaveRole} disabled={isSaving || !editingRole.id || !editingRole.label} className="px-5 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2">
                                {isSaving ? 'Salvando...' : <><Save size={18}/> Salvar Cargo</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Edição de Departamento */}
            {editingDept && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#09090b]/70 backdrop-blur-md">
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl relative flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-black text-gray-900">
                                {editingDept.oldName ? 'Editar Departamento' : 'Novo Departamento'}
                            </h2>
                            <button onClick={() => setEditingDept(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={20}/></button>
                        </div>
                        <div className="p-6">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Nome do Departamento</label>
                            <input 
                                type="text" 
                                value={editingDept.newName} 
                                onChange={e => setEditingDept({...editingDept, newName: e.target.value})}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-500"
                                placeholder="ex: Marketing"
                                autoFocus
                            />
                        </div>
                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setEditingDept(null)} className="px-5 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Cancelar</button>
                            <button onClick={handleSaveDept} disabled={isSaving || !editingDept.newName} className="px-5 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2">
                                {isSaving ? 'Salvando...' : <><Save size={18}/> Salvar</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
