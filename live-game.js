// Mundo Pixelândia LIVE — motor do jogo controlado pelo chat.
// Carregado depois do script principal: usa as funções e o estado globais da vila.
'use strict';

// ================== CONFIGURAÇÃO ==================
const LIVE_CFG_KEY = 'pixelandia-live-config-v1';
const LIVE_CFG = Object.assign({
  ytKey: '', ytVideo: '', bridgeUrl: 'http://localhost:8787/eventos',
  auto: true, vitrine: true, raids: true, raidMin: 15, voteMin: 4, dilemaMin: 7, chalMin: 6, voteSec: 75,
}, (() => { try { return JSON.parse(localStorage.getItem(LIVE_CFG_KEY) || '{}'); } catch (e) { return {}; } })());
function liveSaveCfg() { try { localStorage.setItem(LIVE_CFG_KEY, JSON.stringify(LIVE_CFG)); } catch (e) {} }

// ================== ERAS ==================
// 10 eras. Cada uma libera profissões e obras; pesquisas votadas pelo chat liberam o resto.
// need = requisitos para SAIR da era: população, obras prontas, prédios, pesquisa-chave
// e produção TOTAL (o que a vila já produziu, não o que tem guardado: construir não atrasa a era).
const ERAS = [
  { name: 'Era da Pedra', icon: '🪨',
    profs: ['lenhador', 'pedreiro', 'minerador', 'cacador', 'pescador', 'guerreiro'],
    blds: ['casa', 'cabana', 'serraria', 'peixaria', 'deposito', 'oficina', 'totem'],
    need: { pop: 4, built: 4, has: ['deposito'], research: 'agricultura', prod: { wood: 150, food: 40 } } },
  { name: 'Era Agrícola', icon: '🌾',
    profs: ['fazendeiro', 'pecuarista', 'cozinheiro'],
    blds: ['celeiro', 'curral', 'poco', 'moinho', 'palicada', 'restaurante'],
    need: { pop: 7, built: 9, has: ['moinho', 'palicada'], research: 'metalurgia', prod: { food: 250, wood: 400, stone: 120 } } },
  { name: 'Era do Bronze', icon: '🥉',
    profs: ['comerciante', 'musico', 'padeiro', 'prefeito'],
    blds: ['mercado', 'mina', 'templo', 'muralha', 'prefeitura', 'taverna', 'fonte', 'estatua', 'padaria'],
    need: { pop: 10, built: 15, has: ['templo', 'mina'], research: 'ferro', prod: { gold: 120, stone: 350 } } },
  { name: 'Era do Ferro', icon: '⚔️',
    profs: ['ferreiro', 'policial'],
    blds: ['ferraria', 'torre', 'estabulo', 'delegacia', 'sobrado'],
    need: { pop: 14, built: 22, has: ['ferraria', 'torre'], research: 'engenharia', prod: { iron: 100, gold: 300 } } },
  { name: 'Era Clássica', icon: '🏛️',
    profs: ['professor', 'marinheiro', 'medico'],
    blds: ['escola', 'cais', 'teatro', 'parque', 'clinica', 'aqueduto'],
    need: { pop: 19, built: 29, has: ['escola', 'teatro', 'aqueduto'], research: 'filosofia', prod: { gold: 600, iron: 250 } } },
  { name: 'Medieval', icon: '🏰',
    profs: ['carteiro'],
    blds: ['capela', 'castelo', 'hotel', 'correio'],
    need: { pop: 24, built: 36, has: ['castelo'], research: 'feudalismo', prod: { stone: 1500, gold: 900 } } },
  { name: 'Baixa Idade Média', icon: '📜',
    profs: ['jardineiro'],
    blds: ['biblioteca', 'farol', 'catedral', 'universidade'],
    need: { pop: 30, built: 43, has: ['biblioteca', 'catedral', 'universidade'], research: 'universidades', prod: { gold: 1300, iron: 500 } } },
  { name: 'Renascença', icon: '🎨',
    profs: ['bombeiro', 'cientista'],
    blds: ['banco', 'quartel'],
    need: { pop: 36, built: 50, has: ['banco'], research: 'navegacao', prod: { gold: 1800 } } },
  { name: 'Era Industrial', icon: '🏭',
    profs: ['maquinista', 'enfermeiro', 'polissonografista', 'operario', 'engenheiro'],
    blds: ['estacao', 'hospital', 'predio', 'rodagigante', 'fabrica', 'usina'],
    need: { pop: 45, built: 60, has: ['estacao', 'fabrica', 'usina'], research: 'eletricidade', prod: { iron: 1500, gold: 2500, energy: 300 } } },
  { name: 'Era Moderna', icon: '🚀',
    profs: ['piloto', 'programador'],
    blds: ['aeroporto', 'estadio', 'foguete', 'centrotec'],
    need: null,
    // Grande final: cumprir isto lança o foguete da vila.
    finale: { pop: 55, built: 70, has: ['foguete', 'aeroporto', 'centrotec'], research: 'espaco', prod: { energy: 1500 } } },
];
// Pesquisas: o chat vota qual estudar. "key" é a que abre caminho para a próxima era.
const RESEARCH = {
  ferramentas: { era: 0, icon: '🪓', label: 'Ferramentas de pedra', unlock: ['oficina'], fx: () => { res.tools += 6; return '+6 🔧 e a oficina liberada'; } },
  cestaria: { era: 0, icon: '🧺', label: 'Cestaria', unlock: ['deposito'], fx: () => { res.crops += 15; return 'Cestos para guardar comida: depósito liberado'; } },
  rituais: { era: 0, icon: '🪶', label: 'Rituais da tribo', unlock: ['totem'], fx: () => 'Totem liberado: a vila fica mais feliz' },
  agricultura: { era: 0, icon: '🌾', label: 'Agricultura', key: true, fx: () => 'Plantar em vez de só coletar!' },
  domesticacao: { era: 1, icon: '🐄', label: 'Domesticação', unlock: ['curral'], fx: () => 'Curral liberado' },
  moagem: { era: 1, icon: '🌀', label: 'Moagem', unlock: ['moinho'], fx: () => 'Moinho liberado: mais comida' },
  metalurgia: { era: 1, icon: '🔥', label: 'Metalurgia do bronze', key: true, fx: () => 'O fogo agora derrete metal' },
  comercio: { era: 2, icon: '⚖️', label: 'Comércio', unlock: ['mercado'], fx: () => { res.coins += 20; return 'Mercado liberado e +20 🪙'; } },
  mineracao: { era: 2, icon: '⛏️', label: 'Mineração profunda', unlock: ['mina'], fx: () => 'Mina liberada: ouro!' },
  ferro: { era: 2, icon: '⚙️', label: 'Fundição de ferro', key: true, fx: () => 'Ferro: mais forte que o bronze' },
  forja: { era: 3, icon: '⚒️', label: 'Forja', unlock: ['ferraria'], fx: () => { res.tools += 10; return 'Ferraria liberada e +10 🔧'; } },
  equitacao: { era: 3, icon: '🐎', label: 'Equitação', unlock: ['estabulo'], fx: () => 'Estábulo liberado' },
  engenharia: { era: 3, icon: '📐', label: 'Engenharia', key: true, fx: () => 'Pontes, estradas e aquedutos' },
  aquedutos: { era: 4, icon: '🌉', label: 'Aquedutos', unlock: ['aqueduto'], fx: () => 'Água corrente: aqueduto liberado' },
  medicina: { era: 4, icon: '🌿', label: 'Medicina antiga', unlock: ['clinica'], fx: () => 'Casa de cura liberada' },
  filosofia: { era: 4, icon: '🦉', label: 'Filosofia', key: true, fx: () => 'A vila começa a pensar grande' },
  monasterios: { era: 5, icon: '🕯️', label: 'Mosteiros', unlock: ['capela'], fx: () => 'Mosteiro liberado' },
  cavalaria: { era: 5, icon: '🐴', label: 'Cavalaria', fx: () => { L().defBonus = (L().defBonus || 0) + 10; return '+10 de defesa contra invasores'; } },
  feudalismo: { era: 5, icon: '🛡️', label: 'Feudalismo', key: true, fx: () => 'Castelos e senhores' },
  gotica: { era: 6, icon: '⛪', label: 'Arquitetura gótica', unlock: ['catedral'], fx: () => 'Catedral liberada' },
  imprensa: { era: 6, icon: '📰', label: 'Imprensa', fx: () => { res.coins += 80; return 'Notícias correm: +80 🪙'; } },
  universidades: { era: 6, icon: '🎓', label: 'Universidades', key: true, unlock: ['universidade'], fx: () => 'Universidade liberada: pesquisas mais rápidas' },
  polvora: { era: 7, icon: '💥', label: 'Pólvora', fx: () => { L().defBonus = (L().defBonus || 0) + 20; return '+20 de defesa contra piratas'; } },
  bancos: { era: 7, icon: '🏦', label: 'Bancos', unlock: ['banco'], fx: () => 'Banco liberado' },
  navegacao: { era: 7, icon: '🧭', label: 'Navegação oceânica', key: true, fx: () => 'Mares abertos' },
  vapor: { era: 8, icon: '♨️', label: 'Máquina a vapor', unlock: ['fabrica'], fx: () => 'Fábrica liberada' },
  ferrovia: { era: 8, icon: '🚂', label: 'Ferrovia', unlock: ['estacao'], fx: () => 'Estação de trem liberada' },
  carvao: { era: 8, icon: '🪨', label: 'Usina a carvão', unlock: ['usina'], fx: () => 'Usina liberada: ⚡ energia!' },
  eletricidade: { era: 8, icon: '⚡', label: 'Eletricidade', key: true, fx: () => 'Luz em todas as casas' },
  aviacao: { era: 9, icon: '✈️', label: 'Aviação', unlock: ['aeroporto'], fx: () => 'Aeroporto liberado' },
  computacao: { era: 9, icon: '💻', label: 'Computação', unlock: ['centrotec'], fx: () => 'Centro de tecnologia liberado' },
  espaco: { era: 9, icon: '🚀', label: 'Corrida espacial', unlock: ['foguete'], fx: () => 'Foguete liberado: rumo às estrelas!' },
};
function researchNeed(k) { return 150 + RESEARCH[k].era * 50; }
// Nomes das obras e profissões mudam com a era (ex.: Cabana → Casa de barro → Casa).
const ERA_NAMES = {
  casa: [[0, 'Cabana'], [2, 'Casa de barro'], [4, 'Casa']], serraria: [[0, 'Pátio da lenha'], [3, 'Serraria']],
  peixaria: [[0, 'Pesqueiro'], [6, 'Peixaria']], restaurante: [[0, 'Cozinha comunitária'], [7, 'Restaurante']],
  prefeitura: [[0, 'Palácio'], [7, 'Prefeitura']], delegacia: [[0, 'Posto da guarda'], [8, 'Delegacia']],
  escola: [[0, 'Academia'], [7, 'Escola']], teatro: [[0, 'Anfiteatro'], [6, 'Teatro']], capela: [[0, 'Mosteiro'], [7, 'Capela']],
  hotel: [[0, 'Estalagem'], [8, 'Hotel']], cais: [[0, 'Porto'], [8, 'Cais do Porto']], clinica: [[0, 'Casa de cura'], [8, 'Clínica']],
  correio: [[0, 'Casa dos mensageiros'], [7, 'Correio']],
};
const PROF_NAMES = {
  policial: [[0, 'Guarda', 'Guarda'], [8, 'Policial', 'Policial']], prefeito: [[0, 'Líder', 'Líder'], [7, 'Prefeito', 'Prefeita']],
  medico: [[0, 'Curandeiro', 'Curandeira'], [7, 'Médico', 'Médica']], carteiro: [[0, 'Mensageiro', 'Mensageira'], [7, 'Carteiro', 'Carteira']],
};
const ORIG = { bt: {}, prof: {} };
for (const k in ERA_NAMES) ORIG.bt[k] = BT[k].label;
for (const k in PROF_NAMES) ORIG.prof[k] = [PROF[k].label, PROF[k].labelF];
function applyEraNames() {
  const era = L().era;
  for (const k in ERA_NAMES) { let l = ORIG.bt[k]; for (const [e, n] of ERA_NAMES[k]) if (era >= e) l = n; BT[k].label = l; }
  for (const k in PROF_NAMES) { let l = ORIG.prof[k]; for (const [e, m, f] of PROF_NAMES[k]) if (era >= e) l = [m, f]; PROF[k].label = l[0]; PROF[k].labelF = l[1]; }
}
// Apelidos de profissão das primeiras eras.
for (const [a, p] of [['guarda', 'policial'], ['curandeiro', 'medico'], ['curandeira', 'medico'], ['mensageiro', 'carteiro'], ['mensageira', 'carteiro'],
  ['lider', 'prefeito'], ['chefe', 'prefeito'], ['construtor', 'pedreiro'], ['construtora', 'pedreiro'], ['coletor', 'fazendeiro'], ['coletora', 'fazendeiro'],
  ['agricultor', 'fazendeiro'], ['guerreiro', 'guerreiro'], ['guerreira', 'guerreiro'], ['soldado', 'guerreiro'], ['soldada', 'guerreiro'], ['lanceiro', 'guerreiro'], ['lanceira', 'guerreiro'], ['cavaleiro', 'guerreiro'], ['cavaleira', 'guerreiro'], ['defensor', 'guerreiro'], ['defensora', 'guerreiro'], ['vigia', 'guerreiro'], ['legionario', 'guerreiro'], ['espadachim', 'guerreiro'], ['pesquisador', 'cientista'], ['pesquisadora', 'cientista'], ['inventor', 'cientista'], ['inventora', 'cientista'], ['operaria', 'operario'], ['metalurgico', 'operario'], ['engenheira', 'engenheiro'], ['eletricista', 'engenheiro'], ['programadora', 'programador'], ['dev', 'programador'], ['desenvolvedor', 'programador'], ['desenvolvedora', 'programador'], ['hacker', 'programador'], ['agricultora', 'fazendeiro'], ['pastor', 'pecuarista'], ['pastora', 'pecuarista'], ['ferreira', 'ferreiro']]) PROF_ALIAS[norm(a)] = p;

