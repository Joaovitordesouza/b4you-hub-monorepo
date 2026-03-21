
import React from 'react';
import { Download, FolderInput, ToggleRight, Puzzle, Key, Database, ArrowRight, ExternalLink, Chrome, CheckCircle, Copy, AlertCircle, FileArchive, Flag } from 'lucide-react';

interface StepCardProps {
  number: number;
  title: string;
  children: React.ReactNode;
  icon: any;
  isLast?: boolean;
}

const StepCard: React.FC<StepCardProps> = ({ number, title, children, icon: Icon, isLast }) => (
  <div className="relative flex gap-6 group">
    {/* Timeline Visuals (Desktop) */}
    <div className="hidden md:flex flex-col items-center">
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center font-bold text-2xl border-4 transition-all duration-300 z-10 relative bg-white
            ${number === 1 ? 'border-brand-100 text-brand-600 shadow-brand-100' : 'border-gray-100 text-[#9CA3AF] group-hover:border-brand-100 group-hover:text-brand-500'}
            shadow-card
        `}>
           <Icon size={32} strokeWidth={1.5} />
           <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-md border-2 border-white
             ${number === 1 ? 'bg-[#111827] text-white' : 'bg-gray-100 text-[#6B7280] group-hover:bg-[#111827] group-hover:text-white transition-colors'}
           `}>
               {number}
           </div>
        </div>
        {!isLast && <div className="flex-1 w-0.5 bg-gray-200 my-2 group-hover:bg-brand-200 transition-colors"></div>}
    </div>

    {/* Content Card */}
    <div className="flex-1 pb-12">
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#E5E7EB] shadow-card group-hover:shadow-card-hover group-hover:border-brand-200 transition-all duration-300 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-bl-[100px] -z-0 opacity-50 group-hover:bg-brand-50 transition-colors"></div>
            
            <div className="relative z-10">
                <h3 className="text-2xl font-bold text-[#111827] mb-5 flex items-center">
                    {title}
                </h3>
                <div className="text-[#374151] text-[1.05rem] leading-8 font-medium space-y-5">
                    {children}
                </div>
            </div>
        </div>
    </div>
  </div>
);

