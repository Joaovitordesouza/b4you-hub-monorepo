
import React from 'react';
import { EvolutionInstance, SystemStatus } from '../../types';
import { CheckCircle2, AlertTriangle, RefreshCw, QrCode, Power, Loader2 } from 'lucide-react';

interface Props {
  status: SystemStatus;
  syncPercentage?: number;
}

export const InstanceStatusBadge: React.FC<Props> = ({ status, syncPercentage = 0 }) => {
  switch (status) {
    case 'READY':
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200 shadow-sm animate-in fade-in">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide">Conectado</span>
        </div>
      );

    case 'INITIALIZING':
    case 'SYNCING':
      return (
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200 animate-pulse">
          <RefreshCw size={12} className="animate-spin" />
          <span className="text-[10px] font-bold uppercase tracking-wide">
            Sincronizando {syncPercentage > 0 ? `${syncPercentage}%` : ''}
          </span>
        </div>
      );

    case 'NEEDS_PAIRING':
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full border border-yellow-200">
          <QrCode size={12} />
          <span className="text-[10px] font-bold uppercase tracking-wide">Ler QR Code</span>
        </div>
      );
      
    case 'CREATED':
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-600 rounded-full border border-gray-200">
          <Loader2 size={12} className="animate-spin" />
          <span className="text-[10px] font-bold uppercase tracking-wide">Criando...</span>
        </div>
      );

    case 'RECONNECT_REQUIRED':
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-200">
          <AlertTriangle size={12} />
          <span className="text-[10px] font-bold uppercase tracking-wide">Desconectado</span>
        </div>
      );

    case 'DELETING':
        return (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-200 opacity-70">
              <Power size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wide">Removendo...</span>
            </div>
        );

    default:
      return null;
  }
};