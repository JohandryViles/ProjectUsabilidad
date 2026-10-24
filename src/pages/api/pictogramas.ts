import type { APIRoute } from 'astro';
import { askClaude, errorResponse, json, readText } from '../../lib/claude';

const SYSTEM = `Extrae del texto entre 5 y 12 conceptos clave para representarlos con pictogramas ARASAAC.
Cada concepto debe ser UNA palabra simple en español, en singular y sin artículos (ej.: "agua", "planta", "sol").
Responde solo con las palabras separadas por comas, sin nada más.`;

interface Pictograma {
  palabra: string;
  id: number;
  imagen: string;
  alt: string;
}

async function buscarArasaac(palabra: string): Promise<Pictograma | null> {
  const res = await fetch(
    `https://api.arasaac.org/v1/pictograms/es/bestsearch/${encodeURIComponent(palabra)}`,
  );
  if (!res.ok) return null;
  const [p] = (await res.json()) as { _id: number; keywords?: { keyword: string }[] }[];
  if (!p) return null;
  return {
    palabra,
    id: p._id,
    imagen: `https://static.arasaac.org/pictograms/${p._id}/${p._id}_300.png`,
    alt: `Pictograma: ${p.keywords?.[0]?.keyword ?? palabra}`,
  };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const texto = await readText(request);
    const palabras = [
      ...new Set(
        (await askClaude(SYSTEM, texto))
          .split(',')
          .map((w) => w.trim().toLowerCase())
          .filter(Boolean),
      ),
    ].slice(0, 12);
    const encontrados = await Promise.all(palabras.map((w) => buscarArasaac(w).catch(() => null)));
    return json({
      pictogramas: encontrados.filter(Boolean),
      sinPictograma: palabras.filter((_, i) => !encontrados[i]),
      atribucion: 'Pictogramas: Sergio Palao. Origen: ARASAAC (https://arasaac.org). Licencia CC BY-NC-SA 4.0.',
    });
  } catch (err) {
    return errorResponse(err);
  }
};
