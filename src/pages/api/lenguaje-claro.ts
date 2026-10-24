import type { APIRoute } from 'astro';
import { askClaude, errorResponse, json, readText } from '../../lib/claude';

const SYSTEM = `Reescribe el texto en lenguaje claro / lectura fácil para estudiantes con discapacidad cognitiva o dificultades de aprendizaje.
Reglas:
- Frases cortas (máximo 15 palabras), una idea por frase.
- Palabras de uso común; si una palabra técnica es necesaria, explícala entre paréntesis la primera vez.
- Voz activa, sin metáforas ni dobles negaciones.
- Usa títulos cortos con "## " y listas con "- " cuando ayuden.
- Mantén todo el contenido importante; no agregues información nueva.
Responde solo con el texto reescrito.`;

export const POST: APIRoute = async ({ request }) => {
  try {
    const texto = await readText(request);
    return json({ resultado: await askClaude(SYSTEM, texto) });
  } catch (err) {
    return errorResponse(err);
  }
};
