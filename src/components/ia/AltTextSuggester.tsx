import { useState } from 'preact/hooks';
import { postIA } from './api';

interface Sugerencia { alt: string; descripcionLarga: string; decorativa: boolean }

/** El docente sube una imagen, la IA sugiere el texto alternativo y el docente lo revisa y aprueba. */
export default function AltTextSuggester({ onAprobar }: { onAprobar?: (s: Sugerencia) => void }) {
  const [preview, setPreview] = useState<string>();
  const [sug, setSug] = useState<Sugerencia>();
  const [aprobada, setAprobada] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: Event) {
    e.preventDefault();
    setError('');
    setAprobada(false);
    setCargando(true);
    try {
      setSug(await postIA<Sugerencia>('/api/alt-imagen', new FormData(e.currentTarget as HTMLFormElement)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }

  function onFile(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    setPreview(f ? URL.createObjectURL(f) : undefined);
    setSug(undefined);
  }

  return (
    <section aria-labelledby="alt-titulo">
      <h2 id="alt-titulo">Describir imagen con IA</h2>
      <form onSubmit={onSubmit} aria-busy={cargando}>
        <label for="alt-imagen">Imagen (PNG, JPG, GIF o WEBP, máximo 5 MB)</label>
        <input id="alt-imagen" name="imagen" type="file" accept="image/png,image/jpeg,image/gif,image/webp" required onChange={onFile} />

        <label for="alt-contexto">Contexto de la clase (opcional)</label>
        <input id="alt-contexto" name="contexto" type="text" placeholder="Ej.: Biología, la fotosíntesis" />

        <button type="submit" disabled={cargando}>{cargando ? 'Analizando imagen…' : 'Sugerir descripción'}</button>
      </form>

      <p role="status" aria-live="polite">{cargando ? 'Analizando imagen…' : sug ? 'Sugerencia lista. Revísala antes de aprobar.' : ''}</p>
      {error && <p role="alert" class="error">{error}</p>}

      {preview && <img src={preview} alt={sug?.alt ?? 'Vista previa de la imagen seleccionada'} style={{ maxWidth: '320px' }} />}

      {sug && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setAprobada(true);
            onAprobar?.(sug);
          }}
        >
          <p class="aviso-ia">Sugerencia generada por IA: revisa y corrige antes de aprobar.</p>
          <label for="alt-texto">Texto alternativo (máximo 125 caracteres)</label>
          <input id="alt-texto" maxLength={125} value={sug.alt} aria-describedby="alt-contador"
            onInput={(e) => setSug({ ...sug, alt: (e.currentTarget as HTMLInputElement).value })} />
          <p id="alt-contador"><small>{sug.alt.length} de 125 caracteres</small></p>

          <label for="alt-larga">Descripción larga</label>
          <textarea id="alt-larga" rows={5} value={sug.descripcionLarga}
            onInput={(e) => setSug({ ...sug, descripcionLarga: (e.currentTarget as HTMLTextAreaElement).value })} />

          <label>
            <input type="checkbox" checked={sug.decorativa}
              onChange={(e) => setSug({ ...sug, decorativa: (e.currentTarget as HTMLInputElement).checked })} />
            {' '}La imagen es decorativa (el lector de pantalla la omitirá)
          </label>

          <button type="submit">Aprobar descripción</button>
          {aprobada && <p role="status">Descripción aprobada.</p>}
        </form>
      )}
    </section>
  );
}
