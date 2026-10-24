export interface Segmento {
  start: number; // segundos
  end: number;
  text: string;
}

function tiempo(s: number): string {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const sec = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(h)}:${pad(m)}:${pad(sec)}.${pad(ms % 1000, 3)}`;
}

/** Convierte segmentos de transcripción en subtítulos WebVTT para <track kind="captions">. */
export function toVTT(segmentos: Segmento[]): string {
  const cues = segmentos.map(
    (s, i) => `${i + 1}\n${tiempo(s.start)} --> ${tiempo(s.end)}\n${s.text.trim()}`,
  );
  return `WEBVTT\n\n${cues.join('\n\n')}\n`;
}
