// Servidor de avisos de PREVISION (Cloudflare Worker "ml2-push").
// OneSignal no deja enviar notificaciones desde el navegador, así que la app le pide aquí el envío
// y este worker lo reenvía a OneSignal con la clave guardada como secreto OS_KEY (nunca en la web).
const APP_ID = '0d7a9b0a-edbc-45cc-a5e1-67226579807d';
const ORIGEN = 'https://jamaloufari1-creator.github.io';
// Solo se reenvían estos campos: el que llama no puede cambiar la app ni usar opciones raras
const CAMPOS = ['target_channel', 'headings', 'contents', 'url', 'chrome_web_icon', 'chrome_web_badge',
  'firefox_icon', 'priority', 'ttl', 'send_after', 'included_segments', 'filters', 'include_subscription_ids'];

function cors(origen) {
  return {
    'Access-Control-Allow-Origin': origen === ORIGEN ? ORIGEN : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

export default {
  async fetch(req, env) {
    const origen = req.headers.get('Origin') || '';
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origen) });
    const json = (obj, status) => new Response(JSON.stringify(obj), {
      status, headers: { ...cors(origen), 'Content-Type': 'application/json; charset=utf-8' }
    });
    if (req.method !== 'POST') return json({ ok: true, servicio: 'ml2-push' }, 200);
    if (origen !== ORIGEN) return json({ errors: ['origen no permitido'] }, 403);
    if (!env.OS_KEY) return json({ errors: ['falta el secreto OS_KEY en Cloudflare'] }, 500);
    let datos;
    try { datos = await req.json(); } catch (e) { return json({ errors: ['JSON no válido'] }, 400); }
    const cuerpo = { app_id: APP_ID };
    for (const k of CAMPOS) if (datos[k] !== undefined) cuerpo[k] = datos[k];
    const r = await fetch('https://api.onesignal.com/notifications?c=push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Authorization': 'Key ' + env.OS_KEY },
      body: JSON.stringify(cuerpo)
    });
    const texto = await r.text();
    return new Response(texto, { status: r.status, headers: { ...cors(origen), 'Content-Type': 'application/json; charset=utf-8' } });
  }
};
