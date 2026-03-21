
import React, { useState } from 'react';
import { Lead, LeadStatus } from '../types';
import { MessageSquare, MoreHorizontal } from 'lucide-react';
import { Avatar } from '../components/Avatar';

const COLUMNS: { id: LeadStatus; label: string; color: string }[] = [
  { id: 'NOVO', label: 'Novos', color: 'bg-blue-500' },
  { id: 'EM_CONVERSA', label: 'Em Conversa', color: 'bg-purple-500' },
  { id: 'INTERESSADO', label: 'Interessados', color: 'bg-orange-500' },
  { id: 'AGENDADO', label: 'Agendados', color: 'bg-green-500' },
  { id: 'DESCARTADO', label: 'Descartados', color: 'bg-red-500' },
];

interface Props {
  leads: Lead[];
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
}

export const KanbanBoard: React.FC<Props> = ({ leads, onUpdateStatus }) => {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    if (!draggedLeadId) return;
    onUpdateStatus(draggedLeadId, status);
    setDraggedLeadId(null);
  };

  const getLeadsByStatus = (status: LeadStatus) => leads.filter(l => l.status === status);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Pipeline de Prospecção</h1>
          <p className="text-[#6B7280] font-medium">Gerencie o fluxo de leads arrastando os cards.</p>
        </div>
        <div className="flex space-x-2">
           <span className="text-xs text-[#6B7280] font-medium flex items-center bg-white px-3 py-1 rounded-full border border-[#E5E7EB] shadow-sm">
             Arraste para mover
           </span>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="h-full flex space-x-4 min-w-[1200px]">
          {COLUMNS.map(column => (
            <div 
              key={column.id}
              className="w-80 flex-shrink-0 flex flex-col bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="p-3 flex items-center justify-between border-b border-[#E5E7EB]">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${column.color}`}></div>
                  <h3 className="font-semibold text-[#374151]">{column.label}</h3>
                  <span className="bg-white text-[#6B7280] text-xs px-2 py-0.5 rounded-full font-bold border border-[#E5E7EB]">
                    {getLeadsByStatus(column.id).length}
                  </span>
                </div>
                <button className="text-[#9CA3AF] hover:text-[#4B5563]">
                  <MoreHorizontal size={16} />
                </button>
              </div>

              <div className="p-2 flex-1 overflow-y-auto space-y-2">
                {getLeadsByStatus(column.id).map(lead => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onClick={() => window.location.hash = `#/leads/${lead.id}`}
                    className="bg-white p-3 rounded-lg shadow-sm border border-[#E5E7EB] cursor-grab active:cursor-grabbing hover:shadow-md transition-all group hover:border-[#CBD5E1]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Avatar 
                          src={lead.foto_url} 
                          name={lead.nome_display} 
                          alt={lead.nome_display}
                          className="w-8 h-8 rounded-full border border-[#F1F5F9]"
                        />
                        <div>
                          <p className="text-sm font-bold text-[#111827] truncate max-w-[120px]">{lead.nome_display}</p>
                          <a href="#" className="text-xs text-blue-600 hover:underline flex items-center">
                            {lead.instagram_username}
                          </a>
                        </div>
                      </div>
                      <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        lead.score_qualificacao >= 70 ? 'bg-green-50 text-green-700 border-green-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                      }`}>
                        {lead.score_qualificacao} pts
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {lead.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-[#F9FAFB] text-[#6B7280] font-medium rounded border border-[#E5E7EB]">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#F9FAFB]">
                      <div className="flex space-x-2">
                        {lead.analise_ia_json.sinais_monetizacao && (
                          <span className="text-xs text-green-600 font-bold flex items-center" title="Sinais de Monetização">
                            $
                          </span>
                        )}
                      </div>
                      <button className="text-[#9CA3AF] hover:text-brand-600 transition-colors">
                        <MessageSquare size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
