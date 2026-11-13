// Mundo Pixelândia LIVE — motor do jogo controlado pelo chat.
// Carregado depois do script principal: usa as funções e o estado globais da vila.
'use strict';

// ================== CONFIGURAÇÃO ==================
const LIVE_CFG_KEY = 'pixelandia-live-config-v1';
const LIVE_CFG = Object.assign({
  ytKey: '', ytVideo: '', bridgeUrl: 'http://localhost:8787/eventos',
  auto: true, vitrine: true, voteMin: 4, dilemaMin: 7, chalMin: 6, voteSec: 75,
}, (() => { try { return JSON.parse(localStorage.getItem(LIVE_CFG_KEY) || '{}'); } catch (e) { return {}; } })());
function liveSaveCfg() { try { localStorage.setItem(LIVE_CFG_KEY, JSON.stringify(LIVE_CFG)); } catch (e) {} }

// ================== ERAS ==================
// Cada era libera profissões e obras. O chat precisa cumprir os requisitos para avançar.
const ERAS = [
  { name: 'Acampamento', icon: '🔥',
    profs: ['lenhador', 'pedreiro', 'fazendeiro', 'minerador'],
    blds: ['casa', 'serraria', 'celeiro', 'poco'],
    need: { pop: 5, built: 3, has: ['serraria'] } },
  { name: 'Aldeia', icon: '🛖',
    profs: ['pescador', 'cacador', 'cozinheiro', 'pecuarista', 'jardineiro', 'musico'],
    blds: ['peixaria', 'cabana', 'restaurante', 'curral', 'parque', 'fonte', 'taverna'],
    need: { pop: 12, built: 9, has: ['restaurante'] } },
  { name: 'Vila', icon: '🏘️',
    profs: ['padeiro', 'ferreiro', 'comerciante', 'carteiro', 'policial', 'medico', 'professor', 'prefeito'],
    blds: ['padaria', 'ferraria', 'mercado', 'correio', 'delegacia', 'clinica', 'escola', 'prefeitura', 'sobrado', 'capela', 'biblioteca', 'estatua'],
    need: { pop: 25, built: 20, has: ['prefeitura', 'escola'] } },
  { name: 'Cidade', icon: '🏙️',
    profs: ['bombeiro', 'enfermeiro', 'marinheiro', 'maquinista'],
    blds: ['quartel', 'hospital', 'banco', 'hotel', 'teatro', 'cais', 'estacao', 'predio', 'farol', 'rodagigante'],
    need: { pop: 50, built: 35, has: ['hospital', 'estacao'] } },
  { name: 'Metrópole', icon: '🚀',
    profs: ['piloto', 'polissonografista'],
    blds: ['estadio', 'castelo', 'aeroporto', 'foguete'],
    need: null },
];
function eraUnlocked(kind) { const out = []; for (let i = 0; i <= L().era; i++) out.push(...ERAS[i][kind]); return out; }
function eraOfProf(p) { return ERAS.findIndex(e => e.profs.includes(p)); }

// ================== DILEMAS E DESAFIOS ==================
const DILEMAS = [
  { t: '🧳 Um mercador viajante quer 30 🪵 por 6 ferramentas',
    a: ['Trocar', () => { if (res.wood < 30) return 'Faltou madeira… o mercador foi embora 😕'; res.wood -= 30; res.tools += 6; return '+6 🔧 ferramentas: todo mundo trabalha mais rápido!'; }],
    b: ['Recusar', () => { res.coins += 5; return 'Ele deixou 5 🪙 de gorjeta pela hospitalidade'; }] },
  { t: '⛈️ Nuvens pretas no horizonte!',
    a: ['Proteger a horta', () => { startEvent('rain'); res.crops += 12; return 'A chuva veio e a horta rendeu +12 🥕'; }],
    b: ['Cortar árvores antes da chuva', () => { startEvent('rain'); res.wood += 25; return 'Correria! +25 🪵 antes do temporal'; }] },
  { t: '🚶 Uma família de viajantes pede abrigo',
    a: ['Acolher', () => { liveGuest(); liveGuest(); return 'Dois novos vizinhos chegaram à vila ❤️'; }],
    b: ['Seguir viagem', () => { res.coins += 10; return 'Pagaram 10 🪙 pelo pedágio e seguiram'; }] },
  { t: '🎉 O pessoal está cansado. E agora?',
    a: ['Festa na praça', () => { startEvent('party'); return 'Fogos e dança: a vila ficou mais feliz!'; }],
    b: ['Mutirão de trabalho', () => { for (const n of npcs) n.boost = 90; return '⚡ Todos trabalham 60% mais rápido por um tempo'; }] },
  { t: '🐔 As galinhas do vizinho fugiram!',
    a: ['Caçar as galinhas', () => { startEvent('chickens'); return 'Quem pegar mais vira campeão!'; }],
    b: ['Deixar pra lá', () => { res.crops = Math.max(0, res.crops - 8); return 'Elas comeram 8 🥕 da horta…'; }] },
  { t: '🛸 Luzes estranhas no céu esta noite…',
    a: ['Investigar', () => { startEvent('ufo'); return 'Ninguém estava preparado para isso 👽'; }],
    b: ['Acender mais fogueiras', () => { res.wood = Math.max(0, res.wood - 10); res.stone += 6; return 'Gastaram 10 🪵, mas acharam 6 🪨 brilhantes'; }] },
  { t: '💎 Encontraram um veio de pedra rara',
    a: ['Minerar tudo', () => { res.stone += 30; return '+30 🪨 para as próximas obras'; }],
    b: ['Preservar a natureza', () => { res.coins += 8; for (const n of npcs) n.boost = Math.max(n.boost || 0, 40); return 'Turistas vieram ver: +8 🪙 e ânimo geral'; }] },
];

// Moradores dormem à noite: desafio de coleta só se ainda houver dia pela frente.
function dayLeft() { return !isNight() && hour() < 15.5; }
const CHALLENGES = {
  madeira: { icon: '🪵', min: 4, title: n => `Juntar ${n} de madeira`, target: () => 30 + npcs.length * 4, track: 'wood', ok: () => npcs.length >= 1 && dayLeft() },
  pedra: { icon: '🪨', min: 4, title: n => `Juntar ${n} de pedra`, target: () => 15 + npcs.length * 2, track: 'stone', ok: () => (hasProf('minerador') || hasProf('pedreiro')) && dayLeft() },
  mutirao: { icon: '💪', min: 2, title: n => `Mutirão: ${n}× !ajudar no chat`, target: () => 10 + Math.min(40, Object.keys(L().viewers).length), track: 'help', ok: () => true },
  boasvindas: { icon: '👋', min: 5, title: n => `Receber ${n} novos moradores`, target: () => 3, track: 'arrive', ok: () => true },
  hype: { icon: '💬', min: 3, title: n => `${n} mensagens no chat`, target: () => 25 + Math.min(75, Object.keys(L().viewers).length * 2), track: 'msg', ok: () => true },
};

const DONATION_EVENTS = { festa: 'party', chuva: 'rain', neve: 'snow', galinhas: 'chickens', ovni: 'ufo' };
const RATES = { BRL: 1, USD: 5.5, EUR: 6, GBP: 7, ARS: 0.006, MXN: 0.3, CLP: 0.006, COP: 0.0014, PEN: 1.5, UYU: 0.14, BOB: 0.8, PYG: 0.0007,
  JPY: 0.036, CAD: 4, AUD: 3.6, NZD: 3.3, CHF: 6.2, SEK: 0.52, NOK: 0.5, DKK: 0.8, PLN: 1.4, CZK: 0.24, HUF: 0.015, TRY: 0.17, RUB: 0.06,
  INR: 0.065, KRW: 0.004, PHP: 0.1, IDR: 0.00035, THB: 0.16, HKD: 0.7, TWD: 0.17, SGD: 4.1, MYR: 1.2, ZAR: 0.3, ILS: 1.5, SAR: 1.5, AED: 1.5, VND: 0.0002, EGP: 0.11, NGN: 0.0035, KES: 0.042 };
