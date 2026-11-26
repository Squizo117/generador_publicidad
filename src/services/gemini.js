import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

const generationInstructions = {
  anuncio: 'Escribe 3 opciones de anuncio comercial con estructura AIDA (Atención, Interés, Deseo y Acción).',
  facebook: 'Redacta 3 publicaciones para Facebook listas para publicar. Cada una debe incluir gancho, cuerpo, CTA, emojis moderados y hashtags relevantes.',
  slogan: 'Propón 8 frases publicitarias cortas y memorables. Explica brevemente el beneficio o emoción que transmite cada una.',
  nombres: 'Propón 12 nombres variados para el negocio: descriptivos, modernos/pegadizos y con identidad local. Añade una justificación breve para cada nombre.'
};

function contextDetails(input) {
  return [
    `Giro del negocio: ${input.businessType}`,
    `Producto o servicio: ${input.product}`,
    input.channel ? `Canal: ${input.channel}` : null,
    input.tone ? `Tono: ${input.tone}` : null,
    input.location ? `Ubicación o público local: ${input.location}` : null,
    input.additionalDetails ? `Detalles adicionales: ${input.additionalDetails}` : null
  ].filter(Boolean).join('\n');
}

export async function generateMarketingContent(input) {
  const result = await ai.models.generateContent({
    model: config.geminiModels[input.modelTier],
    contents: `${generationInstructions[input.type]}\n\n${contextDetails(input)}`,
    config: {
      temperature: 0.8,
      systemInstruction: 'Eres un asesor creativo de marketing para pequeños negocios. Responde en español claro, práctico y original. No inventes datos del negocio que no se hayan proporcionado.'
    }
  });

  if (!result.text?.trim()) {
    throw new Error('Gemini devolvió una respuesta vacía');
  }

  return result.text.trim();
}

export async function replyToChat(messages, message, modelTier) {
  const contents = [
    ...messages.map((item) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.content }]
    })),
    { role: 'user', parts: [{ text: message }] }
  ];

  const result = await ai.models.generateContent({
    model: config.geminiModels[modelTier],
    contents,
    config: {
      temperature: 0.7,
      systemInstruction: 'Eres un asistente práctico para pequeños negocios locales. Ayuda con promociones, difusión, captación de clientes y marketing. Mantén el contexto de la conversación, responde en español y no inventes datos.'
    }
  });

  if (!result.text?.trim()) {
    throw new Error('Gemini devolvió una respuesta vacía');
  }

  return result.text.trim();
}
