import type { APIRoute } from 'astro';
import { askClaude, errorResponse, json, readText } from '../../lib/claude';

const SYSTEM = `Eres un asistente educativo de IncluAula. Resume el material de clase que te den.
- Escribe en español, en 3 a 7 viñetas con "- ".
- Empieza con una frase que diga de qué trata la clase.
- Conserva los conceptos clave, definiciones y fechas importantes.
- No inventes información que no esté en el texto.`;

export const POST: APIRoute = async ({ request }) => {
  try {
    const texto = await readText(request);
    return json({ resultado: await askClaude(SYSTEM, texto) });
  } catch (err) {
    return errorResponse(err);
  }
};