function eraUnlocked(kind) { const out = []; for (let i = 0; i <= L().era; i++) out.push(...ERAS[i][kind]); return out; }
function eraOfProf(p) { return ERAS.findIndex(e => e.profs.includes(p)); }
// Obra liberada = da era atual ou anterior e sem pesquisa pendente.
function liveBldOk(t) {
  if (t === 'mansao' || t === 'monumento') return true;
  if (!eraUnlocked('blds').includes(t)) return false;
  const r = Object.keys(RESEARCH).find(k => (RESEARCH[k].unlock || []).includes(t));
  return !r || L().research.done.includes(r);
}
function availableBlds() { return eraUnlocked('blds').filter(liveBldOk); }
// Meta de população dá de presente uma obra da era (nunca um prédio do futuro).
function liveGoalGift(t) {
  if (t === 'LAUNCH' || t === 'festa' || liveBldOk(t)) return t;
  return availableBlds().find(k => BT[k].grp === 'c' && !isHouse(k) && !buildings.some(b => b.type === k) && !queue.some(q => q.type === k)) || 'festa';
}
// Casas mudam de material conforme a era.
const HOUSE_BY_ERA = [
  [0, [{ wall: 'log', roof: 'thatch' }, { wall: 'plank', roof: 'thatch' }]],
  [2, [{ wall: 'stone', roof: 'thatch' }, { wall: 'plaster', roof: 'thatch' }, { wall: 'log', roof: 'gable' }]],
  [4, [{ wall: 'stone', roof: 'hip' }, { wall: 'timber', roof: 'steep' }, { wall: 'plaster', roof: 'gable' }, { wall: 'brick', roof: 'gable' }]],
  [7, [{ wall: 'brick', roof: 'gable' }, { wall: 'plaster', roof: 'hip' }, { wall: 'timber', roof: 'steep' }, { wall: 'plank', roof: 'gable' }]],
];
function liveHouseStyles() { const era = liveState.era ?? 9; if (era >= 9) return HOUSE; let st = HOUSE_BY_ERA[0][1]; for (const [e, l] of HOUSE_BY_ERA) if (era >= e) st = l; return st; }
function restyleHouses() { for (const b of buildings) if (b.type === 'casa') { b._st = null; b._cache = null; } }

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
  if (s.viewers) {
    if (!Array.isArray(s.arrivals)) s.arrivals = [];
    if (!s.research) s.research = { done: [], cur: null };
    if (!s.prod) s.prod = { wood: 0, stone: 0, food: 0, gold: 0, iron: 0 };
    if (s.next.pesq == null) s.next.pesq = Date.now() + 20000;
    s.era = Math.min(s.era || 0, ERAS.length - 1);
    return s;
  }
  const old = Array.isArray(s.residents) ? s.residents : [];
  Object.assign(s, {
    v: 2, era: 0, viewers: {}, arrivals: [], research: { done: [], cur: null }, prod: { wood: 0, stone: 0, food: 0, gold: 0, iron: 0 }, vote: null, chal: null, feed: [], raised: 0, goal: 50, voteN: 0,
    next: { pesq: Date.now() + 20000, obra: Date.now() + 60000, dilema: Date.now() + LIVE_CFG.dilemaMin * 60000, chal: Date.now() + 90000 },
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
  if (now - v.last > 15000) { v.last = now; addXp(v, 1); researchAdd(3); const n = npcOf(v); if (n) n.boost = Math.max(n.boost || 0, 45); }

  const arrive = text.match(/^@\s*([^/|]{1,24}?)\s*[/|]\s*(.{2,30})$/u) || text.match(/^!morador\s+([^/|]{1,24}?)\s*[/|]\s*(.{2,30})$/iu);
  if (arrive) return requestArrival(v, uid, arrive[1].trim(), arrive[2].trim());

  const lower = norm(text);
  const vote = L().vote;
  const m = lower.match(/^!?votar\s+(.+)$/) || lower.match(/^!?([1-4]|[ab])$/);
  if (m && vote) return castVote(v, uid, m[1]);
  if (/^!(defender|defesa)\b/.test(lower)) return defend(v, uid);
  if (/^!ajudar\b/.test(lower)) return help(v, uid);
  if (/^!meu\b/.test(lower)) return showMine(v);
  if (/^!top\b/.test(lower)) { showTop = Date.now() + 15000; return 'Ranking na tela.'; }
  if (/^!era\b/.test(lower)) { const e = ERAS[L().era]; announce(`${e.icon} ${e.name}`, eraNeedText() || 'Última era!'); return ''; }
  if (/^!(ajuda|comandos)\b/.test(lower)) { showHelp = Date.now() + 15000; return 'Comandos na tela.'; }
  if (lower.startsWith('!')) return 'Comandos: @Nome/profissão, 1-4, A/B, !ajudar, !defender, !meu, !top, !era.';

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
  if (pend) feed(`🎓 ${n.name} chegou como aprendiz: vira ${PROF[pend].label} na ${ERAS[eraOfProf(pend)].name}`);
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
  let pool = availableBlds().filter(t => BT[t] && !busy.has(t) && (t === 'casa' || t === 'sobrado' || built(t) < 1));
  // Obras que a era exige vêm primeiro; depois as mais novas.
  const needed = ERAS[L().era].need?.has || [];
  pool.sort((a, b) => (needed.includes(b) - needed.includes(a)) || (ERAS.findIndex(e => e.blds.includes(b)) - ERAS.findIndex(e => e.blds.includes(a))) || Math.random() - 0.5);
  let opts = pool.filter(t => !isHouse(t)).slice(0, 4).sort(() => Math.random() - 0.5).slice(0, 2);
  const house = (homeless > 0 || !buildings.some(b => isHouse(b.type))) && pool.includes('casa') ? 'casa' : null;
  if (house) opts.unshift(house); else { const extra = pool.find(t => !opts.includes(t)); if (extra) opts.push(extra); }
  opts = opts.slice(0, 3);
  if (opts.length < 2) { s.next.obra = Date.now() + 60000; return false; }
  s.vote = { kind: 'obra', id: ++s.voteN, title: '🗳️ Qual será a próxima obra?', opts: opts.map(t => ({ k: t, label: BT[t].icon + ' ' + BT[t].label })), ballots: {}, ends: Date.now() + LIVE_CFG.voteSec * 1000 };
  announce('🗳️ VOTAÇÃO ABERTA!', 'Digite ' + opts.map((t, i) => `${i + 1} = ${BT[t].label}`).join(' · '));
  sfx('chime'); liveDirty = true; return true;
}
function availableResearch() {
  const s = L();
  return Object.keys(RESEARCH).filter(k => RESEARCH[k].era <= s.era && !s.research.done.includes(k));
}
function openResearchVote() {
  const s = L(), list = availableResearch();
  if (!list.length || s.research.cur) return false;
  // A pesquisa-chave da era sempre entra entre as opções.
  const key = list.find(k => RESEARCH[k].key && RESEARCH[k].era === s.era);
  const opts = (key ? [key] : []).concat(list.filter(k => k !== key).sort(() => Math.random() - 0.5)).slice(0, 3).sort(() => Math.random() - 0.5);
  if (opts.length === 1) { startResearch(opts[0]); return true; }
  s.vote = { kind: 'pesquisa', id: ++s.voteN, title: '🔬 O que a vila vai descobrir?', opts: opts.map(k => ({ k, label: RESEARCH[k].icon + ' ' + RESEARCH[k].label })), ballots: {}, ends: Date.now() + LIVE_CFG.voteSec * 1000 };
  announce('🔬 PESQUISA!', 'Digite ' + opts.map((k, i) => `${i + 1} = ${RESEARCH[k].label}`).join(' · '));
  sfx('chime'); liveDirty = true; return true;
}
function startResearch(k) {
  const s = L();
  s.research.cur = { k, prog: 0, need: researchNeed(k) };
  announce(`🔬 Pesquisando: ${RESEARCH[k].label}`, 'Conversar no chat e !ajudar aceleram a descoberta');
  feed(`🔬 A vila começou a pesquisar ${RESEARCH[k].icon} ${RESEARCH[k].label}`);
  liveDirty = true; save();
}
function researchMult() {
  const count = t => buildings.filter(b => b.done && b.type === t).length;
  return 1 + 0.25 * count('universidade') + 0.5 * count('centrotec') + Math.min(0.5, countProf('cientista') * 0.05);
}
function researchAdd(v) {
  const c = L().research.cur; if (!c) return;
  c.prog += v * researchMult(); if (c.prog >= c.need) finishResearch();
}
function finishResearch() {
  const s = L(), c = s.research.cur; if (!c) return;
  const r = RESEARCH[c.k];
  s.research.cur = null; if (!s.research.done.includes(c.k)) s.research.done.push(c.k); s.next.pesq = Date.now() + 45000;
  const msg = r.fx ? r.fx() : '';
  announce(`💡 DESCOBERTA: ${r.label}!`, msg);
  feed(`💡 ${r.icon} ${r.label} descoberta! ${msg}`);
  logEv(`💡 Descoberta: ${r.label}`);
  sfx('fanfare'); for (let i = 0; i < 5; i++) firework();
  queueUnlockedProfBuildings(); lastTry = -99; save(); liveDirty = true;
}
function queueUnlockedProfBuildings() { for (const p in profCount) if (profCount[p] > 0) queueProfBuilding(p); }
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
  else i = vote.opts.findIndex(o => norm(vote.kind === 'pesquisa' ? RESEARCH[o.k].label : BT[o.k].label).startsWith(raw) || o.k === raw);
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
  if (vote.kind === 'pesquisa') {
    startResearch(win.k);
  } else if (vote.kind === 'obra') {
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
  if (Date.now() - (v.help || 0) < 8000) return '';
  v.help = Date.now();
  if (L().research.cur) { researchAdd(5); addXp(v, 2); }
  if (!c || c.track !== 'help') return n ? 'Seu morador ganhou ânimo!' : 'Sem mutirão agora.';
  addXp(v, 2); chalAdd(uid, 1); return '';
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
  const merc = raidMercs(amount, v.name); if (merc) perks.push(merc);
  if (amount >= 10) {
    const site = buildings.find(b => !b.done);
    if (site) { site.startedAt = (site.startedAt ?? gtime) - 90; addProgress(site, site.need * 0.4); perks.push(`obra relâmpago em ${BT[site.type].label}`); }
    const ev = Object.keys(DONATION_EVENTS).find(k => lower.includes('!' + k));
    if (ev) { setTimeout(() => startEvent(DONATION_EVENTS[ev]), 4500); perks.push('evento: ' + ev); }
  }
  if (amount >= 25) {
    const m = lower.match(/!obra\s+([a-z -]+)/);
    const want = m ? m[1].trim() : '';
    const type = want && availableBlds().find(t => { const l = norm(BT[t].label); return want.startsWith(l) || l.startsWith(want.split(' ')[0]); });
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
const PROD_L = { wood: ['🪵', 'madeira'], stone: ['🪨', 'pedra'], food: ['🍖', 'comida'], gold: ['🪙', 'ouro'], iron: ['⚙️', 'ferro'], energy: ['⚡', 'energia'] };
function eraProgress() {
  const s = L(), e = ERAS[s.era], n = e.need || (!s.finale && e.finale); if (!n) return null;
  const done = buildings.filter(b => b.done);
  const items = [
    { t: `👥 ${npcs.length}/${n.pop}`, ok: npcs.length >= n.pop, f: Math.min(1, npcs.length / n.pop) },
    { t: `🏗️ ${done.length}/${n.built}`, ok: done.length >= n.built, f: Math.min(1, done.length / n.built) },
    ...n.has.map(k => { const ok = done.some(b => b.type === k); return { t: `${BT[k].icon} ${BT[k].label}`, ok, f: ok ? 1 : 0 }; }),
    ...Object.entries(n.prod || {}).map(([k, v]) => { const have = Math.floor(s.prod[k] || 0); return { t: `${PROD_L[k][0]} ${fmt(Math.min(have, v))}/${fmt(v)}`, ok: have >= v, f: Math.min(1, have / v) }; }),
  ];
  if (n.research) { const ok = s.research.done.includes(n.research), r = RESEARCH[n.research]; items.push({ t: `${r.icon} ${r.label}`, ok, f: ok ? 1 : 0 }); }
  return { items, f: items.reduce((a, i) => a + i.f, 0) / items.length, ok: items.every(i => i.ok) };
}
// Final do jogo: o foguete da vila decola. Acontece uma vez por mundo.
function launchFinale() {
  const s = L(); if (s.finale) return;
  s.finale = Date.now();
  const r = buildings.find(b => b.type === 'foguete' && b.done);
  if (r) { EV.launch = { b: r.id, t: 0 }; camTo((r.x + 1.5) * T, r.y * T); }
  EV.party = Math.max(EV.party, 90);
  const top = topViewers(3).map((v, i) => `${i + 1}º ${v.name}`).join(' · ');
  announce('🚀 A VILA CHEGOU AO ESPAÇO!', `${villageName} completou as 10 eras!` + (top ? ' ' + top : ''));
  feed(`🚀 O foguete decolou! ${villageName} completou as 10 eras. Obrigado, chat!`);
  logEv('🚀 Fim das 10 eras: o foguete decolou!');
  addHL(5, '🚀 O foguete da vila decolou', CX * T + 8, CY * T + 8);
  sfx('fanfare'); for (let i = 0; i < 30; i++) setTimeout(() => firework(), i * 300);
  for (const v of Object.values(s.viewers)) if (npcOf(v)) addXp(v, 50);
  showTop = Date.now() + 30000;
  save();
}
function eraNeedText() { const p = eraProgress(); return p ? 'Próxima era: ' + p.items.map(i => (i.ok ? '✅ ' : '') + i.t).join(' · ') : ''; }
function eraUp() {
  const s = L(); if (s.era >= ERAS.length - 1) return;
  s.era++;
  const e = ERAS[s.era];
  applyEraNames(); restyleHouses();
  announce(`${e.icon} NOVA ERA: ${e.name.toUpperCase()}!`, 'Novas obras, profissões e descobertas');
  feed(`${e.icon} A vila chegou à ${e.name}!` + (e.profs.length ? ` Novas profissões: ${e.profs.map(p => PROF[p].label).join(', ')}` : ''));
  logEv(`${e.icon} Nova era: ${e.name}`);
  sfx('fanfare'); for (let i = 0; i < 14; i++) setTimeout(() => firework(), i * 250);
  addHL(5, `${e.icon} A vila chegou à ${e.name}`, CX * T + 8, CY * T + 8);
  for (const v of Object.values(s.viewers)) {
    const n = npcOf(v); if (!n || !v.pend || !eraUnlocked('profs').includes(v.pend)) continue;
    profCount.custom = Math.max(0, (profCount.custom || 0) - 1);
    n.prof = v.pend; n.custom = ''; v.pend = null;
    profCount[n.prof] = (profCount[n.prof] || 0) + 1;
    npcColors(n); addXp(v, 20);
    say(n, `Agora sou ${profLabel(n)}! 🎓`); feed(`🎓 ${n.name} se formou: ${profLabel(n)}`);
  }
  queueUnlockedProfBuildings();
  s.next.pesq = Math.min(s.next.pesq, Date.now() + 30000);
  npcVer++; lastTry = -99; save(); refreshPanel(true);
}
// Produção total: tudo que entra nos estoques conta (trabalho, doações, prêmios).
let prodLast = null;
function trackProduction() {
  const s = L();
  const cur = { wood: res.wood, stone: res.stone, food: res.fish + res.crops + res.meals, gold: res.coins, iron: res.iron || 0, energy: res.energy || 0 };
  if (prodLast) for (const k in cur) { const d = cur[k] - prodLast[k]; if (d > 0) s.prod[k] = (s.prod[k] || 0) + d; }
  prodLast = cur;
}
// Produção automática dos prédios novos (a cada ~5s).
function buildingProduction() {
  const era = L().era, count = t => buildings.filter(b => b.done && b.type === t).length;
  const of = count('oficina'); if (of && res.tools < toolCap()) res.tools += of;
  const mo = count('moinho'); if (mo) res.crops += mo * (hasProf('fazendeiro') ? 3 : 1);
  const mi = count('mina');
  if (mi && era >= 2) res.coins += mi * (hasProf('minerador') ? 2 : 1);
  if (mi && era >= 3) res.iron = (res.iron || 0) + mi * (hasProf('ferreiro') || hasProf('minerador') ? 2 : 1);
  const fe = count('ferraria'); if (fe && era >= 3) res.iron = (res.iron || 0) + fe;
  const aq = count('aqueduto'); if (aq) res.crops += aq * 2;
  const fa = count('fabrica'); if (fa && era >= 8) { const k = hasProf('operario') ? 2 : 1; res.coins += fa * 3 * k; if (res.tools < toolCap()) res.tools += fa; }
  const us = count('usina'); if (us && era >= 8) res.energy = (res.energy || 0) + us * 3 * (hasProf('engenheiro') ? 2 : 1);
  const ct = count('centrotec'); if (ct && era >= 9) res.energy = (res.energy || 0) + ct;
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
  trackProduction();
  raidTick(now);
  if (s.research.cur) researchAdd(0.5);
  if (LIVE_CFG.auto && npcs.length) {
    if (!s.vote && !s.research.cur && now >= s.next.pesq && now - (s.lastClose || 0) > 20000 && availableResearch().length) { if (openResearchVote()) s.lastClose = now; }
    else if (!s.vote && now >= s.next.obra && now - (s.lastClose || 0) > 20000) { if (openObraVote()) s.lastClose = now; }
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
    buildingProduction();
    const p = eraProgress(); if (p && p.ok) { if (ERAS[s.era].need) eraUp(); else launchFinale(); }
  }
  renderLiveHud();
}

// ================== OVERLAY DA LIVE ==================
function bar(f, cls = '') { return `<div class="lbar ${cls}"><i style="width:${(Math.max(0, Math.min(1, f)) * 100).toFixed(1)}%"></i></div>`; }
function secs(t) { const s = Math.max(0, Math.ceil((t - Date.now()) / 1000)); return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : s + 's'; }
let lastHud = '';
function renderLiveHud() {
  const s = L(), e = ERAS[s.era], p = eraProgress();
  let h = `<div class="lh-era"><b>${e.icon} ${esc(e.name)}${!e.need && !s.finale ? ' · rumo ao espaço' : ''}</b> <span class="tm">${s.era + 1}/${ERAS.length}</span>`;
  if (p) h += bar(p.f) + `<small>${p.items.map(i => `<span class="${i.ok ? 'ok' : ''}">${esc(i.t)}</span>`).join(' ')}</small>`;
  else h += s.finale ? '<small>🏆 Vila completa: o foguete decolou!</small>' : '<small>Era final</small>';
  h += '</div>';
  const rd = s.raid;
  if (rd) {
    const def = rd.phase === 'warn' ? raidDefense(rd) : rd.def;
    if (rd.phase === 'warn') h += `<div class="lh-box raid"><b>⚔️ ${esc(rd.kind || 'Saqueadores')} ao ${esc(rd.dir)}!</b> <span class="tm">⏱ ${secs(rd.ends)}</span><div class="opt"><span>🛡️ Defesa</span><em>${def}</em>${bar(def / Math.max(def, rd.str), 'c')}</div><div class="opt"><span>🗡️ Saqueadores</span><em>${rd.str}</em>${bar(rd.str / Math.max(def, rd.str), 'r')}</div><small>Digite <b>!defender</b> · Pix e Super Chat contratam mercenários</small></div>`;
    else h += `<div class="lh-box raid"><b>${rd.phase === 'fight' ? '⚔️ Batalha!' : rd.win ? '🛡️ Vitória da vila!' : '💥 Saque…'}</b><small>🛡️ ${def} contra 🗡️ ${rd.str}</small></div>`;
  }
  const rc = s.research.cur;
  if (rc) { const r = RESEARCH[rc.k]; h += `<div class="lh-box chal"><b>🔬 ${r.icon} ${esc(r.label)}</b> <span class="tm">${Math.floor(Math.min(1, rc.prog / rc.need) * 100)}%</span>${bar(rc.prog / rc.need, 'c')}<small>Conversar no chat e <b>!ajudar</b> aceleram</small></div>`; }
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
  <div class="row"><button class="btn sm" id="lvVote">🗳️ Votar obra</button><button class="btn sm" id="lvPesq">🔬 Pesquisa</button><button class="btn sm" id="lvDil">🤔 Dilema</button><button class="btn sm" id="lvChal">🏆 Desafio</button><button class="btn sm" id="lvRaid">⚔️ Ataque</button><button class="btn sm red" id="lvClose">⏹ Apurar agora</button></div>
  <label><input type="checkbox" id="lvAuto"> Ciclo automático (votações, dilemas e desafios)</label>
  <label><input type="checkbox" id="lvRaids"> Ataques de saqueadores (a partir da Era Agrícola, com 5 moradores)</label>
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
$('lvRaids').checked = LIVE_CFG.raids; $('lvRaids').onchange = e => { LIVE_CFG.raids = e.target.checked; liveSaveCfg(); };
$('lvRaid').onclick = () => { if (!npcs.length) { $('lvFeedback').textContent = 'A vila ainda não tem moradores.'; return; } $('lvFeedback').textContent = startRaid(true) ? 'Ataque anunciado!' : 'Já há um ataque em andamento.'; };
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
$('lvPesq').onclick = () => { if (L().vote) closeVote(); if (L().research.cur) { $('lvFeedback').textContent = 'Já há uma pesquisa em andamento.'; return; } if (!openResearchVote()) $('lvFeedback').textContent = 'Nenhuma pesquisa disponível nesta era.'; };
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

// ================== SAQUEADORES ==================
// Ciclo: aviso (90 s, o chat se prepara) → batalha na tela → resultado.
// Defesa = estruturas + guerreiros/guardas/caçadores + chat (!defender) + doações (mercenários).
const RAID_WARN = 90000, RAID_FIGHT = 9;
const DEF_STRUCT = { palicada: 10, muralha: 25, torre: 12, castelo: 60, delegacia: 8, estabulo: 5 };
const DIRS_NAME = [['norte', 0, -1], ['sul', 0, 1], ['leste', 1, 0], ['oeste', -1, 0]];
PROF.saqueador = { label: 'Saqueador', labelF: 'Saqueadora', icon: '🗡️', shirt: '#4a1a1a', hat: 'helmet', hatC: '#5a5a5a' };
let raiders = [];
// Quem ataca muda com a época; piratas vêm sempre do mar (leste).
function raiderKind() {
  const era = L().era;
  if (era >= 8) return { plural: 'Bandidos', hat: 'cap', hatC: '#1a1a1a', shirt: '#2f2f36' };
  if (era === 7) return { plural: 'Piratas', hat: 'top', hatC: '#1a1a1a', shirt: '#8e1f1f', dir: 'leste' };
  if (era >= 5) return { plural: 'Invasores', hat: 'helmet', hatC: '#3d3d44', shirt: '#2f4f2f' };
  return { plural: 'Saqueadores', hat: 'helmet', hatC: '#5a5a5a', shirt: '#4a1a1a' };
}

function raidStructDefense() {
  let d = 0; for (const b of buildings) if (b.done && DEF_STRUCT[b.type]) d += DEF_STRUCT[b.type]; return d;
}
function raidUnitDefense() {
  const iron = buildings.some(b => b.done && b.type === 'ferraria') ? 1.5 : 1;
  return Math.round(countProf('guerreiro') * 8 * iron + countProf('policial') * 6 + countProf('cacador') * 3);
}
function raidDefense(r) { return raidStructDefense() + raidUnitDefense() + (L().defBonus || 0) + Math.round(r.chat) + Math.round(r.merc); }
function raidPossible() { return L().era >= 1 && npcs.length >= 5 && !isNight() && hour() < 17.5; }

function startRaid(manual) {
  const s = L();
  if (s.raid) return false;
  if (!manual && !raidPossible()) return false;
  const K = raiderKind();
  const [dn, dx, dy] = K.dir ? DIRS_NAME.find(d => d[0] === K.dir) : pick(DIRS_NAME);
  const str = Math.round((12 + s.era * 14 + npcs.length * 1.2 + (s.raidsN || 0) * 4) * rnd(0.85, 1.15));
  s.raid = { phase: 'warn', kind: K.plural, dir: dn, dx, dy, str, chat: 0, merc: 0, help: {}, ends: Date.now() + RAID_WARN };
  s.raidsN = (s.raidsN || 0) + 1;
  announce(`⚔️ ${K.plural.toUpperCase()} AO ${dn.toUpperCase()}!`, 'Chegam em 90 s. Digite !defender para preparar a vila!');
  feed(`⚔️ ${K.plural} vistos ao ${dn}! Força ${str}. Digite !defender`);
  sfx('siren');
  const tx = CX + dx * (clearR() + 2), ty = CY + dy * (clearR() + 2);
  camTo(tx * T + 8, ty * T + 8);
  for (const n of npcs) if (n.active && ['guerreiro', 'policial'].includes(n.prof)) { n.plan = [goNear(tx, ty, 4), work(4, 'hammer', null)]; n.step = null; n.status = 'Preparando a defesa ⚔️'; say(n, pick(['Às armas! ⚔️', 'Todos aos postos!', 'Eles não passam!'])); }
  liveDirty = true; save();
  return true;
}
function defend(v, uid) {
  const r = L().raid;
  if (!r || r.phase !== 'warn') return 'Sem ataque agora.';
  const k = r.help[uid] || 0;
  if (k >= 3 || Date.now() - (v.def || 0) < 6000) return '';
  v.def = Date.now(); r.help[uid] = k + 1; r.chat += 2; addXp(v, 2);
  const n = npcOf(v); if (n) { n.boost = Math.max(n.boost || 0, 60); say(n, pick(['Pronto pra lutar! 🛡️', 'Afiando a lança!', 'Reforçando a cerca!'])); }
  liveDirty = true; return '';
}
function raidMercs(amount, who) {
  const r = L().raid; if (!r || r.phase === 'done') return '';
  r.merc += Math.round(amount * 2);
  feed(`💰 ${who} contratou mercenários: +${Math.round(amount * 2)} de defesa`);
  return 'mercenários contra os ' + (r.kind || 'Saqueadores').toLowerCase();
}

function raidAttack() {
  const s = L(), r = s.raid; if (!r) return;
  r.phase = 'fight'; r.def = raidDefense(r); r.win = r.def >= r.str; r.t = 0;
  const K = raiderKind(); Object.assign(PROF.saqueador, { hat: K.hat, hatC: K.hatC, shirt: K.shirt });
  const R = clearR(), mx = CX + r.dx * (R * 0.7), my = CY + r.dy * (R * 0.7);
  r.meet = { x: mx * T + 8, y: my * T + 12 };
  const k = clamp(Math.round(r.str / 8), 3, 10);
  raiders = [];
  for (let i = 0; i < k; i++) {
    const off = (i - (k - 1) / 2) * 1.6;
    const sx = (CX + r.dx * (R + 12) + (r.dy ? off : 0)) * T + 8, sy = (CY + r.dy * (R + 12) + (r.dx ? off : 0)) * T + 12;
    raiders.push({ x: sx, y: sy, hx: sx, hy: sy, tx: r.meet.x + rnd(-14, 14), ty: r.meet.y + rnd(-10, 10), dir: 'down', moving: false, walkT: 0, anim: null, animT: 0,
      sex: Math.random() < 0.3 ? 'f' : 'm', skin: pick(SKINS), hairC: '#141414', pants: '#2f2f36', shirt: raiderKind().shirt, prof: 'saqueador', beard: Math.random() < 0.5, carry: null, a: 1 });
  }
  // Defensores correm para o ponto de encontro.
  const tile = { x: Math.round(mx), y: Math.round(my) };
  const fighters = npcs.filter(n => n.active && !n.inside && ['guerreiro', 'policial', 'cacador'].includes(n.prof));
  const extra = npcs.filter(n => n.active && !n.inside && !fighters.includes(n)).slice(0, Math.min(8, Object.keys(r.help).length * 2));
  for (const n of fighters.concat(extra)) { n.plan = [goNear(tile.x, tile.y, 3), work(RAID_FIGHT + 4, 'hammer', null)]; n.step = null; n.sleeping = false; n.status = 'Defendendo a vila ⚔️'; }
  announce('⚔️ ATAQUE!', `🛡️ Defesa ${r.def} contra 🗡️ ${r.str}`);
  sfx('thunder'); camTo(r.meet.x, r.meet.y); follow = null;
  liveDirty = true;
}
function raidFrame(dt) {
  const r = L().raid;
  if (!raiders.length) return;
  const sp = SPEED * 0.85 * dt;
  for (const z of raiders) {
    const dx = z.tx - z.x, dy = z.ty - z.y, d = Math.hypot(dx, dy);
    z.moving = d > 1;
    if (z.moving) { const m = Math.min(d, sp); z.x += dx / d * m; z.y += dy / d * m; z.walkT += m / 8; z.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); z.anim = null; }
    else if (r && r.phase === 'fight') { z.anim = 'hammer'; z.animT += dt; }
    if (z.fade) z.a -= dt * 0.5;
  }
  raiders = raiders.filter(z => z.a > 0);
  if (!r) { if (!raiders.length) raiders = []; return; }
  if (r.phase === 'fight') {
    const arrived = raiders.every(z => !z.moving);
    if (arrived || r.t > 0) {
      r.t += dt;
      if (Math.random() < dt * 6) { const z = pick(raiders); burst(z.x + rnd(-8, 8), z.y - 6, pick(['#d9a36a', '#cfd6de', '#ffe066']), 4); }
      if (Math.random() < dt * 2) floatTxt(r.meet.x + rnd(-20, 20), r.meet.y - 20, '⚔️');
      if (r.t >= RAID_FIGHT) raidResolve();
    }
  } else if (r.phase === 'flee' && !raiders.length) {
    L().raid = null; liveDirty = true;
  }
}
function raidResolve() {
  const s = L(), r = s.raid; if (!r || r.phase !== 'fight') return;
  r.phase = 'flee';
  s.next.raid = Date.now() + LIVE_CFG.raidMin * 60000;
  const helpers = Object.keys(r.help).map(uid => s.viewers[uid]).filter(Boolean);
  const owners = Object.values(s.viewers).filter(v => { const n = npcOf(v); return n && ['guerreiro', 'policial', 'cacador'].includes(n.prof); });
  if (r.win) {
    const loot = Math.round(r.str * 1.5);
    if (s.era >= 2) res.coins += loot; else res.wood += loot;
    for (const v of new Set(helpers.concat(owners))) addXp(v, 15);
    s.raidsWon = (s.raidsWon || 0) + 1;
    announce('🛡️ VITÓRIA!', `Os ${(r.kind || 'Saqueadores').toLowerCase()} fugiram e deixaram ${loot} ${s.era >= 2 ? '🪙' : '🪵'} para trás`);
    feed(`🛡️ A vila venceu os ${(r.kind || 'Saqueadores').toLowerCase()} (${r.def} contra ${r.str})! ${helpers.length} pessoa(s) do chat ajudaram`);
    sfx('fanfare'); for (let i = 0; i < 6; i++) firework();
    for (const z of raiders) { z.tx = z.hx; z.ty = z.hy; z.fade = true; }
  } else {
    const pct = clamp(0.15 + (r.str - r.def) / r.str * 0.15, 0.15, 0.3);
    const lost = {};
    for (const k of ['wood', 'stone', 'fish', 'crops', 'meals', 'coins']) { const q = Math.floor((res[k] || 0) * pct); if (q > 0) { res[k] -= q; lost[k] = q; } }
    for (const v of helpers) addXp(v, 5);
    const txt = Object.entries(lost).map(([k, q]) => `${q} ${RES_ICON[k]}`).join(' ') || 'quase nada';
    announce(`💥 Os ${(r.kind || 'Saqueadores').toLowerCase()} venceram…`, `Levaram ${txt}. Construam defesas!`);
    feed(`💥 ${r.kind || 'Saqueadores'} levaram ${txt} (${r.def} contra ${r.str})`);
    for (const z of raiders) { z.tx = CRX * T + 8 + rnd(-10, 10); z.ty = CRY * T + 12 + rnd(-6, 6); }
    setTimeout(() => { for (const z of raiders) { z.carry = 'wood'; z.tx = z.hx; z.ty = z.hy; z.fade = true; } }, 6000);
    if (Math.random() < 0.35) setTimeout(() => startEvent('fire'), 3000);
  }
  for (const n of npcs) if (n.status === 'Defendendo a vila ⚔️') { n.plan = []; n.step = null; n.anim = null; say(n, r.win ? pick(['Vitória! 🎉', 'Corram, saqueadores!', 'Ninguém mexe na nossa vila!']) : pick(['Eles levaram tudo…', 'Precisamos de muralhas!']), 0.6); }
  save(); liveDirty = true;
}
function raidTick(now) {
  const s = L(), r = s.raid;
  if (r && r.phase === 'warn' && now >= r.ends) raidAttack();
  // Segurança: se a batalha não andar (aba parada), resolve sem esperar a animação.
  if (r && r.phase === 'fight' && now - r.ends > 60000) { raidResolve(); raiders = []; s.raid = null; }
  if (r && r.phase === 'flee' && now - r.ends > 90000) { raiders = []; s.raid = null; }
  if (!r && LIVE_CFG.auto && LIVE_CFG.raids && now >= (s.next.raid || 0) && raidPossible()) {
    if (!s.next.raid) s.next.raid = now + 5 * 60000; else startRaid(false);
  }
}
function liveWorldEntities() { return raiders.map(z => ({ y: z.y, k: 'live', draw: () => { ctx.save(); ctx.globalAlpha = clamp(z.a, 0, 1); drawNPC(z); ctx.restore(); } })); }

// ================== MODO VITRINE ==================
// Live aberta sem ninguém: o mundo não pode parecer congelado.
// Vazio → câmera passeia pela clareira e o cartão de entrada mostra exemplos.
// Com moradores e chat parado há 3 min → câmera visita obras e moradores e mostra o resumo da vila.
const VIT_IDLE = 3 * 60000, VIT_SHOT = 12000, VIT_SUMMARY = 60000;
const vit = { target: null, shotAt: 0, summaryAt: 0, on: false };
function vitrineActive() {
  if (!LIVE_CFG.vitrine || TOUR || REC) return false;
  if (Date.now() - lastUserCam < 60000) return false;
  if (follow != null || Date.now() < camQ.until || L().arrivals.length || L().raid) return false;
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
  announce(`${e.icon} ${villageName}`, `${fmt(npcs.length)} morador${npcs.length === 1 ? '' : 'es'} · ${built} obra${built === 1 ? '' : 's'} · ${e.name}${top ? ' · Fundadores: ' + top : ''}`);
  showTop = Date.now() + 15000;
}
const EMPTY_EX = ['@Ana/lenhadora', '@Leo/pedreiro', '@Bia/pescadora', '@Rafa/minerador', '@Duda/pedreira', '@Caio/caçador'];
let vitLast = performance.now();
function vitrineFrame(now) {
  const dt = Math.min(0.1, (now - vitLast) / 1000); vitLast = now;
  const on = vitrineActive();
  try { raidFrame(dt); } catch (e) { console.error('saqueadores:', e); }
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
  if (s.raid) { s.raid = null; changed = true; }
  s.next.raid = Math.max(s.next.raid || 0, now + 5 * 60000);
  if (s.vote) s.vote.ends = Math.max(s.vote.ends, now + 30000);
  if (s.chal) s.chal.ends = Math.max(s.chal.ends, now + 60000);
  s.next.obra = Math.max(s.next.obra, now + 60000);
  s.next.dilema = Math.max(s.next.dilema, now + LIVE_CFG.dilemaMin * 60000);
  s.next.chal = Math.max(s.next.chal, now + 120000);
  for (const v of Object.values(s.viewers)) { const n = npcOf(v); if (n) { n.liveTag = '@' + v.name; n.liveLv = level(v); } }
  applyEraNames(); restyleHouses();
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