// Moeda fora da tabela: conta no máximo R$ 2 (só agradecimento), para nunca liberar prêmios grandes por engano.
function toBRL(amount, currency) {
  const v = Number(amount) || 0, rate = RATES[String(currency || 'BRL').toUpperCase()];
  return rate == null ? Math.min(2, v) : v * rate;
}
const TITLES = ['Forasteiro', 'Novato', 'Morador', 'Vizinho querido', 'Veterano', 'Cidadão ilustre', 'Herói da vila', 'Lenda de Pixelândia'];

// ================== ESTADO ==================
// liveState é salvo junto com o mundo (serialize/load do script principal).
function L() {
  const s = liveState;
  if (s.viewers) { if (!Array.isArray(s.arrivals)) s.arrivals = []; return s; }
  const old = Array.isArray(s.residents) ? s.residents : [];
  Object.assign(s, {
    v: 2, era: 0, viewers: {}, arrivals: [], vote: null, chal: null, feed: [], raised: 0, goal: 50, voteN: 0,
    next: { obra: Date.now() + 30000, dilema: Date.now() + LIVE_CFG.dilemaMin * 60000, chal: Date.now() + 90000 },
  });
  for (const [uid, npcId] of old) s.viewers[uid] = newViewer(uid, npcId);
  delete s.residents; delete s.ballots; delete s.deadline; delete s.winner; delete s.firstBuildingId;
  return s;
}
function newViewer(name, npcId = null) { return { name, npc: npcId, xp: 0, msgs: 0, votes: 0, don: 0, work: 0, turbo: 0, last: 0, said: 0, pend: null, member: false }; }
function viewerOf(uid, name) { const v = L().viewers[uid] || (L().viewers[uid] = newViewer(name || uid)); if (name) v.name = name; return v; }
function npcOf(v) { return v && v.npc != null ? npcs.find(n => n.id === v.npc) || null : null; }
function level(v) { return Math.floor(Math.sqrt((v.xp || 0) / 25)) + 1; }
function title(v) { return TITLES[Math.min(TITLES.length - 1, level(v) - 1)]; }
function addXp(v, k) { const before = level(v); v.xp = (v.xp || 0) + k; const after = level(v); if (after > before) { feed(`⭐ ${v.name} subiu para nível ${after}: ${title(v)}!`); const n = npcOf(v); if (n) { say(n, `Nível ${after}! ⭐`); confetti(n.x, n.y - 10); } } }
function feed(t) { const f = L().feed; f.push({ t, at: Date.now() }); if (f.length > 30) f.splice(0, f.length - 30); liveDirty = true; }
const ARRIVAL_GAP = 2600;
let lastChatAt = Date.now(), lastUserCam = 0;
let liveDirty = true, lastArrival = 0, saveDue = 0, lastSave = 0, seenIds = new Set(), liveConn = { yt: 'desligado', bridge: 'desligado' };

// ================== ENTRADA DE EVENTOS ==================
// Toda fonte (simulador, YouTube, ponte local) entrega o mesmo formato:
// { id?, src, user, name, kind: 'chat'|'donation'|'member'|'gift', text, amount (R$), raw? }
function liveEvent(e) {
  if (e.id) { if (seenIds.has(e.id)) return; seenIds.add(e.id); if (seenIds.size > 5000) seenIds = new Set([...seenIds].slice(-2500)); }
  const uid = norm(e.user || e.name || '').replace(/^@/, '');
  if (!uid) return 'Usuário inválido.';
  const v = viewerOf(uid, String(e.name || e.user).replace(/^@/, '').slice(0, 30));
  if (v.banned) return 'Usuário bloqueado.';
  let r;
  if (e.kind === 'donation') r = onDonation(v, uid, Number(e.amount) || 0, e.text || '', e.src);
  else if (e.kind === 'member') r = onMember(v);
  else if (e.kind === 'gift') r = onGift(v, Number(e.count) || 1);
  else r = onChat(v, uid, String(e.text || '').trim());
  liveDirty = true;
  return r;
}

function onChat(v, uid, text) {
  lastChatAt = Date.now();
  if (!text) return '';
  const now = Date.now();
  v.msgs++;
  if (L().chal && L().chal.track === 'msg') chalAdd(uid, 1);
  if (now - v.last > 15000) { v.last = now; addXp(v, 1); const n = npcOf(v); if (n) n.boost = Math.max(n.boost || 0, 45); }

  const arrive = text.match(/^@\s*([^/|]{1,24}?)\s*[/|]\s*(.{2,30})$/u) || text.match(/^!morador\s+([^/|]{1,24}?)\s*[/|]\s*(.{2,30})$/iu);
  if (arrive) return requestArrival(v, uid, arrive[1].trim(), arrive[2].trim());

  const lower = norm(text);
  const vote = L().vote;
  const m = lower.match(/^!?votar\s+(.+)$/) || lower.match(/^!?([1-4]|[ab])$/);
  if (m && vote) return castVote(v, uid, m[1]);
  if (/^!ajudar\b/.test(lower)) return help(v, uid);
  if (/^!meu\b/.test(lower)) return showMine(v);
  if (/^!top\b/.test(lower)) { showTop = Date.now() + 15000; return 'Ranking na tela.'; }
  if (/^!era\b/.test(lower)) { const e = ERAS[L().era]; announce(`${e.icon} Era: ${e.name}`, eraNeedText() || 'Última era!'); return ''; }
  if (/^!(ajuda|comandos)\b/.test(lower)) { showHelp = Date.now() + 15000; return 'Comandos na tela.'; }
  if (lower.startsWith('!')) return 'Comandos: @Nome/profissão, 1-4, A/B, !ajudar, !meu, !top, !era.';

  // Mensagem comum: o morador do espectador fala no mundo.
  const n = npcOf(v);
  if (n && n.active && now - v.said > 8000 && !badName(text)) { v.said = now; say(n, text.length > 42 ? text.slice(0, 40) + '…' : text); }
  return '';
}

// ---------- chegada de moradores ----------
function requestArrival(v, uid, name, profText) {
  const mine = npcOf(v);
  if (mine) return `${v.name}, você já tem um morador: ${mine.name}. Use !meu.`;
  const arrivals = L().arrivals;
  if (arrivals.some(a => a.uid === uid)) return 'Seu morador já está a caminho!';
  if (!/^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} ._'’-]{0,17}$/u.test(name) || badName(name)) return 'Nome inválido. Use até 18 letras: @Nome/profissão';
  if (badName(profText) || !/^[\p{L}\p{M} -]{2,24}$/u.test(profText)) return 'Profissão inválida. Exemplo: @Ana/pescadora';
  const key = norm(profText);
  const prof = key === 'carpinteiro' || key === 'carpinteira' ? 'pedreiro' : PROF_ALIAS[key];
  let sex;
  if (prof) sex = norm(PROF[prof].labelF) === key && PROF[prof].labelF !== PROF[prof].label ? 'f' : norm(PROF[prof].label) === key ? 'm' : parseSex('', name);
  else sex = /a$/.test(key) ? 'f' : parseSex('', name);
  arrivals.push({ uid, name, prof, profText, sex, at: Date.now() });
  saveDue = 1;
  return arrivals.length > 1 ? `${name} entrou na fila de chegada (${arrivals.length}º).` : `${name} está chegando!`;
}
function processArrival() {
  const arrivals = L().arrivals;
  if (!arrivals.length || Date.now() - lastArrival < ARRIVAL_GAP || Date.now() < camQ.until) return;
  lastArrival = Date.now(); camQ.lastWasSpot = false;
  const a = arrivals.shift(), v = L().viewers[a.uid];
  saveDue = 1;
  if (!v || npcOf(v)) return;
  let prof = a.prof, custom = '', pend = null;
  const label = a.profText.replace(/\s+/g, ' ').replace(/^./u, c => c.toUpperCase()).slice(0, 20);
  if (!prof) { prof = 'custom'; custom = label; }
  else if (!eraUnlocked('profs').includes(prof)) { pend = prof; custom = 'Aprendiz de ' + label; prof = 'custom'; }
  const n = addNPC(a.name, prof, a.sex, custom);
  v.npc = n.id; v.pend = pend; v.work = 0;
  if (v.member) { n.fan = true; setVip(n, true); }
  addXp(v, 5);
  if (L().chal && L().chal.track === 'arrive') chalAdd(a.uid, 1);
  if (pend) feed(`🎓 ${n.name} chegou como aprendiz: vira ${PROF[pend].label} na era ${ERAS[eraOfProf(pend)].name}`);
  else if (prof === 'custom') feed(`⭐ ${n.name} (${custom}) chegou e vai ajudar nas obras`);
  else feed(`👋 ${n.name} chegou como ${profLabel(n)} — trazido por ${v.name}`);
  n.liveTag = '@' + v.name; n.liveLv = level(v);
  addHL(2, n.name + ' chegou à vila', n.x, n.y);
}
function liveGuest() {
  const sex = Math.random() < 0.5 ? 'f' : 'm';
  addNPC(pick(sex === 'f' ? NAMES_F : NAMES_M), pick(['lenhador', 'fazendeiro', 'pedreiro']), sex, '', true);
}

