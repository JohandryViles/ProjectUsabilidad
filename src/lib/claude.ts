import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const MODEL = 'claude-opus-5-5';

export type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';

/**
 * Llamada única a Claude. Usa el fallback del servidor ante rechazos por política
 * y devuelve el texto concatenado de la respuesta.
 */
export async function askClaude(
  system: string,
  content: Anthropic.Beta.BetaContentBlockParam[] | string,
): Promise<string> {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system,
    messages: [{ role: 'user', content }],
  });

  if (response.stop_reason === 'refusal') {
    throw new IAError('La IA no pudo procesar este contenido. Revísalo o inténtalo con otro texto.', 422);
  }
  return response.content
    .flatMap((b) => (b.type === 'text' ? [b.text] : []))
    .join('')
    .trim();
}

export class IAError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

/** Respuesta JSON uniforme con mensajes de error en lenguaje claro (Nielsen #9). */
export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function errorResponse(err: unknown) {
  if (err instanceof IAError) return json({ error: err.message }, err.status);
  if (err instanceof Anthropic.RateLimitError) {
    return json({ error: 'Hay muchas solicitudes en este momento. Espera un minuto e inténtalo otra vez.' }, 429);
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return json({ error: 'El servicio de IA no está configurado (falta la clave ANTHROPIC_API_KEY).' }, 503);
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return json({ error: 'No hay conexión con el servicio de IA. Revisa tu internet e inténtalo de nuevo.' }, 503);
  }
  console.error(err);
  return json({ error: 'Ocurrió un error inesperado. Inténtalo de nuevo en unos segundos.' }, 500);
}

export const MAX_TEXT = 50_000;

/** Lee { texto } del cuerpo y valida antes de gastar en la IA (Nielsen #5). */
export async function readText(request: Request): Promise<string> {
  const body = await request.json().catch(() => null);
  const texto = typeof body?.texto === 'string' ? body.texto.trim() : '';
  if (!texto) throw new IAError('Escribe o pega un texto antes de continuar.', 400);
  if (texto.length > MAX_TEXT) {
    throw new IAError(`El texto es muy largo (máximo ${MAX_TEXT.toLocaleString('es')} caracteres). Divídelo en partes.`, 413);
  }
  return texto;
}
