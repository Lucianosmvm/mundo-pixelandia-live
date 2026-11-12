const MAX_TEXT = 1200;
const DELIVERY_TAGS = new Set(['warmly', 'curious', 'excited', 'playful', 'thoughtful', 'whispers', 'anxious', 'peaceful', 'surprised']);

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    if (origin !== env.STUDIO_ORIGIN) return new Response(null, {status: 403});
    const headers = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Cache-Control': 'no-store',
      'Vary': 'Origin',
    };
    const reply = (message, status) => Response.json({message}, {status, headers});
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers});
    if (request.method !== 'POST') return reply('Método não permitido.', 405);
    if (!env.STUDIO_TOKEN || !env.ELEVENLABS_API_KEY || !env.ELEVENLABS_VOICE_ID) {
      return reply('Serviço de narração ainda não configurado.', 503);
    }
    if (request.headers.get('Authorization') !== 'Bearer ' + env.STUDIO_TOKEN) {
      return reply('Código de acesso inválido.', 401);
    }
    let text, delivery;
    try {
      const raw = await request.text();
      if (raw.length > 6000) return reply('O texto excede o limite.', 413);
      const body = JSON.parse(raw);
      text = typeof body?.text === 'string' ? body.text.trim() : '';
      delivery = DELIVERY_TAGS.has(body?.delivery) ? body.delivery : '';
    } catch {
      return reply('Não foi possível ler o texto.', 400);
    }
    if (!text || text.length > MAX_TEXT) return reply('Informe até 1200 caracteres por card.', 400);
    try {
      const voice = encodeURIComponent(env.ELEVENLABS_VOICE_ID);
      const audio = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voice + '?output_format=mp3_44100_128', {
        method: 'POST',
        headers: {
          'xi-api-key': env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({text: delivery ? '[' + delivery + '] ' + text : text, model_id: 'eleven_v4', language_code: 'pt'}),
        signal: AbortSignal.timeout(30000),
      });
      if (audio.status === 429) return reply('O ElevenLabs atingiu o limite de solicitações. Tente novamente em instantes.', 429);
      if (!audio.ok) return reply('O ElevenLabs recusou a geração. Confira a chave, a voz e os créditos do serviço.', 502);
      return new Response(audio.body, {headers: {...headers, 'Content-Type': 'audio/mpeg'}});
    } catch {
      return reply('Não foi possível conectar ao ElevenLabs.', 502);
    }
  },
};