// ---------- votações (obras e dilemas) ----------
function openObraVote() {
  const s = L();
  const busy = new Set(queue.filter(q => q.manual).map(q => q.type).concat(buildings.filter(b => !b.done).map(b => b.type)));
  const built = t => buildings.filter(b => b.type === t && b.done).length;
  let pool = eraUnlocked('blds').filter(t => BT[t] && !busy.has(t) && (t === 'casa' || t === 'sobrado' || built(t) < 1));
  pool.sort((a, b) => (ERAS.findIndex(e => e.blds.includes(b)) - ERAS.findIndex(e => e.blds.includes(a))) || Math.random() - 0.5);
  let opts = pool.filter(t => !isHouse(t)).slice(0, 4).sort(() => Math.random() - 0.5).slice(0, 2);
  const house = (homeless > 0 || !buildings.some(b => isHouse(b.type))) && pool.includes('casa') ? 'casa' : null;
  if (house) opts.unshift(house); else { const extra = pool.find(t => !opts.includes(t)); if (extra) opts.push(extra); }
  opts = opts.slice(0, 3);
  if (opts.length < 2) { s.next.obra = Date.now() + 60000; return false; }
  s.vote = { kind: 'obra', id: ++s.voteN, title: '🗳️ Qual será a próxima obra?', opts: opts.map(t => ({ k: t, label: BT[t].icon + ' ' + BT[t].label })), ballots: {}, ends: Date.now() + LIVE_CFG.voteSec * 1000 };
  announce('🗳️ VOTAÇÃO ABERTA!', 'Digite ' + opts.map((t, i) => `${i + 1} = ${BT[t].label}`).join(' · '));
  sfx('chime'); liveDirty = true; return true;
}
function openDilema(i) {
  const s = L();
  const d = DILEMAS[i ?? ((Math.random() * DILEMAS.length) | 0)];
  s.vote = { kind: 'dilema', id: ++s.voteN, di: DILEMAS.indexOf(d), title: d.t, opts: [{ k: 'a', label: 'A) ' + d.a[0] }, { k: 'b', label: 'B) ' + d.b[0] }], ballots: {}, ends: Date.now() + 60000 };
  announce('🤔 ESCOLHA DO CHAT', d.t + ' — digite A ou B');
  sfx('chime'); liveDirty = true;
}
function castVote(v, uid, raw) {
  const vote = L().vote;
  let i = -1;
  if (vote.kind === 'dilema') i = raw === 'a' ? 0 : raw === 'b' ? 1 : -1;
  else if (/^[1-4]$/.test(raw)) i = +raw - 1;
  else i = vote.opts.findIndex(o => norm(BT[o.k].label).startsWith(raw) || o.k === raw);
  if (i < 0 || i >= vote.opts.length) return 'Opção inválida.';
  const first = !vote.ballots[uid];
  let w = 1 + Math.min(2, Math.floor((level(v) - 1) / 3));
  if (v.turbo > 0 && first) { v.turbo--; w += 4; feed(`⚡ Voto turbinado de ${v.name} (+4)`); }
  vote.ballots[uid] = [i, first ? w : vote.ballots[uid][1]];
  if (first) { v.votes++; addXp(v, 3); }
  return `Voto em ${vote.opts[i].label}.`;
}
function tally(vote) { const t = vote.opts.map(() => 0); for (const [i, w] of Object.values(vote.ballots)) t[i] += w; return t; }
function closeVote() {
  const s = L(), vote = s.vote; if (!vote) return;
  s.vote = null;
  const t = tally(vote), max = Math.max(...t), tops = t.map((x, i) => x === max ? i : -1).filter(i => i >= 0);
  const win = vote.opts[pick(tops)], voters = Object.keys(vote.ballots).length;
  if (vote.kind === 'obra') {
    s.next.obra = Date.now() + LIVE_CFG.voteMin * 60000;
    const d = BT[win.k];
    const result = { id: (constructionVotes.at(-1)?.id || 0) + 1, type: win.k, day: day() };
    constructionVotes.push(result);
    let at = 0; while (at < queue.length && queue[at].manual) at++;
    queue.splice(at, 0, { type: win.k, manual: true, voteId: result.id });
    lastTry = -99;
    const lacks = [res.wood < d.wood ? `${d.wood - res.wood} 🪵` : '', res.stone < d.stone ? `${d.stone - res.stone} 🪨` : ''].filter(Boolean).join(' e ');
    announce(`${d.icon} O chat escolheu: ${d.label}!`, voters ? `${voters} voto(s)` + (lacks ? ` · faltam ${lacks}` : ' · obra começando!') : 'Ninguém votou… sorteio!');
    feed(`🏗️ ${d.label} venceu com ${max} ponto(s)` + (lacks ? ` — faltam ${lacks}` : ''));
    logEv(`🗳️ Chat escolheu ${d.icon} ${d.label}`);
  } else {
    s.next.dilema = Date.now() + LIVE_CFG.dilemaMin * 60000;
    const d = DILEMAS[vote.di], opt = win.k === 'a' ? d.a : d.b;
    const msg = opt[1]();
    announce(`O chat decidiu: ${opt[0]}`, msg);
    feed(`🤔 ${opt[0]} → ${msg}`);
    logEv(`🤔 ${opt[0]}: ${msg}`);
  }
  sfx('fanfare'); save(); refreshPanel(true); liveDirty = true;
}

// ---------- desafios ----------
function startChallenge(key) {
  const s = L();
  const keys = Object.keys(CHALLENGES).filter(k => CHALLENGES[k].ok());
  key = key && CHALLENGES[key] ? key : pick(keys);
  const c = CHALLENGES[key], target = c.target();
  s.chal = { key, track: c.track, target, prog: 0, contrib: {}, ends: Date.now() + c.min * 60000, last: { wood: res.wood, stone: res.stone } };
  announce(`${c.icon} DESAFIO!`, `${c.title(target)} em ${c.min} min`);
  sfx('chime'); liveDirty = true;
}
function chalAdd(uid, k) { const c = L().chal; if (!c) return; c.prog += k; if (uid) c.contrib[uid] = (c.contrib[uid] || 0) + k; liveDirty = true; if (c.prog >= c.target) endChallenge(true); }
function help(v, uid) {
  const c = L().chal;
  const n = npcOf(v); if (n) { n.boost = Math.max(n.boost || 0, 60); say(n, pick(['Bora! 💪', 'Tô ajudando!', 'Mutirão!'])); }
  if (!c || c.track !== 'help') return n ? 'Seu morador ganhou ânimo!' : 'Sem mutirão agora.';
  if (Date.now() - (v.help || 0) < 8000) return '';
  v.help = Date.now(); addXp(v, 2); chalAdd(uid, 1); return '';
}
function endChallenge(win) {
  const s = L(), c = s.chal; if (!c) return;
  s.chal = null; s.next.chal = Date.now() + LIVE_CFG.chalMin * 60000;
  const def = CHALLENGES[c.key];
  const helpers = Object.keys(c.contrib);
  if (win) {
    const k = Math.max(1, npcs.length);
    res.wood += 15 + k * 2; res.stone += 8 + k; res.coins += 10;
    for (const n of npcs) n.boost = Math.max(n.boost || 0, 60);
    for (const uid of helpers) if (s.viewers[uid]) addXp(s.viewers[uid], 10);
    announce(`🏆 DESAFIO CUMPRIDO!`, `${def.icon} ${def.title(c.target)} · +${15 + k * 2} 🪵 +${8 + k} 🪨 e ânimo geral`);
    feed(helpers.length ? `🏆 Desafio cumprido! ${helpers.length} pessoa(s) do chat ajudaram` : '🏆 Desafio cumprido pelos moradores!');
    sfx('fanfare'); for (let i = 0; i < 6; i++) firework();
  } else {
    const loss = Math.min(res.meals, 5);
    res.meals -= loss;
    announce('⌛ O tempo acabou…', `${def.title(c.target)}: ${c.prog}/${c.target}. Na próxima a gente consegue!`);
    feed(`⌛ Desafio perdido (${c.prog}/${c.target})${loss ? ` — sumiram ${loss} 🍲` : ''}`);
  }
  save(); liveDirty = true;
}

