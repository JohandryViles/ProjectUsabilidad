import type { APIRoute } from 'astro';
import { askClaude, errorResponse, IAError, json, type ImageMediaType } from '../../lib/claude';

const TIPOS: ImageMediaType[] = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

const SYSTEM = `Generas descripciones de imágenes para materiales educativos accesibles (WCAG 1.1.1).
Responde SOLO un JSON con esta forma:
{"alt": "texto alternativo breve, máximo 125 caracteres, sin empezar con 'Imagen de'",
 "descripcionLarga": "descripción detallada para personas ciegas; si es un gráfico o diagrama explica datos y relaciones; vacío si no hace falta",
 "decorativa": false}
Escribe en español. Si la imagen contiene texto, transcríbelo en la descripción larga.`;

export const POST: APIRoute = async ({ request }) => {
  try {
    const form = await request.formData().catch(() => null);
    const archivo = form?.get('imagen');
    const contexto = String(form?.get('contexto') ?? '').slice(0, 2000);

    if (!(archivo instanceof File)) throw new IAError('Selecciona una imagen para describir.', 400);
    if (!TIPOS.includes(archivo.type as ImageMediaType)) {
      throw new IAError('Formato no admitido. Usa PNG, JPG, GIF o WEBP.', 415);
    }
    if (archivo.size > MAX_BYTES) throw new IAError('La imagen supera 5 MB. Redúcela e inténtalo de nuevo.', 413);

    const data = Buffer.from(await archivo.arrayBuffer()).toString('base64');
    const texto = await askClaude(SYSTEM, [
      { type: 'image', source: { type: 'base64', media_type: archivo.type as ImageMediaType, data } },
      { type: 'text', text: contexto ? `Contexto de la clase: ${contexto}` : 'Describe la imagen.' },
    ]);

    const match = texto.match(/\{[\s\S]*\}/);
    if (!match) throw new IAError('La IA no devolvió una descripción válida. Inténtalo de nuevo.', 502);
    // Es una sugerencia: el docente debe revisarla y aprobarla antes de publicarla.
    return json({ ...JSON.parse(match[0]), sugerida: true });
  } catch (err) {
    return errorResponse(err);
  }
};
