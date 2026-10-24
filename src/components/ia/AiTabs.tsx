import { useRef, useState } from 'preact/hooks';
import { postIA } from './api';

type TabId = 'original' | 'resumen' | 'claro' | 'pictos';
interface Pictograma { palabra: string; id: number; imagen: string; alt: string }
interface PictoRes { pictogramas: Pictograma[]; sinPictograma: string[]; atribucion: string }

const TABS: { id: TabId; label: string }[] = [
  { id: 'original', label: 'Original' },
  { id: 'resumen', label: 'Resumen IA' },
  { id: 'claro', label: 'Lenguaje claro' },
  { id: 'pictos', label: 'Pictogramas' },
];

/** Pestañas accesibles (patrón ARIA APG, activación manual) con las vistas generadas por IA. */
export default function AiTabs({ texto }: { texto: string }) {
  const [activa, setActiva] = useState<TabId>('original');
  const [resumen, setResumen] = useState<string>();
  const [claro, setClaro] = useState<string>();
  const [pictos, setPictos] = useState<PictoRes>();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [estado, setEstado] = useState('');
  const abort = useRef<AbortController>();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  async function cargar(id: TabId) {
    if (id === 'original' || (id === 'resumen' && resumen) || (id === 'claro' && claro) || (id === 'pictos' && pictos)) return;
    abort.current?.abort();
    abort.current = new AbortController();
    setError('');
    setCargando(true);
    const nombre = TABS.find((t) => t.id === id)!.label;
    setEstado(`Generando ${nombre}…`);
    try {
      if (id === 'resumen') setResumen((await postIA<{ resultado: string }>('/api/resumir', { texto }, abort.current.signal)).resultado);
      if (id === 'claro') setClaro((await postIA<{ resultado: string }>('/api/lenguaje-claro', { texto }, abort.current.signal)).resultado);
      if (id === 'pictos') setPictos(await postIA<PictoRes>('/api/pictogramas', { texto }, abort.current.signal));
      setEstado(`${nombre} listo.`);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return setEstado('Generación cancelada.');
      setError((e as Error).message);
      setEstado('');
    } finally {
      setCargando(false);
    }
  }

  function seleccionar(id: TabId) {
    setActiva(id);
    cargar(id);
  }

  function onKeyDown(e: KeyboardEvent, i: number) {
    const n = TABS.length;
    const destino = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    tabRefs.current[destino]?.focus();
  }

  const contenido: Record<TabId, string | undefined> = { original: texto, resumen, claro, pictos: undefined };

  return (
    <section class="ai-tabs" aria-label="Versiones accesibles del material">
      <div role="tablist" aria-label="Elegir versión del material">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => { tabRefs.current[i] = el; }}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={activa === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={activa === t.id ? 0 : -1}
            onClick={() => seleccionar(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p class="estado" role="status" aria-live="polite">{estado}</p>
      {cargando && (
        <button type="button" onClick={() => abort.current?.abort()}>Cancelar</button>
      )}
      {error && (
        <div role="alert" class="error">
          <p>{error}</p>
          <button type="button" onClick={() => cargar(activa)}>Reintentar</button>
        </div>
      )}

      {TABS.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`panel-${t.id}`}
          aria-labelledby={`tab-${t.id}`}
          hidden={activa !== t.id}
          tabIndex={0}
          aria-busy={cargando && activa === t.id}
        >
          {t.id !== 'original' && t.id !== 'pictos' && contenido[t.id] && (
            <p class="aviso-ia">Contenido generado por IA. Puede contener errores.</p>
          )}
          {t.id === 'pictos' ? (
            pictos && (
              <>
                <ul class="pictogramas">
                  {pictos.pictogramas.map((p) => (
                    <li key={p.id}>
                      <figure>
                        <img src={p.imagen} alt={p.alt} width={120} height={120} loading="lazy" />
                        <figcaption>{p.palabra}</figcaption>
                      </figure>
                    </li>
                  ))}
                </ul>
                <p class="atribucion"><small>{pictos.atribucion}</small></p>
              </>
            )
          ) : (
            <div class="texto" style={{ whiteSpace: 'pre-wrap' }}>{contenido[t.id]}</div>
          )}
        </div>
      ))}
    </section>
  );
}