// ---------- doações, membros ----------
function onDonation(v, uid, amount, text, src) {
  if (!(amount > 0)) return 'Valor inválido.';
  const s = L(), n = npcOf(v);
  v.don = (v.don || 0) + amount; s.raised = (s.raised || 0) + amount;
  addXp(v, Math.round(amount * 10));
  const wood = Math.round(amount * 8), stone = Math.round(amount * 4);
  res.wood += wood; res.stone += stone;
  const ch = s.chal;
  if (ch && (ch.track === 'wood' || ch.track === 'stone')) { ch.last[ch.track] = res[ch.track]; chalAdd(uid, ch.track === 'wood' ? wood : stone); }
  const perks = [`+${wood} 🪵 +${stone} 🪨`];
  if (amount >= 5) { v.turbo += 3; perks.push('3 votos turbinados'); }
  const lower = norm(text);
  if (amount >= 10) {
    const site = buildings.find(b => !b.done);
    if (site) { site.startedAt = (site.startedAt ?? gtime) - 90; addProgress(site, site.need * 0.4); perks.push(`obra relâmpago em ${BT[site.type].label}`); }
    const ev = Object.keys(DONATION_EVENTS).find(k => lower.includes('!' + k));
    if (ev) { setTimeout(() => startEvent(DONATION_EVENTS[ev]), 4500); perks.push('evento: ' + ev); }
  }
  if (amount >= 25) {
    const m = lower.match(/!obra\s+([a-z -]+)/);
    const want = m ? m[1].trim() : '';
    const type = want && eraUnlocked('blds').find(t => { const l = norm(BT[t].label); return want.startsWith(l) || l.startsWith(want.split(' ')[0]); });
    if (type) { let at = 0; while (at < queue.length && queue[at].manual) at++; queue.splice(at, 0, { type, manual: true, free: true }); lastTry = -99; perks.push(`${BT[type].label} de presente`); }
  }
  if (amount >= 50 && n && !n.vip) { n.fan = true; setVip(n, true); perks.push('mansão VIP'); }
  if (n) { if (!n.active) activate(n); say(n, text && !badName(text) ? text.slice(0, 40) : 'Obrigado! 💛'); follow = n.id; pinnedFollow = false; followUntil = performance.now() + 10000; }
  const icon = src === 'pix' ? '💠 Pix' : src === 'yt' ? '💲 Super Chat' : '💛 Apoio';
  announce(`${icon} de ${v.name}: R$ ${amount.toFixed(2).replace('.', ',')}`, perks.join(' · '));
  feed(`${icon} ${v.name} R$ ${amount.toFixed(2).replace('.', ',')} → ${perks.join(', ')}`);
  sfx('fanfare'); confetti(cam.x, cam.y - 20);
  if (s.goal > 0 && s.raised >= s.goal) liveGoalReached();
  save(); return 'Doação registrada.';
}
function liveGoalReached() {
  const s = L();
  announce('🎆 META DA LIVE BATIDA!', `R$ ${fmt(s.goal)} — festa gigante e +100 🪵 +60 🪨`);
  feed(`🎆 Meta de R$ ${fmt(s.goal)} batida! Próxima: R$ ${fmt(s.goal * 2)}`);
  res.wood += 100; res.stone += 60; startEvent('party'); for (let i = 0; i < 12; i++) firework();
  s.goal *= 2;
}
function onMember(v) {
  v.member = true; addXp(v, 50);
  const n = npcOf(v);
  if (n && !n.vip) { n.fan = true; setVip(n, true); }
  else announce('👑 NOVO MEMBRO!', `${v.name} ganha mansão quando trouxer seu morador`);
  feed(`👑 ${v.name} virou membro do canal!`); save(); return 'Membro registrado.';
}
function onGift(v, count) {
  addXp(v, 30 * count);
  announce('🎁 PRESENTES!', `${v.name} presenteou ${count} assinatura(s): festa na praça!`);
  feed(`🎁 ${v.name} presenteou ${count} assinatura(s)`); startEvent('party'); return 'Presente registrado.';
}

// ---------- meu morador ----------
let showTop = 0, showHelp = 0;
// Fila de câmera: cada !meu ganha alguns segundos de destaque, um de cada vez.
const SPOT_SEC = 8;
const camQ = { cur: null, until: 0, queue: [], lastWasSpot: false };
function showMine(v) {
  const n = npcOf(v);
  if (!n) return 'Você ainda não tem morador: digite @Nome/profissão';
  if (camQ.cur && camQ.cur.npc === n.id && Date.now() < camQ.until) return 'Seu morador já está na tela!';
  const pos = camQ.queue.findIndex(x => x.npc === n.id);
  if (pos >= 0) return `Você já está na fila da câmera (${pos + 1}º).`;
  if (camQ.queue.length >= 30) return 'Fila da câmera cheia, tente daqui a pouco.';
  camQ.queue.push({ npc: n.id, uid: norm(v.name) });
  liveDirty = true;
  return camQ.queue.length > 1 || camQ.cur ? `Fila da câmera: ${camQ.queue.length}º.` : 'Seu morador vai aparecer!';
}
function processSpotlight() {
  const now = Date.now();
  if (now < camQ.until) return;
  if (camQ.cur) { camQ.cur = null; liveDirty = true; }
  if (!camQ.queue.length) return;
  // Alterna com as chegadas: depois de um destaque, deixa um morador novo chegar.
  if (L().arrivals.length && camQ.lastWasSpot) return;
  if (now - lastArrival < ARRIVAL_GAP) return;
  const item = camQ.queue.shift();
  const n = npcs.find(m => m.id === item.npc);
  const v = Object.values(L().viewers).find(x => x.npc === item.npc);
  if (!n || !v) return;
  if (!n.active && !(n.abT > 0)) activate(n);
  follow = n.id; pinnedFollow = false; followUntil = performance.now() + SPOT_SEC * 1000;
  camQ.cur = { npc: n.id, name: n.name, who: v.name }; camQ.until = now + SPOT_SEC * 1000; camQ.lastWasSpot = true;
  const work = Object.values(n.st || {}).reduce((a, b) => a + b, 0);
  announce(`${profIcon(n)} ${n.name} · nível ${level(v)}`, `de @${v.name} · ${title(v)} · ${n.abT > 0 ? 'abduzido pelo OVNI 👽' : n.status || 'Na vila'} · ${work} tarefas`);
  say(n, pick(['Oi, chat! 👋', 'Tô aqui!', 'Olha eu! ✨', 'Trabalhando duro 💪']));
  liveDirty = true;
}

