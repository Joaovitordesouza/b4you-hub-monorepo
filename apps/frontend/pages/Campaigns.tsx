
import React, { useState } from 'react';
import { Campanha } from '../types';
import { Play, Pause, Plus, Target, Users, Loader2, Search, Zap, Trash2, ArrowRight } from 'lucide-react';
import { runProspectingCampaign } from '../services/prospector';

interface Props {
  campanhas: Campanha[];
  onCreateCampaign: (c: Campanha) => void;
  onAddLeads: (leads: any[], id: string) => void;
  onToggleStatus: (id: string) => void;
  onDeleteCampaign: (id: string) => void;
}

export const Campaigns: React.FC<Props> = ({ 
  campanhas, 
  onToggleStatus,
  onDeleteCampaign 
}) => {
  // Redireciona para o Hunter Agent para criar nova campanha
  const handleCreateClick = () => {
      window.location.hash = '#/hunter';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-[#111827] tracking-tight">Campanhas Ativas</h1>
          <p className="text-[#6B7280] font-medium mt-1">Gerencie suas automações de prospecção e acompanhe resultados.</p>
        </div>
        <button 
          onClick={handleCreateClick}
          className="bg-black hover:bg-gray-900 text-white px-6 py-3 rounded-xl flex items-center font-bold transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 group"
        >
          <Plus size={20} className="mr-2 group-hover:rotate-90 transition-transform" />
          Nova Campanha
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campanhas.map(campanha => (
          <div key={campanha.id} className="bg-white rounded-[1.5rem] border border-gray-200 shadow-card hover:shadow-card-hover transition-all duration-300 relative overflow-hidden group flex flex-col h-full hover:border-brand-200">
            <div className="absolute top-0 right-0 p-4">
                 <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteCampaign(campanha.id); }}
                  className="text-gray-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
            </div>

            <div className="p-6 pb-4 flex-1">
              <div className="mb-4">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  campanha.status === 'RODANDO' 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${campanha.status === 'RODANDO' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></span>
                  {campanha.status}
                </span>
              </div>
              <h3 className="font-black text-[#111827] text-xl mb-1 truncate tracking-tight">{campanha.nome}</h3>
              <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wide flex items-center mt-2">
                <Target size={14} className="mr-1.5 text-brand-500" /> {campanha.nicho}
              </p>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 grid grid-cols-2 gap-4">
               <div>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Leads</p>
                   <div className="flex items-center text-gray-900 font-black text-2xl">
                       <Users size={18} className="mr-2 text-gray-400" /> {campanha.leads_count}
                   </div>
               </div>
               <div>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Criada em</p>
                   <div className="text-gray-900 font-bold text-sm mt-1.5">
                       {new Date(campanha.data_criacao).toLocaleDateString('pt-BR')}
                   </div>
               </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 mt-auto">
              <button 
                onClick={() => onToggleStatus(campanha.id)}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors shadow-sm"
                title={campanha.status === 'RODANDO' ? 'Pausar' : 'Iniciar'}
              >
                {campanha.status === 'RODANDO' ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
              </button>
              <button 
                onClick={() => window.location.hash = `#/campanhas/${campanha.id}`}
                className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2 group/btn"
              >
                Gerenciar Campanha
                <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        ))}
        
        {/* Empty State Card - Invite to create */}
        <div 
            onClick={handleCreateClick}
            className="rounded-[1.5rem] border-2 border-dashed border-gray-200 hover:border-brand-300 hover:bg-brand-50/30 transition-all duration-300 flex flex-col items-center justify-center p-8 cursor-pointer group min-h-[300px]"
        >
            <div className="w-16 h-16 rounded-full bg-gray-50 group-hover:bg-white flex items-center justify-center mb-4 transition-colors shadow-sm group-hover:shadow-md">
                <Plus size={32} className="text-gray-400 group-hover:text-brand-500 transition-colors" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-brand-700 transition-colors">Criar Nova Campanha</h3>
            <p className="text-sm text-gray-500 mt-2 text-center max-w-[200px]">Use o Hunter AI para encontrar leads qualificados automaticamente.</p>
        </div>
      </div>
    </div>
  );
};
