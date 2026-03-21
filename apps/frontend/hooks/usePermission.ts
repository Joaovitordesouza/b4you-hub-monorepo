
import { useAuth } from '../AuthContext';
import { UserRole } from '../types';
import { useOrganization } from './useOrganization';

type Permission = 
    | 'manage_users' 
    | 'view_financials' 
    | 'delete_leads' 
    | 'manage_integrations' 
    | 'export_data'
    | 'access_admin_panel'
    | 'access_hunter';

export const usePermission = () => {
    const { currentUser } = useAuth();
    const { roles } = useOrganization();

    const can = (permission: Permission): boolean => {
        if (!currentUser) return false;
        const roleConfig = roles.find(r => r.id === currentUser.role);
        const userPermissions = roleConfig?.permissions || [];
        return userPermissions.includes(permission);
    };

    const isRole = (role: UserRole): boolean => {
        return currentUser?.role === role;
    };

    return { 
        can, 
        isRole,
        role: currentUser?.role 
    };
};
