// Proxy de Curpa → Claude (API de Anthropic).
// Pegar este código en Cloudflare: Workers → ml2proxy → Edit code → Deploy.
// La clave va en Settings → Variables and Secrets → secreto ANTHROPIC_API_KEY (nunca en el código).

const MODELO_POR_DEFECTO = 'claude-haiku-5-5';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...CORS } });
}

// La app manda las imágenes en formato OpenAI (image_url con data URL); Claude las quiere como bloque "image".
function convertirContenido(contenido) {
  if (typeof contenido === 'string') return contenido;
  if (!Array.isArray(contenido)) return String(contenido ?? '');
  return contenido.map(b => {
    if (b && b.type === 'image_url') {
      const url = b.image_url?.url || '';
      const m = url.match(/^data:([^;]+);base64,(.*)$/s);
      if (m) return { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } };
      return { type: 'image', source: { type: 'url', url } };
    }
    if (b && b.type === 'text') return { type: 'text', text: b.text || ' ' };
    return b;
  });
}

// Claude exige que la conversación empiece por "user" y que los turnos se alternen.
function limpiarMensajes(mensajes) {
  const out = [];
  for (const m of mensajes || []) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;
    const c = convertirContenido(m.content);
    if (!out.length && m.role !== 'user') continue;
    const prev = out[out.length - 1];
    if (prev && prev.role === m.role) {
      const a = typeof prev.content === 'string' ? [{ type: 'text', text: prev.content }] : prev.content;
      const b = typeof c === 'string' ? [{ type: 'text', text: c }] : c;
      prev.content = a.concat(b);
    } else {
      out.push({ role: m.role, content: c });
    }
  }
  return out;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method !== 'POST') return json({ error: { type: 'metodo', message: 'Usa POST' } }, 405);
    if (!env.ANTHROPIC_API_KEY) return json({ error: { type: 'config', message: 'Falta el secreto ANTHROPIC_API_KEY en Cloudflare' } }, 500);

    let body;
    try { body = await request.json(); } catch { return json({ error: { type: 'peticion', message: 'JSON no válido' } }, 400); }

    const messages = limpiarMensajes(body.messages);
    if (!messages.length) return json({ error: { type: 'peticion', message: 'No hay mensajes' } }, 400);

    const modelo = typeof body.model === 'string' && body.model.startsWith('claude-') ? body.model : MODELO_POR_DEFECTO;
    const peticion = {
      model: modelo,
      max_tokens: Math.min(Number(body.max_tokens) || 400, 2000),
      messages,
    };
    if (body.system) peticion.system = String(body.system);

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(peticion),
    });
    const data = await r.json().catch(() => ({ error: { type: 'respuesta', message: 'Respuesta no válida de Anthropic' } }));
    return json(data, r.status);
  },
};
