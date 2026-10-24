import { useEffect, useRef, useState } from 'preact/hooks';
import { postIA } from './api';

interface Segmento { start: number; end: number; text: string }
interface Resultado { texto: string; segmentos: Segmento[]; vtt: string }

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * Transcripción de archivos (Whisper) con subtítulos WebVTT y transcripción sincronizada,
 * más dictado en vivo con la Web Speech API del navegador.
 */
export default function Transcriber() {
  const [media, setMedia] = useState<{ url: string; video: boolean }>();
  const [res, setRes] = useState<Resultado>();
  const [vttUrl, setVttUrl] = useState<string>();
  const [actual, setActual] = useState(-1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const player = useRef<HTMLVideoElement & HTMLAudioElement>(null);

  // Dictado en vivo
  const [dictando, setDictando] = useState(false);
  const [dictado, setDictado] = useState('');
  const recog = useRef<any>();
  const SR = typeof window !== 'undefined' ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition : undefined;

  useEffect(() => () => recog.current?.stop(), []);

  async function onSubmit(e: Event) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const file = (form.elements.namedItem('audio') as HTMLInputElement).files?.[0];
    if (!file) return;
    setError('');
    setCargando(true);
    setMedia({ url: URL.createObjectURL(file), video: file.type.startsWith('video/') });
    try {
      const r = await postIA<Resultado>('/api/transcribir', new FormData(form));
      setRes(r);
      setVttUrl(URL.createObjectURL(new Blob([r.vtt], { type: 'text/vtt' })));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }

  function onTime() {
    const t = player.current?.currentTime ?? 0;
    setActual(res?.segmentos.findIndex((s) => t >= s.start && t < s.end) ?? -1);
  }

  function irA(s: Segmento) {
    if (!player.current) return;
    player.current.currentTime = s.start;
    player.current.focus();
  }

  function toggleDictado() {
    if (dictando) return recog.current?.stop();
    const r = new SR();
    r.lang = 'es-ES';
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (ev: any) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) setDictado((d) => `${d}${ev.results[i][0].transcript.trim()} `);
      }
    };
    r.onerror = (ev: any) => setError(ev.error === 'not-allowed' ? 'Permite el uso del micrófono para dictar.' : 'El dictado se detuvo. Inténtalo de nuevo.');
    r.onend = () => setDictando(false);
    recog.current = r;
    r.start();
    setDictando(true);
  }

  const Player = media?.video ? 'video' : 'audio';

  return (
    <section aria-labelledby="tr-titulo">
      <h2 id="tr-titulo">Transcripción y subtítulos</h2>

      <form onSubmit={onSubmit} aria-busy={cargando}>
        <label for="tr-audio">Archivo de audio o video (máximo 25 MB)</label>
        <input id="tr-audio" name="audio" type="file" accept="audio/*,video/*" required />
        <button type="submit" disabled={cargando}>{cargando ? 'Transcribiendo…' : 'Transcribir'}</button>
      </form>
      <p role="status" aria-live="polite">
        {cargando ? 'Transcribiendo, esto puede tardar unos minutos…' : res ? `Transcripción lista: ${res.segmentos.length} fragmentos.` : ''}
      </p>
      {error && <p role="alert" class="error">{error}</p>}

      {media && (
        <Player ref={player} src={media.url} controls preload="metadata" onTimeUpdate={onTime} style={{ maxWidth: '100%' }}>
          {vttUrl && <track kind="captions" src={vttUrl} srclang="es" label="Español" default />}
        </Player>
      )}

      {res && (
        <>
          <h3>Transcripción</h3>
          <p><small>Activa un fragmento para ir a ese momento.</small></p>
          <ol class="transcripcion">
            {res.segmentos.map((s, i) => (
              <li key={i} aria-current={i === actual ? 'true' : undefined}>
                <button type="button" class="segmento" onClick={() => irA(s)}>
                  <span class="tiempo">{mmss(s.start)}</span> {s.text}
                </button>
              </li>
            ))}
          </ol>
          <a href={vttUrl} download="subtitulos.vtt">Descargar subtítulos (.vtt)</a>
        </>
      )}

      <h3>Dictado en vivo</h3>
      {SR ? (
        <>
          <button type="button" aria-pressed={dictando} onClick={toggleDictado}>
            {dictando ? 'Detener dictado' : 'Empezar dictado'}
          </button>
          <label for="tr-dictado">Texto dictado</label>
          <textarea id="tr-dictado" rows={5} value={dictado} aria-live="polite"
            onInput={(e) => setDictado((e.currentTarget as HTMLTextAreaElement).value)} />
        </>
      ) : (
        <p>Tu navegador no permite el dictado por voz. Prueba con Chrome o Edge.</p>
      )}
    </section>
  );
}
