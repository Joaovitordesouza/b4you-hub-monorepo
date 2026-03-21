
import { db, fieldValue, auth } from '../firebase';
import { AuditLog, Notification, UserRole } from '../types';

/**
 * Serviço de Auditoria e Segurança
 * Responsável por registrar ações críticas na plataforma.
 */
export const AuditService = {
    logAction: async (
        action: string, 
        targetId: string, 
        targetCollection: string, 
        metadata: any = {}
    ) => {
        const user = auth.currentUser;
        if (!user) return; // Auditoria só para ações autenticadas

        const log: AuditLog = {
            id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            action,
            targetId,
            targetCollection,
            actorId: user.uid,
            actorName: user.displayName || 'Usuário Desconhecido',
            timestamp: fieldValue.serverTimestamp(),
            metadata
        };

        try {
            await db.collection('audit_logs').add(log);
        } catch (error) {
            console.error("Falha Crítica: Não foi possível registrar log de auditoria.", error);
        }
    }
};

/**
 * Serviço de Notificações do Sistema
 * Gerencia notificações persistentes no Firestore (não apenas Toasts efêmeros).
 */
export const NotificationService = {
    /**
     * Envia uma notificação para um usuário específico
     */
    notifyUser: async (
        userId: string, 
        notification: { 
            title: string; 
            body: string; 
            type: Notification['type']; 
            link?: string; 
            priority?: 'HIGH' | 'NORMAL' | 'LOW' 
        }
    ) => {
        try {
            await db.collection('users').doc(userId).collection('notifications').add({
                ...notification,
                read: false,
                createdAt: fieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error(`Erro ao notificar usuário ${userId}:`, error);
        }
    },

    /**
     * Envia notificação para todos os usuários com um determinado cargo (Role)
     */
    notifyRole: async (
        role: UserRole,
        notification: { 
            title: string; 
            body: string; 
            type: Notification['type']; 
            link?: string;
        }
    ) => {
        try {
            const usersSnapshot = await db.collection('users').where('role', '==', role).get();
            const batch = db.batch();

            usersSnapshot.docs.forEach(doc => {
                const ref = doc.ref.collection('notifications').doc();
                batch.set(ref, {
                    ...notification,
                    read: false,
                    createdAt: fieldValue.serverTimestamp(),
                    priority: 'NORMAL'
                });
            });

            await batch.commit();
        } catch (error) {
            console.error(`Erro ao notificar role ${role}:`, error);
        }
    },

    /**
     * Marca uma notificação como lida
     */
    markAsRead: async (userId: string, notificationId: string) => {
        try {
            await db.collection('users').doc(userId).collection('notifications').doc(notificationId).update({
                read: true
            });
        } catch (error) {
            console.error("Erro ao marcar notificação como lida:", error);
        }
    }
};