// ================== ERA ==================
function eraProgress() {
  const e = ERAS[L().era]; if (!e.need) return null;
  const done = buildings.filter(b => b.done);
  const items = [
    { t: `👥 ${npcs.length}/${e.need.pop}`, ok: npcs.length >= e.need.pop, f: Math.min(1, npcs.length / e.need.pop) },
    { t: `🏗️ ${done.length}/${e.need.built}`, ok: done.length >= e.need.built, f: Math.min(1, done.length / e.need.built) },
    ...e.need.has.map(k => { const ok = done.some(b => b.type === k); return { t: `${BT[k].icon} ${BT[k].label}`, ok, f: ok ? 1 : 0 }; }),
  ];
  return { items, f: items.reduce((a, i) => a + i.f, 0) / items.length, ok: items.every(i => i.ok) };
}
function eraNeedText() { const p = eraProgress(); return p ? 'Próxima era: ' + p.items.map(i => (i.ok ? '✅ ' : '') + i.t).join(' · ') : ''; }
function eraUp() {
  const s = L(); s.era++;
  const e = ERAS[s.era];
  announce(`${e.icon} NOVA ERA: ${e.name.toUpperCase()}!`, 'Novas obras e profissões liberadas');
  feed(`${e.icon} A vila virou ${e.name}! Novas profissões: ${e.profs.map(p => PROF[p].label).join(', ')}`);
  logEv(`${e.icon} Nova era: ${e.name}`);
  sfx('fanfare'); for (let i = 0; i < 14; i++) setTimeout(() => firework(), i * 250);
  addHL(5, `${e.icon} A vila chegou à era ${e.name}`, CX * T + 8, CY * T + 8);
  for (const v of Object.values(s.viewers)) {
    const n = npcOf(v); if (!n || !v.pend || !e.profs.includes(v.pend)) continue;
    profCount.custom = Math.max(0, (profCount.custom || 0) - 1);
    n.prof = v.pend; n.custom = ''; v.pend = null;
    profCount[n.prof] = (profCount[n.prof] || 0) + 1;
    npcColors(n); queueProfBuilding(n.prof); addXp(v, 20);
    say(n, `Agora sou ${profLabel(n)}! 🎓`); feed(`🎓 ${n.name} se formou: ${profLabel(n)}`);
  }
  npcVer++; save(); refreshPanel(true);
}

// ================== CICLO ==================
let liveSlow = 0;
function liveTick() {
  const s = L(), now = Date.now();
  processArrival();
  processSpotlight();
  // Pedidos de chegada são salvos em lote: evita gravar o mundo a cada mensagem.
  if (saveDue && now - lastSave > 3000) { saveDue = 0; lastSave = now; save(); }
  if (s.vote && now >= s.vote.ends) closeVote();
  const c = s.chal;
  if (c) {
    if (c.track === 'wood' || c.track === 'stone') { const d = res[c.track] - c.last[c.track]; c.last[c.track] = res[c.track]; if (d > 0) chalAdd(null, d); }
    if (s.chal && now >= s.chal.ends) endChallenge(false);
  }
  if (LIVE_CFG.auto && npcs.length) {
    if (!s.vote && now >= s.next.obra && now - (s.lastClose || 0) > 20000) { if (openObraVote()) s.lastClose = now; }
    else if (!s.vote && now >= s.next.dilema && npcs.length >= 3 && now - (s.lastClose || 0) > 20000) { openDilema(); s.lastClose = now; }
    if (!s.chal && now >= s.next.chal && npcs.length >= 2) startChallenge();
  }
  if (++liveSlow % 10 === 0) {
    // A cada ~5s: o trabalho do morador vira XP do espectador.
    for (const v of Object.values(s.viewers)) {
      const n = npcOf(v); if (!n) continue;
      n.liveTag = '@' + v.name; n.liveLv = level(v);
      const w = Object.values(n.st || {}).reduce((a, b) => a + b, 0);
      if (w > (v.work || 0)) { addXp(v, w - (v.work || 0)); v.work = w; }
    }
    const p = eraProgress(); if (p && p.ok) eraUp();
  }
  renderLiveHud();
}

// ================== OVERLAY DA LIVE ==================
function bar(f, cls = '') { return `<div class="lbar ${cls}"><i style="width:${(Math.max(0, Math.min(1, f)) * 100).toFixed(1)}%"></i></div>`; }
function secs(t) { const s = Math.max(0, Math.ceil((t - Date.now()) / 1000)); return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : s + 's'; }
let lastHud = '';
function renderLiveHud() {
  const s = L(), e = ERAS[s.era], p = eraProgress();
  let h = `<div class="lh-era"><b>${e.icon} Era ${s.era + 1}: ${esc(e.name)}</b>`;
  if (p) h += bar(p.f) + `<small>${p.items.map(i => `<span class="${i.ok ? 'ok' : ''}">${esc(i.t)}</span>`).join(' ')}</small>`;
  else h += '<small>Era final — a vila é uma metrópole!</small>';
  h += '</div>';
  const vote = s.vote;
  if (vote) {
    const t = tally(vote), tot = t.reduce((a, b) => a + b, 0) || 1;
    h += `<div class="lh-box vote"><b>${esc(vote.title)}</b> <span class="tm">⏱ ${secs(vote.ends)}</span>` +
      vote.opts.map((o, i) => `<div class="opt"><span><kbd>${vote.kind === 'dilema' ? o.k.toUpperCase() : i + 1}</kbd> ${esc(o.label.replace(/^[AB]\) /, ''))}</span><em>${t[i]}</em>${bar(t[i] / tot, 'v')}</div>`).join('') +
      `<small>Digite ${vote.kind === 'dilema' ? '<b>A</b> ou <b>B</b>' : vote.opts.map((_, i) => `<b>${i + 1}</b>`).join(', ')} no chat</small></div>`;
  }
  const c = s.chal;
  if (c) { const d = CHALLENGES[c.key]; h += `<div class="lh-box chal"><b>${d.icon} Desafio: ${esc(d.title(c.target))}</b> <span class="tm">⏱ ${secs(c.ends)}</span>${bar(c.prog / c.target, 'c')}<small>${fmt(Math.min(c.prog, c.target))}/${fmt(c.target)}${c.track === 'help' ? ' · digite <b>!ajudar</b>' : ''}</small></div>`; }
  if (camQ.cur || camQ.queue.length) {
    const next = camQ.queue.slice(0, 4).map(x => npcs.find(m => m.id === x.npc)?.name).filter(Boolean);
    h += `<div class="lh-box cam"><b>📍 Na câmera: ${camQ.cur ? esc(camQ.cur.name) + ` <small style="display:inline">(@${esc(camQ.cur.who)})</small>` : '—'}</b>` +
      (camQ.cur ? ` <span class="tm">${secs(camQ.until)}</span>` : '') +
      (next.length ? `<small>Próximos: ${next.map(esc).join(', ')}${camQ.queue.length > 4 ? ` +${camQ.queue.length - 4}` : ''} · digite <b>!meu</b></small>` : '<small>Digite <b>!meu</b> para aparecer</small>') + `</div>`;
  }
  const q = s.arrivals;
  if (q.length) {
    const wait = Math.ceil(q.length * ARRIVAL_GAP / 1000);
    const newest = q[q.length - 1];
    h += `<div class="lh-box queue"><b>🚶 Chegando à vila (${q.length})</b> <span class="tm">~${wait >= 60 ? Math.ceil(wait / 60) + ' min' : wait + 's'}</span>` +
      `<small>${q.slice(0, 5).map((a, i) => `${i + 1}. ${esc(a.name)} · ${esc(a.profText)}`).join('<br>')}` +
      (q.length > 5 ? `<br>… e mais ${q.length - 5} · último a entrar: <b>${esc(newest.name)}</b> (${q.length}º)` : '') + `</small></div>`;
  }
  if (s.goal > 0) h += `<div class="lh-goal">💛 Meta da live: R$ ${fmt(Math.round(s.raised))} / ${fmt(s.goal)}${bar(s.raised / s.goal, 'g')}</div>`;
  if (Date.now() < showTop) h += `<div class="lh-box"><b>🏆 Quem mais ajudou</b>${topViewers(5).map((v, i) => `<div class="opt"><span>${i + 1}. ${esc(v.name)}${npcOf(v) ? ' · ' + esc(npcOf(v).name) : ''}</span><em>nv ${level(v)}</em></div>`).join('') || '<small>Ninguém ainda</small>'}</div>`;
  if (Date.now() < showHelp) h += `<div class="lh-box"><b>📜 Comandos</b><small><b>@Nome/profissão</b> traz seu morador<br><b>1 2 3</b> votam na obra · <b>A B</b> nas escolhas<br><b>!ajudar</b> nos mutirões · <b>!meu</b> mostra seu morador<br><b>!top</b> ranking · <b>!era</b> progresso<br>Super Chat/Pix: recursos, eventos e obras relâmpago</small></div>`;
  const recent = s.feed.filter(f => Date.now() - f.at < 25000).slice(-4);
  if (recent.length) h += `<div class="lh-feed">${recent.map(f => `<div>${esc(f.t)}</div>`).join('')}</div>`;
  const tips = ['⚡ Falar no chat dá ânimo ao seu morador', '🏆 <b>!top</b> mostra quem mais ajudou', '📍 <b>!meu</b> mostra seu morador na tela', '📜 <b>!ajuda</b> mostra todos os comandos'];
  if (npcs.length) {
    h += `<div class="lh-tip">${tips[Math.floor(Date.now() / 8000) % tips.length]}</div>`;
    h += `<div class="lh-join">💬 Entre na vila: <b>@SeuNome/profissão</b></div>`;
  }
  if (h !== lastHud) { lastHud = h; $('liveHud').innerHTML = h; }
  if (liveDirty || liveSlow % 2 === 0) { liveDirty = false; renderLivePanelStatus(); }
}
function topViewers(k) { return Object.values(L().viewers).filter(v => v.xp > 0).sort((a, b) => b.xp - a.xp).slice(0, k); }

