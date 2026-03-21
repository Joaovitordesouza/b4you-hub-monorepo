import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ShieldAlert, Users, Mail, Briefcase, User, Shield, ShieldCheck, Star, Award, Crown, Headset, Laptop, Code, PenTool, TrendingUp, DollarSign } from 'lucide-react';

export interface RoleConfig {
    id: string;
    label: string;
    color: string;
    badgeColor: string;
    iconName: string;
    gradient: string;
    permissions: string[];
}

export const DEFAULT_ROLES: RoleConfig[] = [
    { id: 'admin', label: 'Administrador', color: 'text-purple-700 bg-purple-50 border-purple-200', badgeColor: 'bg-purple-600', iconName: 'ShieldAlert', gradient: 'from-purple-500 to-indigo-600', permissions: ['manage_users', 'view_financials', 'delete_leads', 'manage_integrations', 'export_data', 'access_admin_panel', 'access_hunter'] },
    { id: 'hunter', label: 'Hunter (SDR)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', badgeColor: 'bg-emerald-600', iconName: 'Users', gradient: 'from-emerald-400 to-teal-500', permissions: ['access_hunter'] },
    { id: 'support', label: 'Suporte', color: 'text-blue-700 bg-blue-50 border-blue-200', badgeColor: 'bg-blue-600', iconName: 'Headset', gradient: 'from-blue-400 to-cyan-500', permissions: ['access_admin_panel'] },
    { id: 'prospector', label: 'Hunter', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', badgeColor: 'bg-emerald-600', iconName: 'Users', gradient: 'from-emerald-400 to-teal-500', permissions: ['access_hunter'] },
    { id: 'cs_manager', label: 'CS Manager', color: 'text-orange-700 bg-orange-50 border-orange-200', badgeColor: 'bg-orange-600', iconName: 'Briefcase', gradient: 'from-orange-400 to-amber-500', permissions: ['view_financials', 'manage_integrations', 'access_admin_panel', 'access_hunter'] }
];

export const DEFAULT_DEPARTMENTS = ['Comercial', 'Customer Success', 'Tech & Produto', 'Administrativo', 'Operações'];

export const ICON_MAP: Record<string, any> = {
    'ShieldAlert': ShieldAlert,
    'Shield': Shield,
    'ShieldCheck': ShieldCheck,
    'Users': Users,
    'User': User,
    'Mail': Mail,
    'Briefcase': Briefcase,
    'Star': Star,
    'Award': Award,
    'Crown': Crown,
    'Headset': Headset,
    'Laptop': Laptop,
    'Code': Code,
    'PenTool': PenTool,
    'TrendingUp': TrendingUp,
    'DollarSign': DollarSign
};

export const useOrganization = () => {
    const [roles, setRoles] = useState<RoleConfig[]>(DEFAULT_ROLES);
    const [departments, setDepartments] = useState<string[]>(DEFAULT_DEPARTMENTS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = db.collection('settings').doc('organization').onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                if (data?.roles) setRoles(data.roles);
                if (data?.departments) setDepartments(data.departments);
            } else {
                // Initialize if not exists
                db.collection('settings').doc('organization').set({
                    roles: DEFAULT_ROLES,
                    departments: DEFAULT_DEPARTMENTS
                });
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const getRoleConfig = (roleId: string) => {
        return roles.find(r => r.id === roleId) || roles.find(r => r.id === 'hunter') || DEFAULT_ROLES[1];
    };

    const getRoleIcon = (iconName: string) => {
        return ICON_MAP[iconName] || User;
    };

    const updateRoles = async (newRoles: RoleConfig[]) => {
        await db.collection('settings').doc('organization').set({ roles: newRoles }, { merge: true });
    };

    const updateDepartments = async (newDepts: string[]) => {
        await db.collection('settings').doc('organization').set({ departments: newDepts }, { merge: true });
    };

    return { roles, departments, loading, getRoleConfig, getRoleIcon, updateRoles, updateDepartments, ICON_MAP };
};
