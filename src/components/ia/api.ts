/** POST a un endpoint de IA; lanza Error con el mensaje en lenguaje claro del servidor. */
export async function postIA<T>(url: string, body: BodyInit | object, signal?: AbortSignal): Promise<T> {
  const isForm = body instanceof FormData;
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: isForm ? undefined : { 'Content-Type': 'application/json' },
    body: isForm ? body : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Ocurrió un error inesperado.');
  return data as T;
}