// ================== CONEXÃO: YOUTUBE ==================
// Lê o chat público pela YouTube Data API v3 com chave de API.
// Cada leitura custa cota: o intervalo respeita pollingIntervalMillis e nunca fica abaixo de 6s.
let yt = null;
function ytVideoId(s) { s = String(s).trim(); const m = s.match(/(?:v=|youtu\.be\/|live\/|shorts\/)([\w-]{11})/); return m ? m[1] : s; }
async function ytConnect() {
  ytStop();
  const key = LIVE_CFG.ytKey.trim(), vid = ytVideoId(LIVE_CFG.ytVideo);
  if (!key || !vid) { liveConn.yt = 'informe chave e vídeo'; liveDirty = true; return; }
  const run = yt = { stop: false, token: null, started: Date.now() };
  try {
    liveConn.yt = 'procurando chat…'; liveDirty = true;
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${encodeURIComponent(vid)}&key=${encodeURIComponent(key)}`);
    const j = await r.json();
    if (j.error) throw new Error(j.error.message);
    const chat = j.items?.[0]?.liveStreamingDetails?.activeLiveChatId;
    if (!chat) throw new Error('vídeo sem chat ao vivo ativo');
    run.chat = chat;
    liveConn.yt = 'conectado ✅'; liveDirty = true;
    ytPoll(run, key, true);
  } catch (err) { liveConn.yt = 'erro: ' + err.message; liveDirty = true; }
}
async function ytPoll(run, key, first) {
  if (run.stop) return;
  let wait = 8000;
  try {
    const url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${encodeURIComponent(run.chat)}&part=snippet,authorDetails&maxResults=200${run.token ? '&pageToken=' + encodeURIComponent(run.token) : ''}&key=${encodeURIComponent(key)}`;
    const j = await (await fetch(url)).json();
    if (j.error) throw new Error(j.error.message);
    run.token = j.nextPageToken;
    wait = Math.max(6000, j.pollingIntervalMillis || 6000);
    // Na primeira leitura, ignora mensagens antigas para não reprocessar o histórico.
    if (!first) for (const it of j.items || []) { try { const e = ytMap(it); if (e) liveEvent(e); } catch (e) { console.error('mensagem do YouTube:', e, it); } }
    first = false;
    liveConn.yt = `conectado ✅ · ${new Date().toLocaleTimeString('pt-BR')}`; liveDirty = true;
  } catch (err) { liveConn.yt = 'erro: ' + err.message + ' (tentando de novo)'; liveDirty = true; wait = 20000; }
  run.timer = setTimeout(() => ytPoll(run, key, first), wait);
}
function ytStop() { if (yt) { yt.stop = true; clearTimeout(yt.timer); yt = null; } liveConn.yt = 'desligado'; liveDirty = true; }
function ytMap(it) {
  const sn = it.snippet || {}, au = it.authorDetails || {};
  const base = { id: 'yt:' + it.id, src: 'yt', user: 'yt:' + au.channelId, name: au.displayName || 'Anônimo' };
  if (sn.type === 'textMessageEvent') return { ...base, kind: 'chat', text: sn.displayMessage || sn.textMessageDetails?.messageText || '' };
  if (sn.type === 'superChatEvent' || sn.type === 'superStickerEvent') {
    const d = sn.superChatDetails || sn.superStickerDetails || {};
    return { ...base, kind: 'donation', amount: toBRL((Number(d.amountMicros) || 0) / 1e6, d.currency), text: d.userComment || '' };
  }
  if (sn.type === 'newSponsorEvent' || sn.type === 'memberMilestoneChatEvent') return { ...base, kind: 'member' };
  if (sn.type === 'membershipGiftingEvent') return { ...base, kind: 'gift', count: sn.membershipGiftingDetails?.giftMembershipsCount || 1 };
  return null;
}

// ================== CONEXÃO: PONTE LOCAL (Pix e outros) ==================
// A ponte (ponte/ponte.mjs) recebe eventos por HTTP e os repassa por Server-Sent Events.
let bridge = null;
function bridgeConnect() {
  bridgeStop();
  try {
    bridge = new EventSource(LIVE_CFG.bridgeUrl);
    liveConn.bridge = 'conectando…';
    bridge.onopen = () => { liveConn.bridge = 'conectada ✅'; liveDirty = true; };
    bridge.onerror = () => { liveConn.bridge = 'sem conexão (tentando)…'; liveDirty = true; };
    bridge.onmessage = m => {
      try {
        const d = JSON.parse(m.data);
        const kind = d.type === 'donation' || d.type === 'pix' ? 'donation' : d.type === 'member' ? 'member' : d.type === 'gift' ? 'gift' : 'chat';
        liveEvent({ id: d.id ? 'br:' + d.id : null, src: d.source || (d.type === 'pix' ? 'pix' : 'bridge'), user: (d.source || 'br') + ':' + (d.user || d.name), name: d.name || d.user, kind, text: d.text || d.message || '', amount: toBRL(d.amount, d.currency || 'BRL'), count: d.count });
      } catch (e) { console.warn('ponte:', e); }
    };
  } catch (e) { liveConn.bridge = 'erro: ' + e.message; }
  liveDirty = true;
}
function bridgeStop() { if (bridge) { bridge.close(); bridge = null; } liveConn.bridge = 'desligada'; liveDirty = true; }