export const HelpScreen: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto pb-24 animate-in fade-in duration-700">
      
      {/* Header Section */}
      <div className="text-center space-y-6 mb-16 pt-8">
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-50 text-blue-800 text-xs font-bold uppercase tracking-widest border border-blue-200">
            <Flag size={12} className="mr-2" /> Central de Suporte
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-[#111827] tracking-tight">
          Jornada de Configuração
        </h1>
        <p className="text-[#374151] text-xl max-w-2xl mx-auto font-medium leading-relaxed">
          Siga o guia passo a passo para conectar sua conta Kiwify com segurança máxima e iniciar a sincronização.
        </p>
      </div>

      {/* Hero Action: Download (Passo 0/Start) */}
      <div className="relative z-20 mb-16">
          <div className="bg-[#111827] rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden group border border-gray-800">
            {/* Efeitos de Fundo */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-600/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 group-hover:bg-brand-500/30 transition-colors duration-1000"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4"></div>

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="space-y-6 text-center md:text-left max-w-xl">
                    <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-brand-600 text-white text-xs font-bold uppercase tracking-wider border border-brand-500 shadow-lg shadow-brand-900/20">
                        <Puzzle size={14} className="mr-2" /> Passo Obrigatório
                    </div>
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black text-white leading-tight mb-2">
                            Baixe a Extensão B4You
                        </h2>
                        <p className="text-gray-300 text-lg leading-relaxed font-medium">
                            Nossa ferramenta exclusiva gera o token de acesso seguro sem expor suas credenciais de login.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm font-medium text-gray-400">
                        <span className="flex items-center"><CheckCircle size={14} className="mr-1.5 text-green-500"/> Arquivo Seguro</span>
                        <span className="flex items-center"><CheckCircle size={14} className="mr-1.5 text-green-500"/> Leve (2MB)</span>
                        <span className="flex items-center"><CheckCircle size={14} className="mr-1.5 text-green-500"/> Versão 6.0</span>
                    </div>
                </div>

                <a 
                    href="https://storage.googleapis.com/bluue/B4you-kiwify-extension.rar" 
                    className="relative overflow-hidden bg-white text-[#111827] hover:text-brand-700 px-10 py-5 rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:shadow-white/20 transition-all transform hover:-translate-y-1 flex items-center gap-4 group/btn min-w-[240px] justify-center"
                >
                    <div className="absolute inset-0 bg-brand-50 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                    <Download size={24} className="group-hover/btn:scale-110 transition-transform relative z-10" />
                    <span className="relative z-10">Baixar Agora</span>
                </a>
            </div>
          </div>
          
          {/* Conector Visual para o Primeiro Card */}
          <div className="hidden md:block absolute left-[80px] -bottom-16 w-0.5 h-16 bg-gradient-to-b from-[#111827] to-gray-200"></div>
      </div>

      {/* Timeline Steps */}
      <div className="max-w-4xl mx-auto">
         
         <StepCard number={1} title="Prepare o Arquivo" icon={FileArchive}>
             <p>Após o download, localize o arquivo <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-900 font-bold text-sm border border-gray-200 mx-1">B4you-kiwify-extension.rar</span> na sua pasta de Downloads.</p>
             <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100 flex gap-4 mt-2 shadow-sm">
                 <div className="mt-1 bg-orange-100 p-1.5 rounded-lg text-orange-700 h-fit">
                    <AlertCircle size={20} />
                 </div>
                 <div>
                     <h4 className="font-bold text-orange-900 text-base">Ação Necessária</h4>
                     <p className="text-orange-800 text-base mt-1 leading-snug">
                         Clique com o botão direito no arquivo e selecione <strong>"Extrair Aqui"</strong> (Extract Here). Você precisará da pasta descompactada para o próximo passo.
                     </p>
                 </div>
             </div>
         </StepCard>

         <StepCard number={2} title="Instale no Chrome" icon={Chrome}>
             <p className="mb-4">Abra seu navegador e digite o endereço abaixo na barra de URL:</p>
             <div className="bg-[#111827] text-gray-200 p-4 rounded-xl font-mono text-base flex items-center justify-between mb-6 shadow-inner border border-gray-700">
                 <span className="tracking-wide">chrome://extensions</span>
                 <div title="Copiar" className="cursor-pointer hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all">
                    <Copy size={18} />
                 </div>
             </div>
             
             <div className="space-y-4">
                 <div className="flex items-start gap-4">
                     <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5 border border-brand-200">A</div>
                     <p className="text-base text-[#111827] font-medium">No canto superior direito, ative a chave <span className="font-bold text-black inline-flex items-center bg-gray-100 px-2 py-0.5 rounded mx-1"><ToggleRight size={18} className="mr-1.5 text-brand-600"/> Modo do desenvolvedor</span>.</p>
                 </div>
                 <div className="flex items-start gap-4">
                     <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5 border border-brand-200">B</div>
                     <p className="text-base text-[#111827] font-medium">Clique no botão <span className="inline-flex items-center px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-bold text-[#1F2937] mx-1"><FolderInput size={14} className="mr-1.5"/> Carregar sem compactação</span>.</p>
                 </div>
                 <div className="flex items-start gap-4">
                     <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5 border border-brand-200">C</div>
                     <p className="text-base text-[#111827] font-medium">Selecione a <strong>pasta</strong> que você extraiu no Passo 1.</p>
                 </div>
             </div>
         </StepCard>

         <StepCard number={3} title="Gere seu Token" icon={Key}>
             <p>Com a extensão ativa, o ícone da B4You aparecerá na sua barra do navegador.</p>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                 <a href="https://dashboard.kiwify.com/" target="_blank" className="flex flex-col items-center justify-center gap-2 p-6 bg-blue-50 text-blue-800 rounded-2xl font-bold hover:bg-blue-100 hover:scale-[1.02] transition-all border border-blue-200 shadow-sm group/link">
                     <ExternalLink size={24} className="mb-1 group-hover/link:rotate-12 transition-transform" />
                     1. Abrir Kiwify
                     <span className="text-xs font-medium text-blue-600 opacity-90">Faça login na sua conta</span>
                 </a>
                 <div className="flex flex-col items-center justify-center gap-2 p-6 bg-gray-50 text-gray-800 rounded-2xl font-bold border border-gray-200">
                     <Puzzle size={24} className="mb-1 text-gray-500" />
                     2. Abrir Extensão
                     <span className="text-xs font-medium text-gray-500">Clique no ícone B4You</span>
                 </div>
             </div>
             <div className="mt-4 p-5 bg-green-50 rounded-xl border border-green-200 text-green-900 text-center font-bold text-lg flex items-center justify-center gap-2 shadow-sm">
                 <Copy size={20} className="text-green-700" />
                 Clique em "Copiar Token" na extensão.
             </div>
         </StepCard>

         <StepCard number={4} title="Finalize a Conexão" icon={Database} isLast={true}>
             <p>Volte para o B4You Hub e acesse o menu <strong>"Migrar Cursos"</strong>.</p>
             <div className="mt-6 bg-gray-50 rounded-2xl p-6 border border-dashed border-gray-300 text-center">
                 <h4 className="font-bold text-[#111827] mb-4 text-lg">Resumo da Ação Final</h4>
                 <div className="flex flex-col md:flex-row items-center justify-center gap-3 text-base font-medium text-[#374151]">
                     <span className="px-4 py-2 bg-white rounded-xl border border-gray-200 shadow-sm">Nova Conexão</span>
                     <ArrowRight size={18} className="text-[#9CA3AF] rotate-90 md:rotate-0" />
                     <span className="px-4 py-2 bg-white rounded-xl border border-gray-200 shadow-sm">Colar Token</span>
                     <ArrowRight size={18} className="text-[#9CA3AF] rotate-90 md:rotate-0" />
                     <span className="px-4 py-2 bg-brand-100 text-brand-800 font-bold rounded-xl border border-brand-200 shadow-sm">Sincronizar</span>
                 </div>
             </div>
             
             <div className="mt-8">
                 <button 
                    onClick={() => window.location.hash = '#/kiwify-download'}
                    className="w-full group flex items-center justify-center gap-3 bg-[#111827] text-white px-8 py-5 rounded-2xl font-bold text-xl hover:bg-black hover:shadow-xl hover:shadow-brand-900/20 transition-all transform hover:-translate-y-1"
                 >
                     Ir para Migração
                     <div className="bg-white/20 p-2 rounded-full group-hover:translate-x-1 transition-transform">
                        <ArrowRight size={20} />
                     </div>
                 </button>
             </div>
         </StepCard>

      </div>
    </div>
  );
};
