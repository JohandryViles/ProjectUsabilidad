import type { APIRoute } from 'astro';
import { errorResponse, IAError, json } from '../../lib/claude';
import { toVTT, type Segmento } from '../../lib/vtt';

// Límite de la API de Whisper.
const MAX_BYTES = 25 * 1024 * 1024;

export const POST: APIRoute = async ({ request }) => {
  try {
    const key = import.meta.env.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
    if (!key) {
      throw new IAError('La transcripción de archivos no está configurada (falta OPENAI_API_KEY). Usa el dictado en vivo.', 503);
    }
    const form = await request.formData().catch(() => null);
    const archivo = form?.get('audio');
    if (!(archivo instanceof File)) throw new IAError('Selecciona un archivo de audio o video.', 400);
    if (!/^(audio|video)\//.test(archivo.type)) throw new IAError('El archivo debe ser de audio o video.', 415);
    if (archivo.size > MAX_BYTES) {
      throw new IAError('El archivo supera 25 MB. Recórtalo o súbelo en partes.', 413);
    }

    const body = new FormData();
    body.append('file', archivo);
    body.append('model', 'whisper-1');
    body.append('language', 'es');
    body.append('response_format', 'verbose_json');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body,
    });
    if (!res.ok) throw new IAError('No se pudo transcribir el archivo. Verifica que tenga audio claro.', 502);

    const data = (await res.json()) as { text: string; segments?: Segmento[] };
    const segmentos = (data.segments ?? []).map(({ start, end, text }) => ({ start, end, text: text.trim() }));
    return json({ texto: data.text, segmentos, vtt: toVTT(segmentos) });
  } catch (err) {
    return errorResponse(err);
  }
};