// ================== PAINEL DO STREAMER ==================
$('livePanel').innerHTML = `
<section class="card"><h3>💬 Chat simulado</h3>
  <form id="lvChat"><div class="row" style="flex-wrap:nowrap"><input class="in" id="lvUser" placeholder="@usuario" maxlength="40" required style="flex:0 0 38%"><input class="in" id="lvMsg" placeholder="@Nico/lenhador" maxlength="200" required></div>
  <button class="btn big">Enviar ao jogo</button></form>
  <div class="row" style="margin-top:6px"><button class="btn xs" data-q="1">1</button><button class="btn xs" data-q="2">2</button><button class="btn xs" data-q="3">3</button><button class="btn xs" data-q="A">A</button><button class="btn xs" data-q="B">B</button><button class="btn xs" data-q="!ajudar">!ajudar</button><button class="btn xs" data-q="!meu">!meu</button><button class="btn xs" data-q="!top">!top</button><button class="btn xs" data-q="!ajuda">!ajuda</button></div>
  <p class="tip" id="lvFeedback" role="status">Comandos: <b>@Nome/profissão</b>, <b>1-3</b>, <b>A/B</b>, <b>!ajudar</b>, <b>!meu</b>, <b>!top</b>, <b>!era</b>.</p>
</section>
<section class="card"><h3>💛 Doações e membros (teste ou manual)</h3>
  <div class="row" style="flex-wrap:nowrap"><input class="in" id="lvDonUser" placeholder="@usuario" maxlength="40"><input class="in" id="lvDonVal" type="number" min="1" step="0.01" value="10" style="flex:0 0 30%"></div>
  <input class="in" id="lvDonMsg" placeholder="Mensagem (ex: !festa ou !obra padaria)" maxlength="200" style="margin-top:6px">
  <div class="row" style="margin-top:6px"><button class="btn sm" id="lvPix">💠 Pix</button><button class="btn sm" id="lvSC">💲 Super Chat</button><button class="btn sm" id="lvMember">👑 Membro</button></div>
  <p class="tip">≥R$2 recursos · ≥R$5 votos turbinados · ≥R$10 obra relâmpago + evento (!festa !chuva !neve !galinhas !ovni) · ≥R$25 <b>!obra nome</b> de presente · ≥R$50 mansão VIP</p>
  <label for="lvGoal">Meta da live (R$)</label><input class="in" id="lvGoal" type="number" min="0" step="10">
</section>
<section class="card"><h3>🎮 Controle da partida</h3>
  <div class="row"><button class="btn sm" id="lvVote">🗳️ Votar obra</button><button class="btn sm" id="lvDil">🤔 Dilema</button><button class="btn sm" id="lvChal">🏆 Desafio</button><button class="btn sm red" id="lvClose">⏹ Apurar agora</button></div>
  <label><input type="checkbox" id="lvAuto"> Ciclo automático (votações, dilemas e desafios)</label>
  <label><input type="checkbox" id="lvVitrine"> Modo vitrine (câmera passeia quando o chat está parado)</label>
  <div class="row" style="flex-wrap:nowrap;font-size:13px"><label style="flex:1">Obra a cada (min)<input class="in" id="lvVoteMin" type="number" min="1" max="60"></label><label style="flex:1">Dilema (min)<input class="in" id="lvDilMin" type="number" min="1" max="60"></label><label style="flex:1">Desafio (min)<input class="in" id="lvChalMin" type="number" min="1" max="60"></label></div>
  <p class="tip" id="lvStatus"></p>
  <label for="lvBanName">Bloquear espectador (remove o morador e ignora as mensagens)</label>
  <div class="row" style="flex-wrap:nowrap"><input class="in" id="lvBanName" placeholder="nome no chat ou do morador" maxlength="40"><button class="btn sm red" id="lvBan">🚫 Bloquear</button><button class="btn sm" id="lvUnban">Desbloquear</button></div>
</section>
<section class="card"><h3>📡 Conexões</h3>
  <label for="lvYtKey">YouTube · chave da API</label><input class="in" id="lvYtKey" type="password" autocomplete="off" placeholder="AIza…">
  <label for="lvYtVid">Link ou ID da live</label><input class="in" id="lvYtVid" placeholder="https://youtube.com/live/…">
  <div class="row" style="margin-top:6px"><button class="btn sm" id="lvYtOn">Conectar</button><button class="btn sm red" id="lvYtOff">Desligar</button></div>
  <p class="tip" id="lvYtSt"></p>
  <label for="lvBrUrl">Ponte local (Pix/LivePix, outros)</label><input class="in" id="lvBrUrl" placeholder="http://localhost:8787/eventos">
  <div class="row" style="margin-top:6px"><button class="btn sm" id="lvBrOn">Conectar</button><button class="btn sm red" id="lvBrOff">Desligar</button></div>
  <p class="tip" id="lvBrSt"></p>
  <p class="tip">⚠️ Esconda este painel (tecla H) antes de transmitir: a chave fica salva só neste navegador.</p>
</section>`;

function renderLivePanelStatus() {
  const s = L(), v = s.vote, c = s.chal;
  $('lvStatus').innerHTML = `Era ${s.era + 1} · ${Object.keys(s.viewers).length} espectador(es) · fila de chegada: ${s.arrivals.length}<br>` +
    (v ? `Votação: ${esc(v.title)} (${Object.keys(v.ballots).length} votos)` : `Próxima obra em ${secs(s.next.obra)} · dilema em ${secs(s.next.dilema)}`) +
    (c ? `<br>Desafio: ${c.prog}/${c.target}` : `<br>Próximo desafio em ${secs(s.next.chal)}`);
  $('lvYtSt').textContent = 'YouTube: ' + liveConn.yt;
  $('lvBrSt').textContent = 'Ponte: ' + liveConn.bridge;
}
function bindCfg(id, key, num) {
  const el = $(id); el.value = LIVE_CFG[key];
  el.onchange = () => { LIVE_CFG[key] = num ? Math.max(1, +el.value || 1) : el.value.trim(); liveSaveCfg(); };
}
bindCfg('lvYtKey', 'ytKey'); bindCfg('lvYtVid', 'ytVideo'); bindCfg('lvBrUrl', 'bridgeUrl');
bindCfg('lvVoteMin', 'voteMin', true); bindCfg('lvDilMin', 'dilemaMin', true); bindCfg('lvChalMin', 'chalMin', true);
$('lvVitrine').checked = LIVE_CFG.vitrine; $('lvVitrine').onchange = e => { LIVE_CFG.vitrine = e.target.checked; liveSaveCfg(); vit.target = null; };
$('lvAuto').checked = LIVE_CFG.auto; $('lvAuto').onchange = e => { LIVE_CFG.auto = e.target.checked; liveSaveCfg(); };
$('lvGoal').value = L().goal; $('lvGoal').onchange = e => { L().goal = Math.max(0, +e.target.value || 0); save(); liveDirty = true; };

function simSend(text) {
  const user = $('lvUser').value.trim() || '@visitante';
  const r = liveEvent({ src: 'sim', user: 'sim:' + norm(user).replace(/^@/, ''), name: user, kind: 'chat', text });
  $('lvFeedback').textContent = r || 'Mensagem enviada.';
}
$('lvChat').addEventListener('submit', ev => { ev.preventDefault(); simSend($('lvMsg').value); $('lvMsg').select(); });
$('livePanel').querySelectorAll('[data-q]').forEach(b => b.onclick = () => simSend(b.dataset.q));
function simDonation(src) {
  const user = $('lvDonUser').value.trim() || $('lvUser').value.trim() || '@apoiador';
  const r = liveEvent({ src, user: 'sim:' + norm(user).replace(/^@/, ''), name: user, kind: 'donation', amount: +$('lvDonVal').value, text: $('lvDonMsg').value });
  $('lvFeedback').textContent = r;
}
$('lvPix').onclick = () => simDonation('pix');
$('lvSC').onclick = () => simDonation('yt');
$('lvMember').onclick = () => { const user = $('lvDonUser').value.trim() || $('lvUser').value.trim() || '@membro'; $('lvFeedback').textContent = liveEvent({ src: 'sim', user: 'sim:' + norm(user).replace(/^@/, ''), name: user, kind: 'member' }); };
$('lvVote').onclick = () => { if (L().vote) closeVote(); if (!openObraVote()) $('lvFeedback').textContent = 'Nenhuma obra disponível nesta era.'; };
$('lvDil').onclick = () => { if (L().vote) closeVote(); openDilema(); };
$('lvChal').onclick = () => { if (L().chal) endChallenge(false); startChallenge(); };
$('lvClose').onclick = () => { if (L().vote) closeVote(); };
$('lvYtOn').onclick = () => { LIVE_CFG.ytKey = $('lvYtKey').value.trim(); LIVE_CFG.ytVideo = $('lvYtVid').value.trim(); liveSaveCfg(); ytConnect(); };
$('lvYtOff').onclick = ytStop;
function findViewers(q) {
  q = norm(q).replace(/^@/, ''); if (!q) return [];
  return Object.values(L().viewers).filter(v => norm(v.name) === q || norm(npcOf(v)?.name || '') === q);
}
$('lvBan').onclick = () => {
  const list = findViewers($('lvBanName').value);
  if (!list.length) { $('lvFeedback').textContent = 'Ninguém encontrado com esse nome.'; return; }
  for (const v of list) {
    v.banned = true;
    const n = npcOf(v); if (n) removeNPC(n.id);
    v.npc = null;
    for (const s of [L().arrivals, camQ.queue]) for (let i = s.length - 1; i >= 0; i--) if (s[i].npc === n?.id || L().viewers[s[i].uid] === v) s.splice(i, 1);
  }
  save(); refreshPanel(true); $('lvFeedback').textContent = `Bloqueado(s): ${list.map(v => v.name).join(', ')}`;
};
$('lvUnban').onclick = () => {
  const q = norm($('lvBanName').value).replace(/^@/, '');
  const list = Object.values(L().viewers).filter(v => v.banned && norm(v.name) === q);
  for (const v of list) v.banned = false;
  save(); $('lvFeedback').textContent = list.length ? `Desbloqueado(s): ${list.map(v => v.name).join(', ')}` : 'Nenhum bloqueado com esse nome.';
};
$('lvBrOn').onclick = () => { LIVE_CFG.bridgeUrl = $('lvBrUrl').value.trim(); liveSaveCfg(); bridgeConnect(); };
$('lvBrOff').onclick = bridgeStop;

