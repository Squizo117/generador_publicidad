import OpenAI from 'openai';
import { config } from '../config/env.js';

let client;

const imageStyles = {
  fotografia: 'fotografía publicitaria profesional, iluminación cuidada y aspecto natural',
  ilustracion: 'ilustración comercial original, colorida y con estilo contemporáneo',
  editorial: 'dirección de arte editorial, composición elegante y estética de marca'
};

const imageSizes = {
  cuadrado: '1024x1024',
  horizontal: '1536x1024',
  vertical: '1024x1536'
};

export function buildImagePrompt(input) {
  const orientation = {
    cuadrado: 'formato cuadrado para redes sociales',
    horizontal: 'formato horizontal para portada o publicación',
    vertical: 'formato vertical para historias o reels'
  }[input.size];

  return [
    `Crea una imagen publicitaria original para un negocio de ${input.businessType}.`,
    `Producto o servicio: ${input.product}.`,
    `Dirección visual: ${imageStyles[input.style]}.`,
    `Composición: ${orientation}; presenta el producto claramente como protagonista, con fondo atractivo y espacio visual limpio.`,
    'No incluyas texto, letras, logotipos, precios, marcas de agua ni elementos gráficos que parezcan texto.'
  ].join(' ');
}

export async function generateImage(input) {
  if (!config.OPENAI_API_KEY) {
    const error = new Error('Configura OPENAI_API_KEY en el servidor para generar imágenes.');
    error.status = 503;
    throw error;
  }

  client ??= new OpenAI({ apiKey: config.OPENAI_API_KEY });

  const result = await client.images.generate({
    model: config.OPENAI_IMAGE_MODEL,
    prompt: buildImagePrompt(input),
    size: imageSizes[input.size],
    quality: 'medium',
    n: 1
  });

  const image = result.data?.[0]?.b64_json;
  if (!image) {
    throw new Error('OpenAI no devolvió una imagen. Intenta de nuevo.');
  }

  return {
    image: `data:image/png;base64,${image}`,
    size: imageSizes[input.size]
  };
}
