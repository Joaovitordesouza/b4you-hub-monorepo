
import { EvolutionChat, TimelineEvent } from '../types';

export const MOCK_CHATS: EvolutionChat[] = [
    {
        id: '5511999990001@s.whatsapp.net',
        remoteJid: '5511999990001@s.whatsapp.net',
        pushName: 'Dr. Roberto Alves',
        profilePicUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop',
        lastMessage: 'Vou verificar a agenda e te aviso.',
        lastMessageAt: Date.now(),
        unreadCount: 2,
        type: 'private',
        tags: ['Quente', 'Médico']
    },
    {
        id: '5511999990002@s.whatsapp.net',
        remoteJid: '5511999990002@s.whatsapp.net',
        pushName: 'Julia Marketing',
        profilePicUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
        lastMessage: '🎵 Áudio (0:45)',
        lastMessageAt: Date.now() - 3600000,
        unreadCount: 0,
        type: 'private',
        tags: ['Parceria']
    },
    {
        id: '5511999990003@s.whatsapp.net',
        remoteJid: '5511999990003@s.whatsapp.net',
        pushName: 'Bruno Tech',
        profilePicUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop',
        lastMessage: '📷 Imagem',
        lastMessageAt: Date.now() - 86400000,
        unreadCount: 0,
        type: 'private',
        tags: ['Suporte']
    }
];

export const MOCK_MESSAGES: Record<string, TimelineEvent[]> = {
    '5511999990001@s.whatsapp.net': [
        { id: 'm1', type: 'WHATSAPP_MSG', timestamp: new Date(Date.now() - 1000000).toISOString(), authorId: 'CLIENT', content: 'Olá, gostaria de saber mais sobre a mentoria.', status: 'read' },
        { id: 'm2', type: 'WHATSAPP_MSG', timestamp: new Date(Date.now() - 900000).toISOString(), authorId: 'ME', content: 'Oi Dr. Roberto! Claro. Nossa mentoria foca em escalar produtos digitais na área da saúde. Você já tem algum infoproduto?', status: 'read' },
        { id: 'm3', type: 'WHATSAPP_MSG', timestamp: new Date(Date.now() - 800000).toISOString(), authorId: 'CLIENT', content: 'Tenho um ebook, mas vende pouco.', status: 'read' },
        { id: 'm4', type: 'WHATSAPP_MSG', timestamp: new Date().toISOString(), authorId: 'ME', content: 'Entendi. Podemos agendar uma call para eu analisar sua estrutura?', status: 'delivered' },
        { id: 'm5', type: 'WHATSAPP_MSG', timestamp: new Date().toISOString(), authorId: 'CLIENT', content: 'Vou verificar a agenda e te aviso.', status: 'delivered' }
    ],
    '5511999990002@s.whatsapp.net': [
        { id: 'm1', type: 'WHATSAPP_MSG', timestamp: new Date(Date.now() - 3600000).toISOString(), authorId: 'CLIENT', content: '', status: 'read', metadata: { mediaType: 'audio', duration: '0:45' } },
        { id: 'm2', type: 'WHATSAPP_MSG', timestamp: new Date().toISOString(), authorId: 'ME', content: 'Ouvi aqui Julia! Achei ótima a ideia.', status: 'read' }
    ],
    '5511999990003@s.whatsapp.net': [
        { id: 'm1', type: 'WHATSAPP_MSG', timestamp: new Date(Date.now() - 86400000).toISOString(), authorId: 'CLIENT', content: 'Segue o print do erro:', status: 'read' },
        { id: 'm2', type: 'WHATSAPP_MSG', timestamp: new Date(Date.now() - 86400000).toISOString(), authorId: 'CLIENT', content: '', status: 'read', metadata: { mediaType: 'image', mediaUrl: 'https://placehold.co/600x400/png' } },
        { id: 'm3', type: 'WHATSAPP_MSG', timestamp: new Date().toISOString(), authorId: 'ME', content: 'Vou abrir um chamado técnico.', status: 'read' }
    ]
};