// Exposto para testes e integrações externas (ex.: window.liveEvent({...}) no console).
window.liveEvent = liveEvent;

// ================== MODO VITRINE ==================
// Live aberta sem ninguém: o mundo não pode parecer congelado.
// Vazio → câmera passeia pela clareira e o cartão de entrada mostra exemplos.
// Com moradores e chat parado há 3 min → câmera visita obras e moradores e mostra o resumo da vila.
const VIT_IDLE = 3 * 60000, VIT_SHOT = 12000, VIT_SUMMARY = 60000;
const vit = { target: null, shotAt: 0, summaryAt: 0, on: false };
function vitrineActive() {
  if (!LIVE_CFG.vitrine || TOUR || REC) return false;
  if (Date.now() - lastUserCam < 60000) return false;
  if (follow != null || Date.now() < camQ.until || L().arrivals.length) return false;
  return !npcs.length || Date.now() - lastChatAt > VIT_IDLE;
}
function vitrinePick() {
  const z = isMobile() ? 2.2 : 2.6;
  if (!npcs.length) {
    // Câmera um pouco abaixo da fogueira: ela fica no alto da tela, acima do cartão de entrada.
    const a = Math.random() * Math.PI * 2, r = Math.random() * 4;
    return { x: (CX + Math.cos(a) * r) * T + 8, y: (CY + 3.5 + Math.sin(a) * 1.5) * T + 8, z: z + Math.random() * 0.5 };
  }
  const done = buildings.filter(b => b.done), active = npcs.filter(n => n.active && !n.inside && !n.sleeping);
  const roll = Math.random();
  if (active.length && roll < 0.45) {
    const n = pick(active);
    follow = n.id; pinnedFollow = false; followUntil = performance.now() + VIT_SHOT;
    if (n.liveTag) say(n, pick(['Vem morar aqui! 🏡', 'Digita @SeuNome/profissão!', 'Falta gente na vila!', 'Oi, chat! 👋']), 0.6);
    return null;
  }
  if (done.length && roll < 0.8) { const b = pick(done); return { x: (b.x + b.w / 2) * T, y: (b.y + b.h / 2) * T, z: z + 0.4 }; }
  return { x: CX * T + 8, y: CY * T + 8, z: Math.max(zMin(), z - 1) };
}
function vitrineSummary() {
  const s = L(), e = ERAS[s.era], built = buildings.filter(b => b.done).length;
  const top = topViewers(3).map(v => v.name).join(', ');
  announce(`${e.icon} ${villageName}`, `${fmt(npcs.length)} morador${npcs.length === 1 ? '' : 'es'} · ${built} obra${built === 1 ? '' : 's'} · Era ${e.name}${top ? ' · Fundadores: ' + top : ''}`);
  showTop = Date.now() + 15000;
}
const EMPTY_EX = ['@Ana/lenhadora', '@Leo/pedreiro', '@Bia/fazendeira', '@Rafa/minerador', '@Duda/pedreira', '@Caio/lenhador'];
let vitLast = performance.now();
function vitrineFrame(now) {
  const dt = Math.min(0.1, (now - vitLast) / 1000); vitLast = now;
  const on = vitrineActive();
  if (on !== vit.on) { vit.on = on; vit.target = null; vit.shotAt = 0; }
  if (on) {
    const t = Date.now();
    if (!vit.target || t - vit.shotAt > VIT_SHOT) { vit.shotAt = t; vit.target = vitrinePick(); }
    if (vit.target) {
      const k = Math.min(1, dt * 0.35);
      cam.x += (vit.target.x - cam.x) * k; cam.y += (vit.target.y - cam.y) * k; cam.z += (vit.target.z - cam.z) * k;
    }
    if (npcs.length && t - vit.summaryAt > VIT_SUMMARY) { vit.summaryAt = t; vitrineSummary(); }
  }
  requestAnimationFrame(vitrineFrame);
}
requestAnimationFrame(vitrineFrame);
// Mexer na câmera com o mouse pausa a vitrine por 1 minuto.
for (const ev of ['pointerdown', 'wheel']) $('c').addEventListener(ev, () => { lastUserCam = Date.now(); vit.target = null; }, { passive: true });
setInterval(() => {
  if (!npcs.length) $('emptyEx').textContent = 'ex.: ' + EMPTY_EX[Math.floor(Date.now() / 5000) % EMPTY_EX.length] + ' · ' + EMPTY_EX[(Math.floor(Date.now() / 5000) + 3) % EMPTY_EX.length];
}, 1000);

// Retomada: o que venceu com o jogo fechado (fim da live) é cancelado sem penalidade,
// e o ciclo recomeça com folga para o chat chegar.
(function liveResume() {
  const s = L(), now = Date.now();
  let changed = false;
  if (s.vote && now >= s.vote.ends) { s.vote = null; changed = true; }
  if (s.chal && now >= s.chal.ends) { s.chal = null; changed = true; }
  if (s.vote) s.vote.ends = Math.max(s.vote.ends, now + 30000);
  if (s.chal) s.chal.ends = Math.max(s.chal.ends, now + 60000);
  s.next.obra = Math.max(s.next.obra, now + 60000);
  s.next.dilema = Math.max(s.next.dilema, now + LIVE_CFG.dilemaMin * 60000);
  s.next.chal = Math.max(s.next.chal, now + 120000);
  for (const v of Object.values(s.viewers)) { const n = npcOf(v); if (n) { n.liveTag = '@' + v.name; n.liveLv = level(v); } }
  if (changed) save();
})();

// Jogo aberto pelo servidor local (iniciar-live.bat): a ponte já conecta sozinha.
try { if (new URL(LIVE_CFG.bridgeUrl, location.href).origin === location.origin) bridgeConnect(); } catch (e) {}

// Vigia: um erro inesperado no loop de desenho congelaria a tela da live. Religa uma vez por erro.
let frameErrAt = 0;
addEventListener('error', e => { frameErrAt = Date.now(); console.error('erro no jogo:', e.message, e.filename, e.lineno); });
let staleChecks = 0;
setInterval(() => {
  // Só religa se o loop estiver parado em duas checagens seguidas depois de um erro (evita loop duplicado).
  const stale = frameErrAt && performance.now() - last > 2000 && document.visibilityState === 'visible';
  staleChecks = stale ? staleChecks + 1 : 0;
  if (staleChecks >= 2) { staleChecks = 0; frameErrAt = 0; last = performance.now(); requestAnimationFrame(frame); console.warn('loop do jogo religado'); }
}, 2000);

// Relógio próprio: votações e desafios fecham mesmo se a aba ficar em segundo plano.
setInterval(() => { try { liveTick(); } catch (e) { console.error('live:', e); } }, 500);
