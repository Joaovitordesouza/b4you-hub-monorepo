import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

import { STATUS_COLORS } from '../constants';

interface TimeInStageBadgeProps {
    statusUpdatedAt?: string;
    nextReminderAt?: string;
    stageType?: 'NORMAL' | 'REMINDER'; // NORMAL shows time in stage, REMINDER shows countdown
    variant?: 'badge' | 'text'; // 'badge' is default with background, 'text' is plain text
    className?: string;
}

export const TimeInStageBadge: React.FC<TimeInStageBadgeProps> = ({ 
    statusUpdatedAt, 
    nextReminderAt, 
    stageType = 'NORMAL',
    variant = 'badge',
    className = ''
}) => {
    const [timeString, setTimeString] = useState('');
    const [isOverdue, setIsOverdue] = useState(false);
    const [fullDateString, setFullDateString] = useState('');

    useEffect(() => {
        if (statusUpdatedAt) {
            const date = new Date(statusUpdatedAt);
            setFullDateString(`Desde ${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
        } else {
            setFullDateString('Tempo nesta etapa');
        }
    }, [statusUpdatedAt]);

    useEffect(() => {
        const calculateTime = () => {
            const now = new Date().getTime();

            if (stageType === 'REMINDER' && nextReminderAt) {
                const targetTime = new Date(nextReminderAt).getTime();
                const diff = targetTime - now;
                
                if (diff < 0) {
                    setIsOverdue(true);
                    setTimeString(`Atrasado há ${formatDuration(Math.abs(diff))}`);
                } else {
                    setIsOverdue(false);
                    setTimeString(`Em ${formatDuration(diff)}`);
                }
            } else if (statusUpdatedAt) {
                const startTime = new Date(statusUpdatedAt).getTime();
                const diff = now - startTime;
                setTimeString(formatDuration(diff));
                setIsOverdue(false);
            } else {
                setTimeString('Recente');
                setIsOverdue(false);
            }
        };

        calculateTime();
        const interval = setInterval(calculateTime, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [statusUpdatedAt, nextReminderAt, stageType]);

    const formatDuration = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ${hours % 24}h`;
        }
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        return `${minutes}m`;
    };

    if (!statusUpdatedAt && !nextReminderAt) return null;

    if (stageType === 'REMINDER' && nextReminderAt) {
        if (variant === 'text') {
            return <span className={`${isOverdue ? 'text-red-600' : 'text-blue-600'} ${className}`} title={fullDateString}>{timeString}</span>;
        }
        
        let dateHeader = null;
        if (statusUpdatedAt) {
            const date = new Date(statusUpdatedAt);
            const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
            const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            dateHeader = (
                <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">
                    Desde {formattedDate} às {formattedTime}
                </span>
            );
        }

        return (
            <div className={`flex flex-col gap-0.5 ${className}`} title={fullDateString}>
                {dateHeader}
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide w-fit shadow-sm border ${isOverdue ? `${STATUS_COLORS.OVERDUE} animate-pulse` : STATUS_COLORS.UPCOMING}`}>
                    {isOverdue ? <AlertCircle size={12} className="text-rose-500" /> : <Clock size={12} className="text-blue-500" />}
                    {timeString}
                </div>
            </div>
        );
    }

    if (variant === 'text') {
        return <span className={className} title={fullDateString}>{timeString}</span>;
    }

    if (stageType === 'NORMAL' && statusUpdatedAt) {
        const date = new Date(statusUpdatedAt);
        const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
        const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        return (
            <div className={`flex flex-col gap-0.5 ${className}`} title={fullDateString}>
                <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">
                    Desde {formattedDate} às {formattedTime}
                </span>
                <div className="flex items-center gap-1 text-[11px] font-bold text-gray-700 bg-white px-2 py-0.5 rounded-md border border-gray-200/80 shadow-sm w-fit">
                    <Clock size={11} className="text-gray-400" />
                    {timeString}
                </div>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-white px-2 py-0.5 rounded-md border border-gray-200/80 shadow-sm ${className}`} title={fullDateString}>
            <Clock size={11} className="text-gray-400" />
            {timeString}
        </div>
    );
};
