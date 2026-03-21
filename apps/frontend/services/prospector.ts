
import { CONFIG } from '../config';
import { Lead, LeadStatus, AnaliseIA, Mensagem } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { db, auth, fieldValue } from '../firebase';

/**
 * Análise de links via Firecrawl + Gemini 3
 */
const analyzeLinkWithFirecrawlAndAI = async (url: string): Promise<Partial<AnaliseIA>> => {
  try {
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.FIRECRAWL_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true })
    });

    const firecrawlData = await firecrawlResponse.json();
    const markdownContent = firecrawlData.data?.markdown || '';

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        resumo_perfil: { type: Type.STRING },
        pontos_fortes: { type: Type.ARRAY, items: { type: Type.STRING } },
        abordagem: { type: Type.STRING },
        produto: {
            type: Type.OBJECT,
            properties: {
                tipo: { type: Type.STRING },
                nome: { type: Type.STRING },
                descricao: { type: Type.STRING },
                plataforma: { type: Type.STRING }
            },
            required: ["tipo", "nome"]
        }
      },
      required: ["resumo_perfil", "pontos_fortes", "produto", "abordagem"]
    };

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise estrategicamente esta página de vendas: ${markdownContent.slice(0, 15000)}`,
      config: { 
        responseMimeType: "application/json", 
        responseSchema 
      }
    });

    const jsonStr = aiResponse.text || '{}';
    const parsed = JSON.parse(jsonStr.trim());

    return {
      sinais_monetizacao: true,
      plataforma_detectada: (parsed.produto?.plataforma as any) || null,
      resumo: parsed.resumo_perfil,
      pontos_fortes: parsed.pontos_fortes,
      mensagem_personalizada: parsed.abordagem,
      produto_detectado: {
        tipo: parsed.produto?.tipo || 'Outro',
        nome: parsed.produto?.nome || 'Oferta',
        descricao: parsed.produto?.descricao || '',
        url_origem: url,
        confianca_ia: 'Alta'
      }
    };
  } catch (e) {
    console.error("Gemini analysis error:", e);
    return { resumo: "Análise limitada. Verifique o link manualmente." };
  }
};

export const runProspectingCampaign = async (niche: string, campaignId: string, campaignName: string) => {
  const user = auth.currentUser;
  if (!user) return;

  await db.collection("campaigns").doc(campaignId).set({
    nome: campaignName,
    nicho: niche,
    status: 'RODANDO',
    leads_count: 0,
    data_criacao: new Date().toISOString(),
    ownerId: user.uid
  });

  // Simulação de fluxo de varredura (Google -> Apify -> Enriquecimento)
  // ... lógica de varredura implementada nos arquivos anteriores ...
};

export const generateAgentReply = async (history: Mensagem[], leadContext: Lead): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `Você é um SDR de elite da B4You. 
    Contexto do Lead: ${leadContext.nome_display}.
    Destaques: ${leadContext.analise_ia_json.resumo}.
    Oferta atual: ${leadContext.analise_ia_json.produto_detectado?.nome}.
    Objetivo: Marcar call estratégica. 
    Histórico da conversa: ${history.slice(-5).map(m => `${m.remetente}: ${m.conteudo}`).join('\n')}.
    Responda de forma curta, persuasiva e com tom humano.`;
    
    const res = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: prompt 
    });
    
    return res.text || "Vamos agendar uma rápida call para alinhar os próximos passos?";
};
