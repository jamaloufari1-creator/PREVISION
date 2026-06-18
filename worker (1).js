export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://jamaloufari1-creator.github.io',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json();
      const systemMsg = body.system || '';
      const messages = body.messages || [];

      // Construir contents para Gemini
      const contents = [];

      // Si hay system, añadirlo como primer mensaje de usuario
      if (systemMsg) {
        contents.push({ role: 'user', parts: [{ text: '[INSTRUCCIONES DEL SISTEMA]: ' + systemMsg }] });
        contents.push({ role: 'model', parts: [{ text: 'Entendido, seguiré esas instrucciones.' }] });
      }

      // Añadir mensajes del historial
      for (const m of messages) {
        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        });
      }

      const geminiBody = {
        contents,
        generationConfig: {
          maxOutputTokens: body.max_tokens || 1000,
          temperature: 0.7
        }
      };

      const model = 'gemini-2.0-flash';
      const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + env.GEMINI_API_KEY;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      });

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta';

      const result = {
        content: [{ type: 'text', text }],
        usage: { input_tokens: 0, output_tokens: 0 }
      };

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },
};
