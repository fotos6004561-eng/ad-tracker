import { GoogleGenAI } from "@google/genai";
import { DashboardMetrics, AdEntry, ExtraExpense } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzePerformance = async (
  metrics: DashboardMetrics,
  recentAds: AdEntry[],
  recentExtras: ExtraExpense[]
): Promise<string> => {
  try {
    const prompt = `
      Atue como um analista financeiro sênior especializado em Marketing Digital e Tráfego Pago (Dropshipping/Infoprodutos).
      Analise os dados financeiros abaixo e forneça um resumo executivo em Português do Brasil.
      
      Métricas Gerais:
      - Faturamento Total: R$ ${metrics.totalRevenue.toFixed(2)}
      - Gasto com Anúncios (Tráfego): R$ ${metrics.totalSpend.toFixed(2)}
      - Gastos Extras (Contingência, Domínios, etc): R$ ${metrics.totalExtras.toFixed(2)}
      - Lucro Líquido: R$ ${metrics.netProfit.toFixed(2)}
      - ROAS (Retorno sobre Ad Spend): ${metrics.roas.toFixed(2)}x
      - ROI (Retorno sobre Investimento Total): ${metrics.roi.toFixed(2)}%

      Contexto Recente (Amostra):
      ${JSON.stringify(recentAds.slice(-5))}
      
      Gastos Extras Recentes:
      ${JSON.stringify(recentExtras.slice(-3))}

      Instruções:
      1. Use formatação Markdown.
      2. Seja direto e objetivo.
      3. Identifique se o ROAS está saudável (acima de 2.0 é bom, abaixo de 1.5 é alerta).
      4. Comente sobre o impacto dos gastos extras (BMs, Chargebacks) no lucro final.
      5. Dê uma dica tática baseada nos números.
      6. Use emojis para deixar a leitura agradável.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Não foi possível gerar a análise no momento.";
  } catch (error) {
    console.error("Erro ao chamar Gemini:", error);
    return "Erro ao conectar com a inteligência artificial. Verifique sua chave API.";
  }
};