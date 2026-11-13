// Ponte local da Pixelândia LIVE (Node 18+, sem dependências).
//
//   node ponte/ponte.mjs
//
// O jogo se conecta em GET /eventos (Server-Sent Events).
// Qualquer serviço envia eventos com POST /evento (JSON):
//   { "type": "pix" | "donation" | "chat" | "member" | "gift",
//     "user": "id-unico", "name": "Nome exibido", "text": "mensagem",
//     "amount": 10, "currency": "BRL", "source": "pix", "id": "id-opcional" }
//
// Defina PONTE_TOKEN para exigir o cabeçalho "Authorization: Bearer <token>" no POST.
// Para receber webhooks da internet (ex.: LivePix), exponha a porta com um túnel
// (cloudflared, ngrok) e adapte o corpo do webhook ao formato acima em adaptar().
import http from 'node:http';

const PORT = Number(process.env.PONTE_PORT || 8787);
const TOKEN = process.env.PONTE_TOKEN || '';
const clients = new Set();

function adaptar(body) {
  // Ponto único para traduzir payloads de outros serviços.
  // Confira o formato real do webhook do seu provedor antes de usar em produção.
  return body;
}

function broadcast(evt) {
  const data = `data: ${JSON.stringify(evt)}\n\n`;
  for (const res of clients) res.write(data);
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.end();

  if (req.method === 'GET' && req.url === '/eventos') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(': conectado\n\n');
    clients.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { clearInterval(ping); clients.delete(res); });
    return;
  }

  if (req.method === 'POST' && req.url === '/evento') {
    if (TOKEN && req.headers.authorization !== `Bearer ${TOKEN}`) { res.writeHead(401); return res.end('token inválido'); }
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 1e5) req.destroy(); });
    req.on('end', () => {
      try {
        const evt = adaptar(JSON.parse(raw));
        if (!evt || !(evt.user || evt.name)) throw new Error('faltou user/name');
        broadcast(evt);
        console.log(new Date().toLocaleTimeString('pt-BR'), evt.type, evt.name || evt.user, evt.amount ?? '', evt.text ?? '');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, jogos: clients.size }));
      } catch (e) { res.writeHead(400); res.end('JSON inválido: ' + e.message); }
    });
    return;
  }

  res.writeHead(404); res.end('Use GET /eventos ou POST /evento');
});

server.listen(PORT, () => console.log(`Ponte Pixelândia em http://localhost:${PORT} (jogo: /eventos, envio: POST /evento)`));
