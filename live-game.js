// Mundo Pixelândia LIVE — motor do jogo controlado pelo chat.
// Carregado depois do script principal: usa as funções e o estado globais da vila.
'use strict';

// ================== CONFIGURAÇÃO ==================
const LIVE_CFG_KEY = 'pixelandia-live-config-v1';
const LIVE_CFG = Object.assign({
  ytKey: '', ytVideo: '', bridgeUrl: 'http://localhost:8787/eventos',
  auto: true, vitrine: true, raids: true, autoEv: true, evMin: 10, autoSeason: true, seasonDays: 5, hideStudio: true, raidMin: 15, voteMin: 4, dilemaMin: 7, chalMin: 6, voteSec: 75,
}, (() => { try { return JSON.parse(localStorage.getItem(LIVE_CFG_KEY) || '{}'); } catch (e) { return {}; } })());
function liveSaveCfg() { try { localStorage.setItem(LIVE_CFG_KEY, JSON.stringify(LIVE_CFG)); } catch (e) {} }

// ================== ERAS ==================
// 10 eras. Cada uma libera profissões e obras; pesquisas votadas pelo chat liberam o resto.
// need = requisitos para SAIR da era: população, obras prontas, prédios, pesquisa-chave
// e produção TOTAL (o que a vila já produziu, não o que tem guardado: construir não atrasa a era).
const ERAS = [
  { name: 'Era da Pedra', icon: '⛰️',
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
  rituais: { era: 0, icon: '🔮', label: 'Rituais da tribo', unlock: ['totem'], fx: () => 'Totem liberado: a vila fica mais feliz' },
  agricultura: { era: 0, icon: '🌾', label: 'Agricultura', key: true, fx: () => 'Plantar em vez de só coletar!' },
  domesticacao: { era: 1, icon: '🐄', label: 'Domesticação', unlock: ['curral'], fx: () => 'Curral liberado' },
  moagem: { era: 1, icon: '🌀', label: 'Moagem', unlock: ['moinho'], fx: () => 'Moinho liberado: mais comida' },
  metalurgia: { era: 1, icon: '🔥', label: 'Metalurgia do bronze', key: true, fx: () => 'O fogo agora derrete metal' },
  comercio: { era: 2, icon: '⚖️', label: 'Comércio', unlock: ['mercado'], fx: () => { res.coins += 20; return 'Mercado liberado e +20 💰'; } },
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
  imprensa: { era: 6, icon: '📰', label: 'Imprensa', fx: () => { res.coins += 80; return 'Notícias correm: +80 💰'; } },
  universidades: { era: 6, icon: '🎓', label: 'Universidades', key: true, unlock: ['universidade'], fx: () => 'Universidade liberada: pesquisas mais rápidas' },
  polvora: { era: 7, icon: '💥', label: 'Pólvora', fx: () => { L().defBonus = (L().defBonus || 0) + 20; return '+20 de defesa contra piratas'; } },
  bancos: { era: 7, icon: '🏦', label: 'Bancos', unlock: ['banco'], fx: () => 'Banco liberado' },
  navegacao: { era: 7, icon: '🧭', label: 'Navegação oceânica', key: true, fx: () => 'Mares abertos' },
  vapor: { era: 8, icon: '♨️', label: 'Máquina a vapor', unlock: ['fabrica'], fx: () => 'Fábrica liberada' },
  ferrovia: { era: 8, icon: '🚂', label: 'Ferrovia', unlock: ['estacao'], fx: () => 'Estação de trem liberada' },
  carvao: { era: 8, icon: '⛰️', label: 'Usina a carvão', unlock: ['usina'], fx: () => 'Usina liberada: ⚡ energia!' },
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
  { t: '🧳 Um mercador viajante quer 30 🌲 por 6 ferramentas',
    a: ['Trocar', () => { if (res.wood < 30) return 'Faltou madeira… o mercador foi embora 😕'; res.wood -= 30; res.tools += 6; return '+6 🔧 ferramentas: todo mundo trabalha mais rápido!'; }],
    b: ['Recusar', () => { res.coins += 5; return 'Ele deixou 5 💰 de gorjeta pela hospitalidade'; }] },
  { t: '⛈️ Nuvens pretas no horizonte!',
    a: ['Proteger a horta', () => { startEvent('rain'); res.crops += 12; return 'A chuva veio e a horta rendeu +12 🥕'; }],
    b: ['Cortar árvores antes da chuva', () => { startEvent('rain'); res.wood += 25; return 'Correria! +25 🌲 antes do temporal'; }] },
  { t: '🚶 Uma família de viajantes pede abrigo',
    a: ['Acolher', () => { liveGuest(); liveGuest(); return 'Dois novos vizinhos chegaram à vila ❤️'; }],
    b: ['Seguir viagem', () => { res.coins += 10; return 'Pagaram 10 💰 pelo pedágio e seguiram'; }] },
  { t: '🎉 O pessoal está cansado. E agora?',
    a: ['Festa na praça', () => { startEvent('party'); return 'Fogos e dança: a vila ficou mais feliz!'; }],
    b: ['Mutirão de trabalho', () => { for (const n of npcs) n.boost = 90; return '⚡ Todos trabalham 60% mais rápido por um tempo'; }] },
  { t: '🐔 As galinhas do vizinho fugiram!',
    a: ['Caçar as galinhas', () => { startEvent('chickens'); return 'Quem pegar mais vira campeão!'; }],
    b: ['Deixar pra lá', () => { res.crops = Math.max(0, res.crops - 8); return 'Elas comeram 8 🥕 da horta…'; }] },
  { t: '🛸 Luzes estranhas no céu esta noite…',
    a: ['Investigar', () => { startEvent('ufo'); return 'Ninguém estava preparado para isso 👽'; }],
    b: ['Acender mais fogueiras', () => { res.wood = Math.max(0, res.wood - 10); res.stone += 6; return 'Gastaram 10 🌲, mas acharam 6 ⛰️ brilhantes'; }] },
  { t: '💎 Encontraram um veio de pedra rara',
    a: ['Minerar tudo', () => { res.stone += 30; return '+30 ⛰️ para as próximas obras'; }],
    b: ['Preservar a natureza', () => { res.coins += 8; for (const n of npcs) n.boost = Math.max(n.boost || 0, 40); return 'Turistas vieram ver: +8 💰 e ânimo geral'; }] },
];

// Moradores dormem à noite: desafio de coleta só se ainda houver dia pela frente.
function dayLeft() { return !isNight() && hour() < 15.5; }
const CHALLENGES = {
  madeira: { icon: '🌲', min: 4, title: n => `Juntar ${n} de madeira`, target: () => 30 + npcs.length * 4, track: 'wood', ok: () => npcs.length >= 1 && dayLeft() },
  pedra: { icon: '⛰️', min: 4, title: n => `Juntar ${n} de pedra`, target: () => 15 + npcs.length * 2, track: 'stone', ok: () => (hasProf('minerador') || hasProf('pedreiro')) && dayLeft() },
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
    seasonDefaults(s);
    return s;
  }
  const old = Array.isArray(s.residents) ? s.residents : [];
  Object.assign(s, {
    v: 2, era: 0, viewers: {}, arrivals: [], research: { done: [], cur: null }, prod: { wood: 0, stone: 0, food: 0, gold: 0, iron: 0 }, vote: null, chal: null, feed: [], raised: 0, goal: 50, voteN: 0,
    next: { pesq: Date.now() + 20000, obra: Date.now() + 60000, dilema: Date.now() + LIVE_CFG.dilemaMin * 60000, chal: Date.now() + 90000 },
  });
  for (const [uid, npcId] of old) s.viewers[uid] = newViewer(uid, npcId);
  delete s.residents; delete s.ballots; delete s.deadline; delete s.winner; delete s.firstBuildingId;
  seasonDefaults(s);
  return s;
}
function seasonDefaults(s) { if (!s.season) s.season = 1; if (!Array.isArray(s.hall)) s.hall = []; if (!s.vets) s.vets = {}; if (!s.mod) s.mod = 'normal'; }
function newViewer(name, npcId = null) { return { name, npc: npcId, xp: 0, msgs: 0, votes: 0, don: 0, work: 0, turbo: 0, last: 0, said: 0, pend: null, member: false }; }
function viewerOf(uid, name) {
  let v = L().viewers[uid];
  if (!v) { v = L().viewers[uid] = newViewer(name || uid); v.vet = L().vets?.[uid]?.seasons || 0; }
  if (name) v.name = name; return v;
}
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
  v.msgs++; statMsg(uid);
  // Desafio de mensagens: repetir a mesma coisa não adianta, conta 1 mensagem por pessoa a cada 5 s.
  if (L().chal && L().chal.track === 'msg' && now - (v.chalMsg || 0) >= 5000) { v.chalMsg = now; chalAdd(uid, 1); }
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
  if (/^!(hall|fama)\b/.test(lower)) { showHall = Date.now() + 15000; return 'Hall da fama na tela.'; }
  if (/^!temporada\b/.test(lower)) { const m = MODS[mod()]; announce(`🌱 Temporada ${L().season}`, `${m.icon} ${m.label}: ${m.desc}`); return ''; }
  if (/^!era\b/.test(lower)) { const e = ERAS[L().era]; announce(`${e.icon} ${e.name}`, eraNeedText() || 'Última era!'); return ''; }
  if (/^!(ajuda|comandos)\b/.test(lower)) { showHelp = Date.now() + 15000; return 'Comandos na tela.'; }
  const pc = playerCommand(v, uid, lower, text); if (pc != null) return pc;
  if (lower.startsWith('!')) return 'Comandos: @Nome/profissão, 1-4, A/B, !ajudar, !defender, !meu, !top, !era, !ir, !cortar, !comer, !dormir, !status, !loja, !pet, !atacar.';

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
  addXp(v, 5); stat('arrivals'); statViewer(a.uid);
  if (L().chal && L().chal.track === 'arrive') chalAdd(a.uid, 1);
  if (pend) feed(`🎓 ${n.name} chegou como aprendiz: vira ${PROF[pend].label} na ${ERAS[eraOfProf(pend)].name}`);
  else if (prof === 'custom') feed(`⭐ ${n.name} (${custom}) chegou e vai ajudar nas obras`);
  else feed(`👋 ${n.name} chegou como ${profLabel(n)} — trazido por ${v.name}`);
  n.liveTag = viewerTag(v); n.liveLv = level(v);
  if (v.vet) { addXp(v, 10); feed(`⭐ ${v.name} voltou! Veterano(a) de ${v.vet} temporada(s)`); }
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
  return (1 + 0.25 * count('universidade') + 0.5 * count('centrotec') + Math.min(0.5, countProf('cientista') * 0.05)) * (mod() === 'sabio' ? 1.5 : 1);
}
function researchAdd(v) {
  const c = L().research.cur; if (!c) return;
  c.prog += v * researchMult(); if (c.prog >= c.need) finishResearch();
}
function finishResearch() {
  const s = L(), c = s.research.cur; if (!c) return;
  const r = RESEARCH[c.k];
  s.research.cur = null; stat('research'); if (!s.research.done.includes(c.k)) s.research.done.push(c.k); s.next.pesq = Date.now() + 45000;
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
  else i = vote.opts.findIndex(o => norm(vote.kind === 'pesquisa' ? RESEARCH[o.k].label : vote.kind === 'mundo' ? MODS[o.k].label : BT[o.k].label).startsWith(raw) || o.k === raw);
  if (i < 0 || i >= vote.opts.length) return 'Opção inválida.';
  const first = !vote.ballots[uid];
  let w = 1 + Math.min(2, Math.floor((level(v) - 1) / 3));
  if (v.turbo > 0 && first) { v.turbo--; w += 4; feed(`⚡ Voto turbinado de ${v.name} (+4)`); }
  vote.ballots[uid] = [i, first ? w : vote.ballots[uid][1]];
  if (first) { v.votes++; addXp(v, 3); stat('ballots'); statViewer(uid); }
  return `Voto em ${vote.opts[i].label}.`;
}
function tally(vote) { const t = vote.opts.map(() => 0); for (const [i, w] of Object.values(vote.ballots)) t[i] += w; return t; }
function closeVote() {
  const s = L(), vote = s.vote; if (!vote) return;
  s.vote = null; stat('votes');
  const t = tally(vote), max = Math.max(...t), tops = t.map((x, i) => x === max ? i : -1).filter(i => i >= 0);
  const win = vote.opts[pick(tops)], voters = Object.keys(vote.ballots).length;
  if (vote.kind === 'mundo') {
    applyWorldMod(win.k);
  } else if (vote.kind === 'pesquisa') {
    startResearch(win.k);
  } else if (vote.kind === 'obra') {
    s.next.obra = Date.now() + LIVE_CFG.voteMin * 60000;
    const d = BT[win.k];
    const result = { id: (constructionVotes.at(-1)?.id || 0) + 1, type: win.k, day: day() };
    constructionVotes.push(result);
    let at = 0; while (at < queue.length && queue[at].manual) at++;
    queue.splice(at, 0, { type: win.k, manual: true, voteId: result.id });
    lastTry = -99;
    const lacks = [res.wood < d.wood ? `${d.wood - res.wood} 🌲` : '', res.stone < d.stone ? `${d.stone - res.stone} ⛰️` : ''].filter(Boolean).join(' e ');
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
  stat(win ? 'chalWon' : 'chalLost');
  s.chal = null; s.next.chal = Date.now() + LIVE_CFG.chalMin * 60000;
  const def = CHALLENGES[c.key];
  const helpers = Object.keys(c.contrib);
  if (win) {
    const k = Math.max(1, npcs.length);
    res.wood += 15 + k * 2; res.stone += 8 + k; res.coins += 10;
    for (const n of npcs) n.boost = Math.max(n.boost || 0, 60);
    for (const uid of helpers) if (s.viewers[uid]) addXp(s.viewers[uid], 10);
    announce(`🏆 DESAFIO CUMPRIDO!`, `${def.icon} ${def.title(c.target)} · +${15 + k * 2} 🌲 +${8 + k} ⛰️ e ânimo geral`);
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
  v.don = (v.don || 0) + amount; stat('donations'); stat('donated', amount); statViewer(uid); s.raised = (s.raised || 0) + amount;
  addXp(v, Math.round(amount * 10));
  const wood = Math.round(amount * 8), stone = Math.round(amount * 4);
  res.wood += wood; res.stone += stone;
  const ch = s.chal;
  if (ch && (ch.track === 'wood' || ch.track === 'stone')) { ch.last[ch.track] = res[ch.track]; chalAdd(uid, ch.track === 'wood' ? wood : stone); }
  const perks = [`+${wood} 🌲 +${stone} ⛰️`];
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
  announce('🎆 META DA LIVE BATIDA!', `R$ ${fmt(s.goal)} — festa gigante e +100 🌲 +60 ⛰️`);
  feed(`🎆 Meta de R$ ${fmt(s.goal)} batida! Próxima: R$ ${fmt(s.goal * 2)}`);
  res.wood += 100; res.stone += 60; startEvent('party'); for (let i = 0; i < 12; i++) firework();
  s.goal *= 2;
}
function onMember(v) {
  v.member = true; stat('members'); addXp(v, 50);
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
function showMine(v, kind = 'meu') {
  const n = npcOf(v);
  if (!n) return 'Você ainda não tem morador: digite @Nome/profissão';
  if (camQ.cur && camQ.cur.npc === n.id && Date.now() < camQ.until) return 'Seu morador já está na tela!';
  const pos = camQ.queue.findIndex(x => x.npc === n.id);
  if (pos >= 0) { camQ.queue[pos].kind = kind; return `Você já está na fila da câmera (${pos + 1}º).`; }
  if (camQ.queue.length >= 30) return 'Fila da câmera cheia, tente daqui a pouco.';
  camQ.queue.push({ npc: n.id, uid: norm(v.name), kind });
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
  if (item.kind === 'mochila' && v.hp != null) announce(`🎒 Mochila de ${n.name}`, `de @${v.name} · 💰 ${v.coins} · ${invText(v)} · ${eqText(v)}${n.pet ? ' · ' + (PET_BY_K[n.pet.k] || {}).icon + ' ' + (n.pet.name || (PET_BY_K[n.pet.k] || {}).label || 'pet') : ''}`);
  else announce(`${profIcon(n)} ${n.name} · nível ${level(v)}`, `de @${v.name} · ${title(v)}${v.hp != null ? ' · ' + bars(v) + ' · 💰 ' + v.coins + ' · ⚔️ ' + atkOf(v, n) : ''} · ${n.abT > 0 ? 'abduzido pelo OVNI 👽' : n.status || 'Na vila'}`);
  say(n, pick(['Oi, chat! 👋', 'Tô aqui!', 'Olha eu! ✨', 'Trabalhando duro 💪']));
  liveDirty = true;
}

// ================== ERA ==================
const PROD_L = { wood: ['🌲', 'madeira'], stone: ['⛰️', 'pedra'], food: ['🍖', 'comida'], gold: ['💰', 'ouro'], iron: ['⚙️', 'ferro'], energy: ['⚡', 'energia'] };
function eraProgress() {
  const s = L(), e = ERAS[s.era], n = e.need || (!s.finale && e.finale); if (!n) return null;
  const done = buildings.filter(b => b.done && b.type !== 'monumento'); // memorial e presente de população não contam
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
  s.era++; statEra(s.era);
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
  const food = mod() === 'fertil' ? 2 : 1;
  if (food > 1) res.crops += countProf('fazendeiro') + countProf('pescador') + countProf('cacador');
  const mo = count('moinho'); if (mo) res.crops += mo * (hasProf('fazendeiro') ? 3 : 1) * food;
  const mi = count('mina');
  const gold = mod() === 'ouro' ? 2 : 1;
  if (mi && era >= 2) res.coins += mi * (hasProf('minerador') ? 2 : 1) * gold;
  if (mi && era >= 3) res.iron = (res.iron || 0) + mi * (hasProf('ferreiro') || hasProf('minerador') ? 2 : 1);
  const fe = count('ferraria'); if (fe && era >= 3) res.iron = (res.iron || 0) + fe;
  const aq = count('aqueduto'); if (aq) res.crops += aq * 2 * food;
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
  statTick();
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
      n.liveTag = viewerTag(v); n.liveLv = level(v);
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
  let h = `<div class="lh-era"><b>T${s.season} ${MODS[mod()].icon} · ${e.icon} ${esc(e.name)}${!e.need && !s.finale ? ' · rumo ao espaço' : ''}</b> <span class="tm">${s.era + 1}/${ERAS.length}</span>`;
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
  if (Date.now() < showHall) h += hallBox();
  if (Date.now() < showHelp) h += `<div class="lh-box"><b>📜 Comandos</b><small><b>@Nome/profissão</b> traz seu morador<br><b>1 2 3</b> votam na obra · <b>A B</b> nas escolhas<br><b>!ajudar</b> nos mutirões · <b>!meu</b> mostra seu morador<br><b>!top</b> ranking · <b>!era</b> progresso<br>⭐ <b>Principais:</b> <b>@Nome/profissão</b> · <b>!cortar</b> <b>!pescar</b> <b>!minerar</b> <b>!caçar</b> · <b>!atacar</b> · <b>!meu</b><br>➕ <b>Extras:</b> <b>!ir</b> lugar · <b>!comer</b> · <b>!dormir</b> · <b>!parar</b> · <b>!mochila</b> · <b>!pet cachorro</b> · <b>!loja</b> <b>!comprar</b> <b>!equipar</b> <b>!usar</b> · <b>!duelo @nome</b><br>Super Chat/Pix: recursos, eventos e obras relâmpago</small></div>`;
  const recent = s.feed.filter(f => Date.now() - f.at < 25000).slice(-4);
  if (recent.length) h += `<div class="lh-feed">${recent.map(f => `<div>${esc(f.t)}</div>`).join('')}</div>`;
  const tips = ['⚡ Falar no chat dá ânimo ao seu morador', '🏆 <b>!top</b> mostra quem mais ajudou', '📍 <b>!meu</b> mostra seu morador na tela', '📜 <b>!ajuda</b> mostra todos os comandos', '🪓 <b>!cortar</b> · <b>!pescar</b> · <b>!minerar</b>: dê ordens ao seu morador', '💰 Trabalhar rende moedas: <b>!loja</b> tem armas, pets e mais', '⚔️ <b>!atacar</b> quando aparecer lobo ou saqueador', '🍗 Morador alimentado trabalha mais rápido: <b>!comer</b>', '🐾 <b>!pet cachorro</b> adota um pet (25 💰)'];
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
// Cota: 10.000 unidades por dia, renovadas à meia-noite do Pacífico (05:00 de Brasília no horário padrão).
// Cada leitura do chat custa 5 unidades e cada busca do vídeo, 1. O jogo conta o gasto do dia,
// lê mais devagar com o chat parado ou com a cota baixa e, se a cota acabar, mostra a tela de pausa.
let yt = null;
const YT_QUOTA = 10000, YT_Q_KEY = 'pixelandia-live-yt-quota';
function ytQuotaDay() { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }); }
function ytQuota() {
  let q; try { q = JSON.parse(localStorage.getItem(YT_Q_KEY) || 'null'); } catch (e) {}
  if (!q || q.day !== ytQuotaDay()) q = { day: ytQuotaDay(), used: 0, out: false };
  return q;
}
function ytSpend(units) { const q = ytQuota(); q.used += units; try { localStorage.setItem(YT_Q_KEY, JSON.stringify(q)); } catch (e) {} return q; }
function ytSetOut(out) { const q = ytQuota(); q.out = out; if (out) q.used = Math.max(q.used, YT_QUOTA); try { localStorage.setItem(YT_Q_KEY, JSON.stringify(q)); } catch (e) {} quotaScreen(); }
function ytIsQuotaErr(j) { const r = j?.error?.errors?.[0]?.reason || ''; return /quota|dailyLimit|rateLimit/i.test(r) || /quota/i.test(j?.error?.message || ''); }
// Hora em que a cota volta, no relógio local (meia-noite do Pacífico).
function ytResetText() {
  const now = new Date(), pt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const ms = (24 * 3600 - (pt.getHours() * 3600 + pt.getMinutes() * 60 + pt.getSeconds())) * 1000;
  return new Date(now.getTime() + ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
// Intervalo entre leituras: rápido com o chat ativo, devagar com o chat parado ou com a cota acabando.
function ytWait(apiMin) {
  const left = 1 - ytQuota().used / YT_QUOTA, quiet = Date.now() - lastChatAt > 3 * 60000;
  let w = quiet ? 15000 : 7000;
  if (left < 0.5) w = Math.max(w, quiet ? 20000 : 10000);
  if (left < 0.2) w = Math.max(w, 25000);
  return Math.max(w, apiMin || 0);
}
// Tela de pausa: cobre o jogo inteiro quando a cota acaba. A vila continua rodando por trás.
function quotaScreen() {
  const q = ytQuota(); let el = document.getElementById('lvQuotaScreen');
  const warn = !q.out && q.used >= YT_QUOTA * 0.9;
  if (!q.out && !warn) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'lvQuotaScreen'; document.body.appendChild(el); }
  if (q.out) {
    el.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(20,14,8,.82);font-family:"Pixelify Sans",sans-serif;color:#fff;text-align:center';
    el.innerHTML = `<div style="background:#f5e6c8;color:#4a2c12;border:6px solid #7a4a1e;border-radius:14px;padding:36px 48px;max-width:720px;box-shadow:0 10px 0 #3b220d">
      <div style="font-size:64px">😴</div>
      <div style="font-size:40px;font-weight:700;margin:8px 0">A vila está descansando</div>
      <div style="font-size:24px;line-height:1.4">O jogo atingiu o limite diário de leituras do chat do YouTube.<br>Os comandos voltam a funcionar às <b>${ytResetText()}</b>.</div>
      <div style="font-size:20px;margin-top:14px;opacity:.8">Obrigado por jogar! 💛 Volte mais tarde para continuar a vila.</div></div>`;
  } else {
    el.style.cssText = 'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:99999;background:#7a4a1e;color:#fff;font-family:"Pixelify Sans",sans-serif;font-size:18px;padding:8px 16px;border-radius:10px;opacity:.92';
    el.textContent = '⚠️ O chat do jogo vai pausar em breve (limite diário do YouTube quase no fim)';
  }
}
async function ytConnect() {
  ytStop();
  const key = LIVE_CFG.ytKey.trim(), vid = ytVideoId(LIVE_CFG.ytVideo);
  if (!key || !vid) { liveConn.yt = 'informe chave e vídeo'; liveDirty = true; return; }
  const run = yt = { stop: false, token: null, started: Date.now() };
  try {
    liveConn.yt = 'procurando chat…'; liveDirty = true;
    ytSpend(1);
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${encodeURIComponent(vid)}&key=${encodeURIComponent(key)}`);
    const j = await r.json();
    if (ytIsQuotaErr(j)) { ytSetOut(true); throw new Error('cota diária do YouTube esgotada'); }
    if (j.error) throw new Error(j.error.message);
    const chat = j.items?.[0]?.liveStreamingDetails?.activeLiveChatId;
    if (!chat) throw new Error('vídeo sem chat ao vivo ativo');
    run.chat = chat;
    if (ytQuota().out) ytSetOut(false);
    liveConn.yt = 'conectado ✅'; liveDirty = true;
    ytPoll(run, key, true);
  } catch (err) {
    liveConn.yt = 'erro: ' + err.message; liveDirty = true;
    // Cota esgotada ou rede fora: tenta de novo sozinho (a cada 15 min com a cota esgotada).
    if (yt === run && !run.stop) run.timer = setTimeout(() => { if (yt === run && !run.stop) ytConnect(); }, ytQuota().out ? 15 * 60000 : 60000);
  }
}
async function ytPoll(run, key, first) {
  if (run.stop) return;
  let wait = 8000;
  try {
    const url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${encodeURIComponent(run.chat)}&part=snippet,authorDetails&maxResults=200${run.token ? '&pageToken=' + encodeURIComponent(run.token) : ''}&key=${encodeURIComponent(key)}`;
    ytSpend(5);
    const j = await (await fetch(url)).json();
    if (ytIsQuotaErr(j)) {
      ytSetOut(true);
      liveConn.yt = 'cota diária esgotada · volta às ' + ytResetText(); liveDirty = true;
      run.timer = setTimeout(() => { if (yt === run && !run.stop) ytConnect(); }, 15 * 60000);
      return;
    }
    if (j.error) {
      // O chat da live acabou (live encerrada): reconecta para achar o chat de novo.
      if (/liveChatEnded|liveChatNotFound|forbidden/i.test(j.error.errors?.[0]?.reason || '')) { liveConn.yt = 'chat encerrado: procurando de novo…'; liveDirty = true; run.timer = setTimeout(() => { if (yt === run && !run.stop) ytConnect(); }, 60000); return; }
      throw new Error(j.error.message);
    }
    if (ytQuota().out) ytSetOut(false);
    run.token = j.nextPageToken;
    wait = ytWait(j.pollingIntervalMillis);
    // Na primeira leitura, ignora mensagens antigas para não reprocessar o histórico.
    if (!first) for (const it of j.items || []) { try { const e = ytMap(it); if (e) liveEvent(e); } catch (e) { console.error('mensagem do YouTube:', e, it); } }
    first = false;
    const q = ytQuota();
    liveConn.yt = `conectado ✅ · ${new Date().toLocaleTimeString('pt-BR')} · cota ${Math.min(100, Math.round(q.used / YT_QUOTA * 100))}%`; liveDirty = true;
  } catch (err) { liveConn.yt = 'erro: ' + err.message + ' (tentando de novo)'; liveDirty = true; wait = 20000; }
  quotaScreen();
  run.timer = setTimeout(() => ytPoll(run, key, first), wait);
}
function ytStop() { if (yt) { yt.stop = true; clearTimeout(yt.timer); yt = null; } liveConn.yt = 'desligado'; liveDirty = true; }
// Ao abrir o jogo, mostra a tela de pausa se a cota de hoje já tinha acabado; confere a virada do dia.
setTimeout(quotaScreen, 1000); setInterval(quotaScreen, 60000);
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
  <div class="row"><button class="btn sm" id="lvVote">🗳️ Votar obra</button><button class="btn sm" id="lvPesq">🔬 Pesquisa</button><button class="btn sm" id="lvDil">🤔 Dilema</button><button class="btn sm" id="lvChal">🏆 Desafio</button><button class="btn sm" id="lvRaid">⚔️ Ataque</button><button class="btn sm" id="lvSeason">🌱 Nova temporada</button><button class="btn sm" id="lvHall">🏛️ Hall</button><button class="btn sm" id="lvStats">📊 Estatísticas</button><button class="btn sm red" id="lvClose">⏹ Apurar agora</button></div>
  <label><input type="checkbox" id="lvAuto"> Ciclo automático (votações, dilemas e desafios)</label>
  <label><input type="checkbox" id="lvRaids"> Ataques de saqueadores (a partir da Era Agrícola, com 5 moradores)</label>
  <label><input type="checkbox" id="lvVitrine"> Modo vitrine (câmera passeia quando o chat está parado)</label>
  <label><input type="checkbox" id="lvAutoEv"> Eventos automáticos (chuva, festa, galinhas, OVNI e neve em dezembro)</label>
  <label><input type="checkbox" id="lvAutoSeason"> Estações do ano automáticas (mudam a cada 5 dias do jogo)</label>
  <label><input type="checkbox" id="lvHideStudio"> Esconder vídeos e eventos manuais (modo live sozinha)</label>
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
  $('lvStatus').innerHTML += '<br>' + esc(statsLine());
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
$('lvSeason').onclick = () => { if (startNewSeason()) $('lvFeedback').textContent = 'Nova temporada iniciada. O backup da anterior foi baixado.'; };
$('lvStats').onclick = openStats;
$('lvHall').onclick = () => { showHall = Date.now() + 20000; };
$('lvVitrine').checked = LIVE_CFG.vitrine; $('lvVitrine').onchange = e => { LIVE_CFG.vitrine = e.target.checked; liveSaveCfg(); vit.target = null; };
for (const [id, key] of [['lvAutoEv', 'autoEv'], ['lvAutoSeason', 'autoSeason'], ['lvHideStudio', 'hideStudio']]) { $(id).checked = LIVE_CFG[key]; $(id).onchange = e => { LIVE_CFG[key] = e.target.checked; liveSaveCfg(); if (key === 'hideStudio') applyStudioHide(); }; }
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
function raidPossible() { const h = mod() === 'hostil'; return L().era >= (h ? 0 : 1) && npcs.length >= (h ? 4 : 5) && !isNight() && hour() < 17.5; }

function startRaid(manual) {
  const s = L();
  if (s.raid) return false;
  if (!manual && !raidPossible()) return false;
  const K = raiderKind();
  const [dn, dx, dy] = K.dir ? DIRS_NAME.find(d => d[0] === K.dir) : pick(DIRS_NAME);
  const str = Math.round((12 + s.era * 14 + npcs.length * 1.2 + (s.raidsN || 0) * 4) * rnd(0.85, 1.15) * (mod() === 'hostil' ? 1.25 : 1));
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
  for (const uid of Object.keys(r.fighters || {})) { const v = s.viewers[uid], n = v && npcOf(v); if (n && !fighters.includes(n) && !extra.includes(n)) { if (!n.active) activate(n); n.inside = false; extra.push(n); } }
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
  s.next.raid = Date.now() + LIVE_CFG.raidMin * 60000 * (mod() === 'hostil' ? 0.6 : 1);
  const helpers = Object.keys(r.help).map(uid => s.viewers[uid]).filter(Boolean);
  const owners = Object.values(s.viewers).filter(v => { const n = npcOf(v); return n && ['guerreiro', 'policial', 'cacador'].includes(n.prof); });
  stat(r.win ? 'raidsWon' : 'raidsLost');
  if (r.win) {
    const loot = Math.round(r.str * 1.5 * (mod() === 'hostil' ? 2 : 1));
    if (s.era >= 2) res.coins += loot; else res.wood += loot;
    for (const v of new Set(helpers.concat(owners))) addXp(v, 15);
    s.raidsWon = (s.raidsWon || 0) + 1;
    announce('🛡️ VITÓRIA!', `Os ${(r.kind || 'Saqueadores').toLowerCase()} fugiram e deixaram ${loot} ${s.era >= 2 ? '💰' : '🌲'} para trás`);
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
  for (const uid of r.hurtList || []) { const v = s.viewers[uid], n = v && npcOf(v); if (v) { pl(v); hurt(v, n && n.active ? n : null, r.win ? rnd(4, 12) : rnd(18, 35), 'batalha'); v.coins += r.win ? 6 : 1; } }
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
function liveWorldEntities() { return beasts.map(z => ({ y: z.y, k: 'live', draw: () => drawBeast(z) })).concat(hpBarEntities(), raidersEntities()); }
function raidersEntities() { return raiders.map(z => ({ y: z.y, k: 'live', draw: () => { ctx.save(); ctx.globalAlpha = clamp(z.a, 0, 1); drawNPC(z); ctx.restore(); } })); }

// ================== CONTROLE DO MORADOR ==================
// Cada espectador controla o próprio morador por ordens no chat (o chat chega com 7 a 15 s de atraso,
// então o controle é por ordem, não por setas). Sem ordem nova, o morador volta à rotina sozinho.
// Tudo fica salvo no espectador (L().viewers), que vai junto no salvamento e no backup do mundo.
//   Fase 1: ordens e necessidades (❤️ vida, 🍗 fome, ⚡ energia). Modo leve: fome e energia só dão
//           bônus (bem alimentado e descansado trabalha mais rápido) e nunca castigam; vida só cai em combate.
//   Fase 2: pets que seguem o dono e trazem achados
//   Fase 3: 💰 moedas pessoais, mochila, loja, ferramentas e armas
//   Fase 4: combate (lobos, saqueadores, duelos) e desmaio
const ORDER_MS = 3 * 60000, KO_MS = 20000, NEED_TICK = 10000, ORDER_GAP = 5000, EAT_GAP = 30000;
const ORDER_LABEL = { go: 'Indo', stay: 'Esperando', chop: 'Cortando árvores 🪓', mine: 'Minerando ⛏️', fish: 'Pescando 🎣', hunt: 'Caçando 🏹', build: 'Construindo 🔨', job: 'Trabalhando', sleep: 'Descansando 💤', fight: 'Lutando ⚔️' };
const ITEMS = {
  machado: { icon: '🪓', label: 'Machado', price: 20, slot: 'tool', work: 'chop', desc: 'corta árvores 60% mais rápido' },
  picareta: { icon: '⛏️', label: 'Picareta', price: 20, slot: 'tool', work: 'mine', desc: 'minera 60% mais rápido' },
  vara: { icon: '🎣', label: 'Vara de pesca', price: 20, slot: 'tool', work: 'fish', desc: 'pesca 60% mais rápido' },
  martelo: { icon: '🔨', label: 'Martelo', price: 20, slot: 'tool', work: 'build', desc: 'constrói 60% mais rápido' },
  arco: { icon: '🏹', label: 'Arco', price: 30, slot: 'weapon', atk: 6, work: 'hunt', desc: '+6 de ataque e caça melhor' },
  lanca: { icon: '🔱', label: 'Lança', price: 40, slot: 'weapon', atk: 9, desc: '+9 de ataque' },
  espada: { icon: '🗡️', label: 'Espada', price: 60, slot: 'weapon', atk: 14, desc: '+14 de ataque' },
  escudo: { icon: '🛡️', label: 'Escudo', price: 40, slot: 'armor', def: 8, desc: 'leva menos dano' },
  pocao: { icon: '🧪', label: 'Poção', price: 15, use: 'hp', amount: 50, desc: '+50 de vida' },
  pao: { icon: '🥖', label: 'Pão', price: 6, use: 'food', amount: 45, desc: '+45 de fome saciada' },
  cafe: { icon: '☕', label: 'Café', price: 8, use: 'en', amount: 40, desc: '+40 de energia' },
  petisco: { icon: '🦴', label: 'Petisco', price: 5, use: 'pet', desc: 'o pet traz um achado na hora' },
};
const ITEM_ALIAS = { pocao: 'pocao', pocoes: 'pocao', vida: 'pocao', pao: 'pao', comida: 'pao', cafe: 'cafe', osso: 'petisco', petisco: 'petisco', machado: 'machado', picareta: 'picareta', vara: 'vara', martelo: 'martelo', arco: 'arco', lanca: 'lanca', espada: 'espada', escudo: 'escudo' };
const PET_KINDS = {
  cachorro: { k: 'dog', icon: '🐶', label: 'Cachorro', atk: 4, find: ['🦴 um osso enterrado', 'coins', 3] },
  gato: { k: 'cat', icon: '🐱', label: 'Gato', atk: 1, find: ['🐟 um peixe', 'fish', 2] },
  coelho: { k: 'bun', icon: '🐰', label: 'Coelho', atk: 0, find: ['🥕 cenouras', 'crops', 3] },
  galinha: { k: 'hen', icon: '🐔', label: 'Galinha', atk: 0, find: ['🥚 ovos fresquinhos', 'meals', 1] },
  raposa: { k: 'fox', icon: '🦊', label: 'Raposa', atk: 3, find: ['💰 moedas perdidas', 'coins', 4] },
  porco: { k: 'pig', icon: '🐷', label: 'Porquinho', atk: 1, find: ['🍄 uma trufa rara', 'coins', 6] },
};
const PET_BY_K = Object.fromEntries(Object.entries(PET_KINDS).map(([nm, p]) => [p.k, { ...p, nm }]));
const PET_PRICE = 25;
const PLAYER_START_COINS = 10;
let shopAt = 0;

// ---------- Estado do jogador (fica no espectador) ----------
function pl(v) {
  if (v.hp == null) Object.assign(v, { hp: 100, food: 80, en: 90, coins: PLAYER_START_COINS, inv: {}, eq: {}, ord: null, ko: 0, petAt: 0 });
  if (!v.inv) v.inv = {}; if (!v.eq) v.eq = {};
  return v;
}
let ownerCache = null, ownerCacheAt = 0;
function ownerOf(n) {
  if (!ownerCache || Date.now() - ownerCacheAt > 1000) {
    ownerCache = new Map(); ownerCacheAt = Date.now();
    for (const v of Object.values(L().viewers)) if (v.npc != null && !v.banned) ownerCache.set(v.npc, v);
  }
  return ownerCache.get(n.id) || null;
}
function bars(v) { return `❤️ ${Math.round(v.hp)} · 🍗 ${Math.round(v.food)} · ⚡ ${Math.round(v.en)}`; }
function atkOf(v, n) { const w = ITEMS[v.eq.weapon]; const p = n && n.pet && PET_BY_K[n.pet.k]; return 4 + Math.floor(level(v) / 2) + (w ? w.atk : 0) + (p ? p.atk : 0); }
function defOf(v) { const a = ITEMS[v.eq.armor]; return a ? a.def : 0; }
function invText(v) { const it = Object.entries(v.inv).filter(([, q]) => q > 0).map(([k, q]) => `${ITEMS[k].icon}${q > 1 ? '×' + q : ''}`); return it.join(' ') || 'vazia'; }
function eqText(v) { return ['tool', 'weapon', 'armor'].map(s => v.eq[s] && ITEMS[v.eq[s]] ? ITEMS[v.eq[s]].icon + ' ' + ITEMS[v.eq[s]].label : null).filter(Boolean).join(' · ') || 'nada equipado'; }
function findItem(word) { const w = norm(word || '').replace(/[^a-z]/g, ''); if (!w) return null; if (ITEM_ALIAS[w]) return ITEM_ALIAS[w]; return Object.keys(ITEMS).find(k => k.startsWith(w) || w.startsWith(k)) || null; }
function hurt(v, n, dmg, why) {
  pl(v); dmg = Math.max(1, Math.round(dmg - defOf(v) * 0.5)); v.hp = Math.max(0, v.hp - dmg);
  if (n) { floatTxt(n.x, n.y - 26, '-' + dmg + ' ❤️'); burst(n.x, n.y - 10, '#e74c3c', 5); }
  if (v.hp <= 0) knockOut(v, n, why);
}
function knockOut(v, n, why) {
  v.ko = Date.now() + KO_MS; v.ord = null; v.hp = 0;
  feed(`💫 ${n ? n.name : v.name} desmaiou${why ? ' (' + why + ')' : ''} e volta em 20 s`);
  if (n) { say(n, 'Ai… 💫'); n.plan = []; n.step = null; n.anim = null; const h = homeB(n); n.status = 'Desmaiado 💫'; if (h) { const f = frontOf(h); n.plan = [goTile(f.x, f.y), fn(m => { m.inside = true; })]; } else { n.sleeping = true; n.idle = 5; } }
}

// ---------- Fase 1: ordens ----------
function setOrder(v, n, k, extra) {
  pl(v);
  // Repetir a mesma ordem não reinicia o caminho; ordens novas, no máximo uma a cada 5 s.
  if (v.ord && v.ord.k === k && !extra) { v.ord.until = Date.now() + ORDER_MS; return ''; }
  if (Date.now() - (v.ordAt || 0) < ORDER_GAP) return '';
  v.ordAt = Date.now();
  if (v.ko > Date.now()) return `${n.name} está desmaiado 💫 e volta em ${Math.ceil((v.ko - Date.now()) / 1000)}s.`;
  v.ord = Object.assign({ k, until: Date.now() + ORDER_MS }, extra || {});
  if (!n.active) activate(n);
  n.plan = []; n.step = null; n.anim = null; n.idle = 0; n.inside = false; n.sleeping = false;
  if (n.carry && !n.carryRes) n.carry = null;
  say(n, pick(['Pode deixar! 👍', 'Indo agora!', 'Sim, chefe! 🫡', 'Bora!']), 0.9);
  liveDirty = true; return '';
}
function placeGoal(word, n) {
  const w = norm(word || '').replace(/^(a|o|ao|na|no|para|pra)\s+/, '');
  const R = clearR();
  if (/^(floresta|mata|bosque|arvore)/.test(w)) return { g: (x, y) => !inR(x, y, R - 1) && nearObj(x, y, O_TREE, 1) && Math.random() < 0.15, label: 'a floresta' };
  if (/^(rio|lago|mar|praia|agua|lagoa)/.test(w)) return { g: (x, y) => { for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (inB(nx, ny) && isWaterG(ground[idx(nx, ny)])) return Math.random() < 0.3; } return false; }, label: 'a água' };
  if (/^(mina|pedreira|pedra|rocha|montanha)/.test(w)) return { g: (x, y) => nearObj(x, y, O_ROCK, 1) && Math.random() < 0.3, label: 'as pedras' };
  if (/^(praca|centro|fogueira|vila)/.test(w)) return { g: (x, y) => (x - CX) ** 2 + (y - CY) ** 2 <= 9 && !(x === CX && y === CY) && Math.random() < 0.35, label: 'a praça' };
  if (/^(deposito|estoque|armazem)/.test(w)) return { g: (x, y) => Math.abs(x - CRX) + Math.abs(y - CRY) === 1, label: 'o depósito' };
  if (/^(casa|lar)/.test(w)) { const h = homeB(n); if (!h) return null; const f = frontOf(h); return { g: (x, y) => x === f.x && y === f.y, label: 'casa', home: true }; }
  const b = buildings.find(b => b.done && (norm(BT[b.type].label).startsWith(w) || norm(bName(b)).includes(w)));
  if (b) { const s = goBld(b); return { g: s.goal, label: bName(b) }; }
  return null;
}
// Ordem ativa: decide o próximo passo do morador. Devolve true se cuidou do morador.
function orderPlan(n, v) {
  const now = Date.now();
  if (v.ko > now) { n.inside = !!homeB(n); n.sleeping = !homeB(n); n.status = 'Desmaiado 💫'; n.idle = 4; return true; }
  if (v.ko && v.ko <= now) { v.ko = 0; v.hp = Math.max(v.hp, 60); n.inside = false; n.sleeping = false; say(n, 'Acordei! 😵‍💫'); }
  const o = v.ord;
  if (!o) {
    // Sem ordem: cuida das próprias necessidades antes da rotina.
    if (v.food < 20 && !isNight() && (res.meals > 0 || res.fish > 0 || res.crops > 0)) { planEat(n, v, false); return true; }
    return false;
  }
  if (now > o.until || (o.k === 'sleep' && v.en >= 98)) { v.ord = null; say(n, 'Voltando à rotina!', 0.6); return false; }
  if (EV.party > 0 || EV.fire) return false;
  if (o.k !== 'sleep') { n.inside = false; n.sleeping = false; }
  const tool = ITEMS[v.eq.tool], weap = ITEMS[v.eq.weapon];
  if ((tool && tool.work === o.k) || (weap && weap.work === o.k)) n.boost = Math.max(n.boost || 0, 20);
  const want = { chop: 'wood', mine: 'stone', fish: 'fish', hunt: 'crops' }[o.k];
  if (n.carry && n.carryRes && (n.carryRes !== want || n.carryN >= (o.k === 'chop' ? 9 : 6))) { planDeliver(n); return true; }
  let ok = true;
  if (o.k === 'chop') ok = aiLumber(n);
  else if (o.k === 'mine') ok = aiMiner(n);
  else if (o.k === 'fish') ok = aiFisher(n);
  else if (o.k === 'hunt') ok = aiHunter(n);
  else if (o.k === 'build') ok = aiBuilder(n);
  else if (o.k === 'job') { const P = PROF[n.prof]; ok = P && P.ai ? P.ai(n) : aiBuilder(n) || aiLumber(n); }
  else if (o.k === 'sleep') { if (!n.inside && !n.sleeping) planSleep(n); else n.idle = 3; n.status = 'Descansando 💤'; return true; }
  else if (o.k === 'go') { n.plan = [{ t: 'go', goal: o.goal }, fn(m => { if (v.ord === o) { o.k = 'stay'; if (o.home) m.inside = true; } }), wait(rnd(2, 4))]; }
  else if (o.k === 'stay') { if (o.home) { n.inside = true; n.idle = 4; } else n.plan = [{ t: 'go', goal: o.goal }, wait(rnd(5, 10))]; }
  else if (o.k === 'fight') return beastOrder(n, v);
  if (!ok) { v.ord = null; say(n, pick(['Não achei onde fazer isso… 🤷', 'Não tem nada para isso aqui perto']), 0.9); return false; }
  if (ORDER_LABEL[o.k]) n.status = `${ORDER_LABEL[o.k]}${o.label ? ' ' + o.label : ''} (ordem de @${v.name})`;
  return true;
}
const FOODS = [['meals', 60, '🍲'], ['fish', 35, '🐟'], ['crops', 30, '🥕']];
function planEat(n, v, ordered) {
  n.status = 'Indo comer 🍽️';
  n.plan = [goAdj(CRX, CRY), fn(m => {
    for (const [k, q, ic] of FOODS) if ((res[k] || 0) > 0) { res[k]--; v.food = Math.min(100, v.food + q); v.hp = Math.min(100, v.hp + 5); floatTxt(m.x, m.y - 24, '+' + q + ' 🍗 ' + ic); say(m, pick(['Hmm, delícia! 😋', 'Que fome!', 'Barriga cheia!']), 0.8); return; }
    say(m, 'O depósito está sem comida… 😢', 0.9);
  }), work(2.5, 'cook', null)];
  if (ordered) v.ord = null;
}
// Necessidades: fome e energia caem com o tempo; vida cai com fome zerada e volta com o morador bem.
function needsTick() {
  for (const v of Object.values(L().viewers)) {
    if (v.npc == null || v.banned || v.hp == null) continue;
    const n = npcOf(v); if (!n) continue;
    const resting = n.inside || n.sleeping, working = v.ord && !['stay', 'sleep'].includes(v.ord.k);
    v.food = clamp(v.food - (working ? 0.8 : 0.3), 0, 100);
    v.en = clamp(v.en + (resting ? 5 : working ? -0.8 : -0.1), 0, 100);
    // Vida volta sozinha (mais rápido descansando). Fome e energia nunca tiram vida.
    if (v.hp < 100 && !(v.ko > Date.now())) v.hp = Math.min(100, v.hp + (resting ? 5 : 2));
    // Bônus: bem alimentado e descansado trabalha 60% mais rápido.
    if (v.food >= 60 && v.en >= 40 && n.active) n.boost = Math.max(n.boost || 0, NEED_TICK / 1000 + 1);
  }
}

// ---------- Fase 2: pets ----------
function petCmd(v, n, args, rawRest) {
  const [a, ...rest] = args;
  if (!a) return n.pet ? petCard(v, n) : `Adote um pet com !pet cachorro (${PET_PRICE} 💰). Tipos: ${Object.keys(PET_KINDS).join(', ')}.`;
  if (a === 'nome') {
    if (!n.pet) return 'Você ainda não tem pet.';
    const nm = (rawRest || rest.join(' ')).trim().slice(0, 14); if (!nm || badName(nm)) return 'Nome inválido.';
    n.pet.name = nm; say(n, `Agora você se chama ${nm}! 🐾`); npcVer++; save(); return '';
  }
  if (a === 'carinho' || a === 'brincar') {
    if (!n.pet) return 'Você ainda não tem pet.';
    if (Date.now() - (v.petPat || 0) < 60000) return '';
    v.petPat = Date.now(); v.en = Math.min(100, v.en + 8); addXp(v, 2);
    if (n.petO) { heart(n.petO.x, n.petO.y - 12); } say(n, pick(['Quem é o bonzinho? 🐾', 'Que fofura! 💛', 'Bom pet!'])); return '';
  }
  if (a === 'soltar') { if (!n.pet) return ''; feed(`🐾 ${n.name} soltou ${n.pet.name || 'o pet'} na floresta`); n.pet = null; n.petO = null; npcVer++; save(); return ''; }
  const kind = PET_KINDS[a] || Object.values(PET_KINDS).find(p => norm(p.label) === a);
  if (!kind) return `Tipos de pet: ${Object.keys(PET_KINDS).join(', ')}.`;
  if (n.pet) return `${n.name} já tem um pet. Use !pet soltar antes de adotar outro.`;
  if (v.coins < PET_PRICE) return `Adotar custa ${PET_PRICE} 💰 (você tem ${v.coins}). Trabalhe para ganhar moedas!`;
  v.coins -= PET_PRICE; n.pet = { k: kind.k, c: (Math.random() * 5) | 0, name: '' }; n.petO = null; v.petAt = Date.now();
  feed(`${kind.icon} ${n.name} adotou ${['galinha', 'raposa'].includes(a) ? 'uma' : 'um'} ${kind.label.toLowerCase()}! Dê um nome com !pet nome …`);
  if (n.active) { heart(n.x, n.y - 20); say(n, `Meu ${kind.label.toLowerCase()}! ${kind.icon}`); }
  npcVer++; save(); return '';
}
function petCard(v, n) { return showMine(v, 'mochila'); }
function petFind(v, n, forced) {
  const p = n.pet && PET_BY_K[n.pet.k]; if (!p) return;
  const [txt, key, q] = p.find;
  if (key === 'coins') v.coins += q; else res[key] = (res[key] || 0) + q;
  const who = n.pet.name || `o ${p.label.toLowerCase()}`;
  feed(`${p.icon} ${who} de ${n.name} achou ${txt}${key === 'coins' ? ` (+${q} 💰)` : ''}`);
  if (n.active && n.petO) { floatTxt(n.petO.x, n.petO.y - 14, key === 'coins' ? `+${q} 💰` : `+${q} ${RES_ICON[key] || ''}`); burst(n.petO.x, n.petO.y - 6, '#ffe066', 5); }
  if (!forced) v.petAt = Date.now();
}
function petTickAll() {
  for (const v of Object.values(L().viewers)) {
    if (v.npc == null || v.hp == null) continue; const n = npcOf(v);
    if (n && n.pet && PET_BY_K[n.pet.k] && Date.now() - (v.petAt || 0) > 4 * 60000) petFind(v, n);
  }
}
// Desenho dos pets novos (cachorro e gato continuam com o desenho original).
Object.assign(PET_COL, {
  bun: ['#f2f2f2', '#c8a27a', '#8a8a8a', '#e8d8c0', '#5a4a3a'], hen: ['#f5f5f5', '#c8763a', '#2b2b2b', '#e8c26a', '#a0522d'],
  fox: ['#e0722a', '#c8581e', '#b0b0b0', '#f08a3a', '#8a4a2a'], pig: ['#f2a7b8', '#e892a5', '#c97a8a', '#f7c3cf', '#d68c9c'],
});
const drawPetBase = drawPet;
drawPet = function (n) {
  const pet = n.pet; if (!pet || pet.k === 'dog' || pet.k === 'cat' || !PET_COL[pet.k]) return drawPetBase(n);
  const p = n.petO, x = Math.round(p.x), y = Math.round(p.y), col = PET_COL[pet.k][pet.c % 5], dk = shade(col, -35), ph = p.moving ? Math.floor(p.walkT * 10) % 2 : 0;
  ctx.save(); ctx.translate(x, y); if (p.dir === 'left') ctx.scale(-1, 1);
  px(ctx, 'rgba(0,0,0,.22)', -5, 0, 10, 1);
  if (pet.k === 'bun') { const hop = p.moving ? -Math.abs(Math.sin(p.walkT * 8)) * 2 : 0; ctx.translate(0, hop); px(ctx, col, -3, -5, 6, 4); px(ctx, col, 2, -7, 3, 3); px(ctx, col, 2, -11, 1, 4); px(ctx, col, 4, -11, 1, 4); px(ctx, '#f5a0b0', 2, -10, 1, 2); px(ctx, '#222', 4, -6, 1, 1); px(ctx, '#fff', -4, -5, 2, 2); px(ctx, dk, -2, -1, 1, 1); px(ctx, dk, 1, -1, 1, 1); }
  else if (pet.k === 'hen') { const bob = ph ? -1 : 0; px(ctx, col, -3, -6 + bob, 6, 5); px(ctx, col, 2, -9 + bob, 3, 3); px(ctx, '#e74c3c', 3, -10 + bob, 2, 1); px(ctx, '#f1c40f', 5, -8 + bob, 2, 1); px(ctx, '#222', 3, -8 + bob, 1, 1); px(ctx, dk, -4, -6 + bob, 2, 3); px(ctx, '#f1c40f', -1, -1, 1, 1); px(ctx, '#f1c40f', 1, -1 + (ph ? -1 : 0), 1, 1); }
  else if (pet.k === 'fox') { px(ctx, col, -4, -6, 8, 4); px(ctx, dk, -4, -2 + (ph ? 0 : -1), 1, 2); px(ctx, dk, -1, -2 + (ph ? -1 : 0), 1, 2); px(ctx, dk, 1, -2 + (ph ? 0 : -1), 1, 2); px(ctx, dk, 3, -2 + (ph ? -1 : 0), 1, 2); px(ctx, col, 3, -9, 4, 4); px(ctx, col, 3, -11, 1, 2); px(ctx, col, 6, -11, 1, 2); px(ctx, '#fff', 5, -7, 2, 2); px(ctx, '#222', 6, -8, 1, 1); const wag = Math.sin(gtime * 10) > 0 ? -1 : 0; px(ctx, col, -8, -7 + wag, 4, 3); px(ctx, '#fff', -9, -7 + wag, 2, 2); }
  else if (pet.k === 'pig') { px(ctx, col, -4, -6, 8, 5); px(ctx, dk, -3, -1 + (ph ? -1 : 0), 1, 1); px(ctx, dk, -1, -1, 1, 1); px(ctx, dk, 1, -1 + (ph ? -1 : 0), 1, 1); px(ctx, dk, 3, -1, 1, 1); px(ctx, col, 3, -8, 4, 4); px(ctx, dk, 6, -6, 2, 2); px(ctx, '#222', 5, -7, 1, 1); px(ctx, dk, 3, -9, 1, 1); px(ctx, dk, -5, -6, 1, 1); }
  ctx.restore();
};

// ---------- Fase 3: moedas, mochila e loja ----------
// Todo trabalho do morador rende moedas ao dono (+1 com a ferramenta certa) e às vezes um achado.
const incBase = inc;
const INC_WORK = { t: 'chop', s: 'mine', f: 'fish', x: 'hunt', o: 'build' };
inc = function (m, k, val = 1) {
  incBase(m, k, val);
  const v = m && ownerOf(m); if (!v || v.hp == null) return;
  const tool = ITEMS[v.eq.tool], weap = ITEMS[v.eq.weapon], w = INC_WORK[k];
  let c = 1; if (w && ((tool && tool.work === w) || (weap && weap.work === w))) c++;
  v.coins += c;
  if (Math.random() < 0.03) { const it = pick(['pao', 'cafe', 'pocao', 'petisco']); v.inv[it] = (v.inv[it] || 0) + 1; feed(`🎁 ${m.name} encontrou ${ITEMS[it].icon} ${ITEMS[it].label} trabalhando!`); }
};
function shopText() { return Object.entries(ITEMS).map(([k, it]) => `${it.icon} ${k} ${it.price}💰`).join(' · '); }
function buy(v, n, word) {
  const k = findItem(word); if (!k) return `Item não encontrado. Loja: ${shopText()}`;
  const it = ITEMS[k];
  if (v.coins < it.price) return `${it.label} custa ${it.price} 💰 (você tem ${v.coins}).`;
  v.coins -= it.price; v.inv[k] = (v.inv[k] || 0) + 1;
  if (it.slot && !v.eq[it.slot]) v.eq[it.slot] = k;
  feed(`🛒 ${n.name} comprou ${it.icon} ${it.label}${it.slot && v.eq[it.slot] === k ? ' (equipado)' : ''}`);
  if (n.active) { say(n, `Comprei ${it.icon}!`); burst(n.x, n.y - 14, '#ffe066', 6); }
  return '';
}
function equip(v, n, word) {
  const k = findItem(word); if (!k || !ITEMS[k].slot) return 'Só dá para equipar ferramentas, armas e escudo.';
  if (!(v.inv[k] > 0)) return `Você não tem ${ITEMS[k].label}. Compre com !comprar ${k}.`;
  v.eq[ITEMS[k].slot] = k; if (n.active) say(n, `${ITEMS[k].icon} equipado!`); return '';
}
function useItem(v, n, word) {
  const k = findItem(word); if (!k) return 'Item não encontrado.';
  const it = ITEMS[k]; if (!it.use) return `${it.label} não se usa assim: experimente !equipar ${k}.`;
  if (!(v.inv[k] > 0)) return `Você não tem ${it.label}. Compre com !comprar ${k}.`;
  if (it.use === 'pet' && !n.pet) return 'Você precisa de um pet para dar o petisco.';
  v.inv[k]--;
  if (it.use === 'hp') v.hp = Math.min(100, v.hp + it.amount);
  if (it.use === 'food') v.food = Math.min(100, v.food + it.amount);
  if (it.use === 'en') v.en = Math.min(100, v.en + it.amount);
  if (it.use === 'pet') petFind(v, n, true);
  if (n.active) { floatTxt(n.x, n.y - 26, it.icon); say(n, pick(['Ahh, melhor agora!', 'Valeu!', 'Isso que eu precisava!'])); }
  return '';
}

// ---------- Fase 4: combate ----------
// Feras aparecem na beira da floresta de vez em quando. !atacar manda o morador lutar.
let beasts = [], beastNext = Date.now() + 6 * 60000, beastId = 0;
const BEASTS = [
  { k: 'lobo', icon: '🐺', label: 'Lobo', hp: 45, dmg: 9, col: '#7d7d86', reward: 12 },
  { k: 'javali', icon: '🐗', label: 'Javali', hp: 60, dmg: 11, col: '#6b4a32', reward: 16 },
  { k: 'urso', icon: '🐻', label: 'Urso', hp: 110, dmg: 16, col: '#5a3a22', reward: 30 },
];
function spawnBeast(forced) {
  if (beasts.length >= 2 || (!forced && (L().raid || npcs.length < 3))) return false;
  const era = L().era, kinds = BEASTS.filter((b, i) => i <= Math.min(2, Math.floor(era / 2) + 1)), B = pick(kinds);
  // Nasce na beira da floresta, num ponto que tenha caminho até a praça (busca a partir da praça).
  // Percorre toda a área alcançável e escolhe um dos pontos mais afastados do centro.
  const cand = [];
  bfs(CX, CY, (x, y) => { cand.push([x, y, (x - CX) ** 2 + (y - CY) ** 2]); return false; }, 40000);
  if (cand.length < 10) return false;
  cand.sort((a, b) => b[2] - a[2]);
  const [tx, ty] = pick(cand.slice(0, Math.max(5, Math.floor(cand.length * 0.08))));
  const z = { id: ++beastId, ...B, max: Math.round(B.hp * (1 + era * 0.25)), x: tx * T + 8, y: ty * T + 12, dir: 'left', moving: false, walkT: 0, hitAt: 0, born: Date.now(), fighters: {}, dead: false, a: 1 };
  z.hpNow = z.max; beasts.push(z);
  announce(`${B.icon} ${B.label.toUpperCase()} NA FLORESTA!`, 'Digite !atacar para mandar seu morador lutar');
  feed(`${B.icon} Um ${B.label.toLowerCase()} apareceu perto da vila! !atacar`);
  sfx('siren'); return true;
}
function nearestBeast(n) { let b = null, bd = 1e9; for (const z of beasts) { if (z.dead) continue; const d = Math.hypot(z.x - n.x, z.y - n.y); if (d < bd) { bd = d; b = z; } } return b; }
function beastOrder(n, v) {
  const z = beasts.find(b => b.id === v.ord.target && !b.dead) || nearestBeast(n);
  if (!z) { v.ord = null; return false; }
  v.ord.target = z.id; n.status = `Lutando contra o ${z.label.toLowerCase()} ⚔️ (ordem de @${v.name})`;
  const tx = Math.floor(z.x / T), ty = Math.floor(z.y / T);
  n.plan = [{ t: 'go', goal: (x, y) => Math.abs(x - tx) + Math.abs(y - ty) <= 1 && Math.random() < 0.5, face: [tx, ty] }, work(1.6, 'hammer', m => strike(m, v, z))];
  return true;
}
function strike(n, v, z) {
  if (z.dead || Math.hypot(z.x - n.x, z.y - n.y) > 44) return;
  const dmg = Math.round(atkOf(v, n) * rnd(0.8, 1.25)); z.hpNow -= dmg; z.fighters[n.id] = (z.fighters[n.id] || 0) + dmg;
  floatTxt(z.x, z.y - 18, '-' + dmg); burst(z.x, z.y - 8, '#ffffff', 4); sfxAt('whoosh', z.x, z.y);
  v.en = Math.max(0, v.en - 2);
  if (z.hpNow <= 0) beastDie(z);
}
function beastDie(z) {
  z.dead = true; z.fade = true;
  const ids = Object.keys(z.fighters).map(Number), tot = Object.values(z.fighters).reduce((a, b) => a + b, 0) || 1;
  const names = [];
  for (const id of ids) { const n = npcs.find(m => m.id === id), v = n && ownerOf(n); if (!v) continue; const share = Math.max(2, Math.round(z.reward * z.fighters[id] / tot)); v.coins += share; addXp(v, 8); names.push(n.name); if (v.ord && v.ord.k === 'fight') v.ord = null; }
  res.crops = (res.crops || 0) + Math.round(z.reward / 3);
  announce(`🏆 ${z.label} derrotado!`, names.length ? `Heróis: ${names.slice(0, 5).join(', ')} · moedas e XP para quem lutou` : 'A vila está segura');
  feed(`🏆 O ${z.label.toLowerCase()} foi derrotado${names.length ? ' por ' + names.slice(0, 5).join(', ') : ''}! +${Math.round(z.reward / 3)} 🥕`);
  sfx('fanfare'); confetti(z.x, z.y - 10);
}
function beastFrame(dt) {
  const now = Date.now();
  if (LIVE_CFG.autoEv && now > beastNext) { beastNext = now + rnd(6, 11) * 60000; if (!isNight()) spawnBeast(false); }
  for (const z of beasts) {
    if (z.dead) { z.a -= dt * 0.8; continue; }
    // Sem ninguém lutando por 2 min, a fera volta para a floresta.
    if (now - z.born > 120000 && !Object.keys(z.fighters).length) { z.dead = true; z.fade = true; feed(`${z.icon} O ${z.label.toLowerCase()} voltou para a floresta`); continue; }
    // Quem veio lutar prende a fera: ela para e briga com o lutador mais próximo.
    let tgt = null, td = 1e9, fighter = false;
    for (const n of npcs) {
      if (!n.active || n.inside || n.sleeping) continue; const d = Math.hypot(n.x - z.x, n.y - z.y);
      const f = d < 48 && n.status && n.status.startsWith('Lutando');
      if ((f && (!fighter || d < td)) || (!fighter && d < td)) { td = d; tgt = n; fighter = fighter || f; }
    }
    if (fighter && td > 14) { z.moving = false; z.dir = tgt.x < z.x ? 'left' : 'right'; td = 14; }
    if (tgt && td < 140) {
      if (td > 14) { const sp = SPEED * 0.7 * dt; z.x += (tgt.x - z.x) / td * sp; z.y += (tgt.y - z.y) / td * sp; z.moving = true; z.walkT += dt; z.dir = tgt.x < z.x ? 'left' : 'right'; }
      else { z.moving = false; if (now - z.hitAt > 2200) { z.hitAt = now; const v = ownerOf(tgt); if (v) { pl(v); hurt(v, tgt, z.dmg * rnd(0.7, 1.2), z.label.toLowerCase()); } else { floatTxt(tgt.x, tgt.y - 24, '😱'); } } }
    } else z.moving = false;
  }
  beasts = beasts.filter(z => z.a > 0);
}
function drawBeast(z) {
  const x = Math.round(z.x), y = Math.round(z.y), col = z.col, dk = shade(col, -30), lt = shade(col, 25), ph = z.moving ? Math.floor(z.walkT * 10) % 2 : 0, big = z.k === 'urso' ? 1.5 : 1.15;
  ctx.save(); ctx.globalAlpha = clamp(z.a, 0, 1); ctx.translate(x, y); ctx.scale(z.dir === 'left' ? -big : big, big);
  px(ctx, 'rgba(0,0,0,.25)', -7, 0, 14, 2);
  px(ctx, col, -6, -8, 11, 6); px(ctx, lt, -6, -8, 11, 1);
  for (const [lx, up] of [[-6, ph], [-3, !ph], [1, ph], [3, !ph]]) px(ctx, dk, lx, -2 - (up ? 1 : 0), 2, 3);
  px(ctx, col, 4, -11, 5, 5); px(ctx, '#d33', 7, -9, 1, 1); px(ctx, dk, 8, -8, 2, 2);
  if (z.k === 'lobo') { px(ctx, col, 4, -13, 1, 2); px(ctx, col, 7, -13, 1, 2); px(ctx, col, -9, -9, 3, 2); }
  if (z.k === 'javali') { px(ctx, '#fff', 9, -7, 1, 2); px(ctx, dk, -7, -9, 1, 1); }
  if (z.k === 'urso') { px(ctx, col, 4, -12, 2, 1); px(ctx, col, 7, -12, 2, 1); }
  ctx.restore();
  if (!z.dead) { const w = 18, f = clamp(z.hpNow / z.max, 0, 1); px(ctx, 'rgba(0,0,0,.6)', x - w / 2 - 1, y - 22, w + 2, 4); px(ctx, f > 0.5 ? '#2ecc71' : f > 0.25 ? '#f1c40f' : '#e74c3c', x - w / 2, y - 21, Math.round(w * f), 2); }
}
// Barra de vida pequena embaixo dos moradores machucados.
function hpBarEntities() {
  const out = [];
  for (const v of Object.values(L().viewers)) {
    if (v.npc == null || v.hp == null) continue; const n = npcOf(v);
    if (!n || !n.active || n.inside) continue;
    const icon = v.ko > Date.now() ? '💫' : v.food < 30 ? '🍗' : v.en < 25 ? '💤' : '';
    if (v.hp >= 100 && !icon) continue;
    out.push({ y: n.y + 0.5, k: 'live', draw: () => {
      const x = Math.round(n.x), y = Math.round(n.y);
      if (v.hp < 100) { const w = 14, f = clamp(v.hp / 100, 0, 1); px(ctx, 'rgba(0,0,0,.55)', x - w / 2 - 1, y + 2, w + 2, 3); px(ctx, f > 0.5 ? '#2ecc71' : f > 0.25 ? '#f1c40f' : '#e74c3c', x - w / 2, y + 3, Math.round(w * f), 1); }
      if (icon) { ctx.save(); ctx.font = '8px "Segoe UI Emoji","Noto Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(gtime * 3)); ctx.fillText(icon, x + 9, y - 20); ctx.restore(); }
    } });
  }
  return out;
}
// Saqueadores: !atacar durante o aviso soma o ataque do morador na defesa (uma vez por pessoa).
function raidAttackCmd(v, uid, n) {
  const r = L().raid; if (!r) return null;
  if (r.phase !== 'warn') return 'A batalha já começou!';
  r.fighters = r.fighters || {};
  if (r.fighters[uid]) return '';
  const a = atkOf(v, n); r.fighters[uid] = a; r.chat += a; addXp(v, 4);
  feed(`⚔️ ${n.name} entrou na defesa: +${a} 🛡️${v.eq.weapon ? ' com ' + ITEMS[v.eq.weapon].icon : ''}`);
  if (n.active) say(n, pick(['Pela vila! ⚔️', 'Venham, saqueadores!', 'Ninguém passa!']));
  // Na batalha, quem entrou na defesa pode se machucar.
  r.hurtList = r.hurtList || []; r.hurtList.push(uid);
  return '';
}
// Duelo amigável na praça: !duelo @nome, o outro aceita com !aceitar. Vale 5 moedas.
let duels = [];
function duelCmd(v, uid, n, target) {
  const t = norm(String(target || '').replace(/^@/, ''));
  if (!t) return 'Use !duelo @nome.';
  const ov = Object.values(L().viewers).find(x => norm(x.name) === t && x.npc != null);
  if (!ov || ov === v) return 'Não achei esse jogador na vila.';
  const on = npcOf(ov); if (!on) return 'Esse jogador não tem morador.';
  pl(ov);
  if (v.ko > Date.now() || ov.ko > Date.now()) return 'Alguém está desmaiado 💫.';
  duels = duels.filter(d => Date.now() < d.expires && !d.done);
  if (duels.some(d => d.av === v || d.bv === ov || d.av === ov || d.bv === v)) return 'Já tem um duelo pendente.';
  duels.push({ av: v, bv: ov, expires: Date.now() + 60000, done: false });
  announce(`⚔️ ${n.name} desafiou ${on.name}!`, `@${ov.name}, digite !aceitar em até 60 s · ninguém perde nada`);
  return '';
}
function acceptDuel(v, uid, n) {
  const d = duels.find(d => d.bv === v && !d.done && Date.now() < d.expires);
  if (!d) return 'Nenhum desafio para você agora.';
  d.done = true; const an = npcOf(d.av); if (!an) return '';
  for (const [m, vv] of [[an, d.av], [n, v]]) { if (!m.active) activate(m); vv.ord = { k: 'stay', until: Date.now() + 25000, goal: (x, y) => (x - CX) ** 2 + (y - CY) ** 2 <= 4 && Math.random() < 0.5 }; m.plan = [{ t: 'go', goal: vv.ord.goal }, work(6, 'hammer', null)]; m.step = null; m.inside = false; m.sleeping = false; m.status = 'Duelando ⚔️'; }
  announce(`⚔️ DUELO NA PRAÇA!`, `${an.name} contra ${n.name}`);
  camTo(CX * T + 8, CY * T + 8);
  setTimeout(() => {
    const pa = atkOf(d.av, an) + d.av.hp / 10 + rnd(0, 12), pb = atkOf(v, n) + v.hp / 10 + rnd(0, 12);
    const [wv, wn, lv, ln] = pa >= pb ? [d.av, an, v, n] : [v, n, d.av, an];
    wv.coins += 5; lv.coins += 1; addXp(wv, 6); addXp(lv, 3);
    announce(`🏆 ${wn.name} venceu o duelo!`, `+5 💰 para o vencedor · +1 💰 para ${ln.name} · boa luta!`);
    feed(`⚔️ ${wn.name} venceu ${ln.name} no duelo (+5 💰)`);
    if (wn.active) { confetti(wn.x, wn.y - 10); say(wn, 'Vitória! 🏆'); }
    if (ln.active) say(ln, 'Revanche! 😤');
  }, 14000);
  return '';
}

// ---------- Arma e escudo desenhados no morador ----------
const drawNPCBase = drawNPC;
drawNPC = function (n) {
  drawNPCBase(n);
  if (n.id == null || n.sleeping || n.inside || n.prof === 'saqueador') return;
  const v = ownerOf(n); if (!v || !v.eq) return;
  const w = v.eq.weapon, a = v.eq.armor; if (!w && !a) return;
  const x = Math.round(n.x), y = Math.round(n.y), swing = n.anim === 'hammer' ? Math.round(Math.sin(n.animT * 14) * 2) : 0;
  ctx.save(); ctx.translate(x, y); if (n.dir === 'left') ctx.scale(-1, 1);
  if (w === 'espada') { px(ctx, '#e3e8ee', 5, -17 + swing, 1, 8); px(ctx, '#ffffff', 5, -17 + swing, 1, 1); px(ctx, '#b8862f', 4, -9 + swing, 3, 1); px(ctx, '#5a3a1e', 5, -8 + swing, 1, 2); }
  else if (w === 'lanca') { px(ctx, '#8a5a2a', 5, -20 + swing, 1, 14); px(ctx, '#cfd6de', 4, -22 + swing, 3, 2); px(ctx, '#cfd6de', 5, -23 + swing, 1, 1); }
  else if (w === 'arco') { px(ctx, '#8a5a2a', 6, -16, 1, 1); px(ctx, '#8a5a2a', 7, -15, 1, 7); px(ctx, '#8a5a2a', 6, -8, 1, 1); px(ctx, '#eeeeee', 5, -15, 1, 7); }
  if (a === 'escudo') { px(ctx, '#cfd6de', -8, -12, 4, 6); px(ctx, '#8a5a2a', -7, -11, 2, 4); px(ctx, '#f1c40f', -7, -10, 1, 1); }
  ctx.restore();
};

// ---------- Comandos ----------
function playerCommand(v, uid, lower, raw) {
  if (!lower.startsWith('!')) return null;
  const [cmd0, ...args] = lower.slice(1).split(/\s+/); const cmd = cmd0.replace(/[^a-z]/g, '');
  const known = ['ir', 'va', 'vai', 'andar', 'anda', 'cortar', 'madeira', 'minerar', 'pedra', 'pescar', 'cacar', 'construir', 'trabalhar', 'comer', 'dormir', 'descansar', 'parar', 'status', 'ficha', 'vida', 'pet', 'mochila', 'inventario', 'loja', 'comprar', 'equipar', 'usar', 'atacar', 'lutar', 'duelo', 'aceitar', 'moedas'];
  if (!known.includes(cmd)) return null;
  if (cmd === 'loja') { if (Date.now() - shopAt > 30000) { shopAt = Date.now(); announce('🛒 Loja da vila', shopText() + ' · !comprar item'); } return ''; }
  const n = npcOf(v); if (!n) return 'Você ainda não tem morador: digite @Nome/profissão';
  pl(v);
  // Fichas entram na fila do !meu: a câmera mostra um jogador por vez, sem atropelar ninguém.
  if (['status', 'ficha', 'vida', 'moedas'].includes(cmd)) return showMine(v, 'meu');
  if (cmd === 'mochila' || cmd === 'inventario') return showMine(v, 'mochila');
  if (cmd === 'comprar') return buy(v, n, args.join(' '));
  if (cmd === 'equipar') return equip(v, n, args.join(' '));
  if (cmd === 'usar') return useItem(v, n, args.join(' '));
  if (cmd === 'pet') return petCmd(v, n, args, String(raw || '').trim().split(/\s+/).slice(2).join(' '));
  if (cmd === 'duelo') return duelCmd(v, uid, n, args[0]);
  if (cmd === 'aceitar') return acceptDuel(v, uid, n);
  if (cmd === 'parar') { if (!v.ord) return ''; v.ord = null; n.plan = []; n.step = null; n.anim = null; say(n, 'Ok, de volta à rotina!', 0.8); return ''; }
  if (cmd === 'comer') { if (v.ko > Date.now() || v.food >= 90 || Date.now() - (v.eatAt || 0) < EAT_GAP) return ''; v.eatAt = Date.now(); if (!n.active) activate(n); n.plan = []; n.step = null; n.inside = false; n.sleeping = false; planEat(n, v, true); return ''; }
  if (cmd === 'dormir' || cmd === 'descansar') return setOrder(v, n, 'sleep');
  if (cmd === 'atacar' || cmd === 'lutar') {
    const rr = raidAttackCmd(v, uid, n); if (rr != null) return rr;
    if (!beasts.some(z => !z.dead)) return 'Nenhuma fera por perto agora.';
    return setOrder(v, n, 'fight');
  }
  const map = { cortar: 'chop', madeira: 'chop', minerar: 'mine', pedra: 'mine', pescar: 'fish', cacar: 'hunt', construir: 'build', trabalhar: 'job' };
  if (map[cmd]) return setOrder(v, n, map[cmd]);
  // !ir lugar
  const place = placeGoal(args.join(' '), n);
  if (!place) return 'Lugares: floresta, rio, mina, praça, depósito, casa ou o nome de uma obra.';
  return setOrder(v, n, 'go', { goal: place.g, label: place.label, home: !!place.home });
}

// O cérebro dos moradores: ordens e necessidades de quem tem dono vêm antes da rotina.
const thinkBase = think;
think = function (n) {
  const v = ownerOf(n);
  if (v) { pl(v); try { if (orderPlan(n, v)) return; } catch (e) { console.error('ordem:', e); v.ord = null; } }
  return thinkBase(n);
};
setInterval(() => { try { needsTick(); petTickAll(); } catch (e) { console.error('necessidades:', e); } }, NEED_TICK);

// ================== TEMPORADAS ==================
// Ao fim de uma temporada (normalmente depois do foguete), o streamer começa um mundo novo.
// O hall da fama e os veteranos ficam salvos dentro do próprio mundo (vão junto no backup).
const MODS = {
  normal: { icon: '🌍', label: 'Mundo clássico', desc: 'Sem surpresas' },
  inverno: { icon: '❄️', label: 'Inverno eterno', desc: 'Neve o tempo todo e plantações lentas' },
  fertil: { icon: '🌱', label: 'Terra fértil', desc: 'Comida em dobro' },
  hostil: { icon: '⚔️', label: 'Terras hostis', desc: 'Ataques desde a Pedra, mais fortes e com saque dobrado' },
  ouro: { icon: '💰', label: 'Corrida do ouro', desc: 'Minas rendem o dobro' },
  sabio: { icon: '📚', label: 'Povo sábio', desc: 'Pesquisas 50% mais rápidas' },
};
function mod() { return L().mod || 'normal'; }
let showHall = 0;

function hallEntry() {
  const s = L();
  return {
    n: s.season, village: villageName, end: Date.now(), era: s.era, eraName: ERAS[s.era].name, finale: !!s.finale,
    pop: npcs.length, built: buildings.filter(b => b.done).length, raidsWon: s.raidsWon || 0, mod: mod(),
    eraTimes: Object.assign({}, ST().eraActive),
    top: topViewers(5).map(v => [v.name, Math.round(v.xp), level(v)]),
  };
}
function downloadSeasonBackup(n) {
  try {
    const blob = new Blob([JSON.stringify(JSON.parse(serialize()), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `pixelandia-temporada-${n}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return true;
  } catch (e) { console.error('backup da temporada:', e); return false; }
}
function startNewSeason() {
  const s = L();
  const msg = `Encerrar a temporada ${s.season} e começar um mundo novo?\n\nO mundo atual será baixado como backup e entra no hall da fama. Moradores, obras e eras recomeçam do zero.`;
  if (!confirm(msg)) return false;
  downloadSeasonBackup(s.season);
  const hall = (s.hall || []).concat([hallEntry()]);
  const vets = Object.assign({}, s.vets);
  for (const [uid, v] of Object.entries(s.viewers)) {
    if (!(v.xp > 0) && v.npc == null) continue;
    const old = vets[uid] || { name: v.name, seasons: 0, xp: 0 };
    vets[uid] = { name: v.name, seasons: old.seasons + 1, xp: old.xp + Math.round(v.xp || 0) };
  }
  const carry = { season: s.season + 1, hall, vets, stats: { sessions: ST().sessions, eraActive: {}, eraReached: { 0: Date.now() } } };
  newWorld();
  Object.assign(liveState, carry); L();
  arrivals_reset();
  setSeason('verao', true);
  placeMemorial();
  announce(`🌱 TEMPORADA ${carry.season}!`, 'Um mundo novo começa. Vote em como ele será!');
  feed(`🌱 Começou a temporada ${carry.season}. ${hall.length} temporada(s) no hall da fama`);
  openWorldVote();
  save(); refreshPanel(true); refreshHud();
  return true;
}
function arrivals_reset() {
  camQ.queue.length = 0; camQ.cur = null; camQ.until = 0;
  raiders = []; prodLast = null;
  applyEraNames(); restyleHouses();
}
// Memorial dos fundadores da temporada anterior, ao lado da fogueira.
function placeMemorial() {
  if (!L().hall.length) return;
  const d = BT.monumento, x = CX - 1, y = CY - 7;
  for (let yy = y; yy < y + d.h; yy++) for (let xx = x; xx < x + d.w; xx++) { const i = idx(xx, yy); if (bld[i] >= 0) return; obj[i] = 0; ground[i] = G_GRASS; }
  const b = { id: nextBid++, type: 'monumento', x, y, w: d.w, h: d.h, done: true, progress: d.time, need: d.time, manual: false, owner: null, startedAt: 0, memorial: L().season - 1 };
  placeBuilding(b); buildings.push(b); bById.set(b.id, b); redrawAllGround();
}
function openWorldVote() {
  const s = L();
  const keys = Object.keys(MODS).sort(() => Math.random() - 0.5).slice(0, 3);
  s.vote = { kind: 'mundo', id: ++s.voteN, title: '🌍 Como será o novo mundo?', opts: keys.map(k => ({ k, label: MODS[k].icon + ' ' + MODS[k].label })), ballots: {}, ends: Date.now() + LIVE_CFG.voteSec * 1000 };
  liveDirty = true;
}
function applyWorldMod(k) {
  const s = L(); s.mod = MODS[k] ? k : 'normal';
  if (s.mod === 'inverno') setSeason('inverno', true);
  const m = MODS[s.mod];
  announce(`${m.icon} Mundo: ${m.label}`, m.desc);
  feed(`${m.icon} O chat escolheu o mundo: ${m.label} (${m.desc})`);
}
function hallBox() {
  const h = L().hall || [];
  if (!h.length) return '<div class="lh-box"><b>🏛️ Hall da fama</b><small>Nenhuma temporada encerrada ainda</small></div>';
  return '<div class="lh-box"><b>🏛️ Hall da fama</b>' + h.slice(-3).reverse().map(e =>
    `<div class="opt"><span>T${e.n} · ${esc(e.village)} ${e.finale ? '🚀' : ''}</span><em>${esc(e.eraName)}</em></div><small>${e.top.slice(0, 3).map((t, i) => `${i + 1}º ${esc(t[0])}`).join(' · ') || 'sem fundadores'}</small>`).join('') + '</div>';
}
function viewerTag(v) { return '@' + v.name + (v.vet ? ` ⭐${v.vet}` : ''); }

// ================== ESTATÍSTICAS ==================
// Cada vez que o jogo fica aberto conta como uma "live" (sessão). Reabrir em até 20 min continua a mesma.
// Serve para balancear: quanto tempo de live cada era levou, quanta gente participou, ritmo do chat.
const SESSION_GAP = 20 * 60000, MAX_SESSIONS = 40;
function ST() {
  const s = L();
  if (!s.stats) s.stats = { sessions: [], eraActive: {}, eraReached: { 0: Date.now() } };
  if (!s.stats.eraActive) s.stats.eraActive = {};
  if (!s.stats.eraReached) s.stats.eraReached = {};
  return s.stats;
}
function newSession() {
  const s = L();
  return { start: Date.now(), end: Date.now(), activeMs: 0, season: s.season, eraStart: s.era, eraEnd: s.era, popStart: npcs.length, popEnd: npcs.length,
    viewers: {}, msgs: 0, arrivals: 0, ballots: 0, votes: 0, research: 0, raidsWon: 0, raidsLost: 0, chalWon: 0, chalLost: 0,
    donations: 0, donated: 0, members: 0, eras: [], perMin: [] };
}
function SES() {
  const st = ST(), last = st.sessions[st.sessions.length - 1];
  if (last && Date.now() - last.end < SESSION_GAP) return last;
  const n = newSession(); st.sessions.push(n);
  if (st.sessions.length > MAX_SESSIONS) st.sessions.splice(0, st.sessions.length - MAX_SESSIONS);
  return n;
}
function stat(k, n = 1) { const x = SES(); x[k] = (x[k] || 0) + n; }
function statViewer(uid) { const x = SES(); x.viewers[uid] = (x.viewers[uid] || 0) + 1; }
function statMsg(uid) {
  const x = SES(); x.msgs++; statViewer(uid);
  const m = Math.floor((Date.now() - x.start) / 60000);
  while (x.perMin.length <= m && x.perMin.length < 1440) x.perMin.push(0);
  if (m < 1440) x.perMin[m]++;
}
function statEra(era) { const st = ST(); st.eraReached[era] = Date.now(); SES().eras.push([era, Date.now()]); }
let statLast = Date.now();
function statTick() {
  const now = Date.now(), dt = Math.min(5000, now - statLast); statLast = now;
  const st = ST(), x = SES(), s = L();
  x.end = now; x.activeMs += dt; x.eraEnd = s.era; x.popEnd = npcs.length;
  st.eraActive[s.era] = (st.eraActive[s.era] || 0) + dt;
}
function dur(ms) { const m = Math.round(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${m} min`; }
function sessionSummary(x) {
  const mins = Math.max(1, x.activeMs / 60000), people = Object.keys(x.viewers).length;
  const peak = x.perMin.length ? Math.max(...x.perMin) : 0;
  return { mins, people, rate: x.msgs / mins, peak };
}
function statsLine() {
  const x = SES(), m = sessionSummary(x);
  return `Live atual: ${dur(x.activeMs)} · ${m.people} pessoa(s) · ${m.rate.toFixed(1).replace('.', ',')} msg/min`;
}
function openStats() {
  const st = ST(), s = L(), cur = SES(), m = sessionSummary(cur);
  const row = (a, b) => `<tr><td>${a}</td><td style="text-align:right"><b>${b}</b></td></tr>`;
  let h = `<h3><span>📊 Estatísticas da live</span><button class="btn sm" id="stX">✕</button></h3>`;
  h += `<p style="font-size:13px;margin:0 0 8px">Temporada ${s.season} · ${ERAS[s.era].icon} ${esc(ERAS[s.era].name)}. Use para ajustar o ritmo: se uma era demora demais, os requisitos dela estão altos.</p>`;
  h += `<table style="width:100%;font-size:14px;border-collapse:collapse">`;
  h += row('Duração desta live', dur(cur.activeMs)) + row('Pessoas que participaram', m.people) + row('Mensagens', `${fmt(cur.msgs)} (${m.rate.toFixed(1).replace('.', ',')}/min, pico ${m.peak}/min)`);
  h += row('Moradores novos', `${cur.arrivals} (de ${cur.popStart} para ${cur.popEnd})`) + row('Votações / votos', `${cur.votes} / ${cur.ballots}`) + row('Pesquisas concluídas', cur.research);
  h += row('Eras', cur.eraStart === cur.eraEnd ? ERAS[cur.eraEnd].name : `${ERAS[cur.eraStart].name} → ${ERAS[cur.eraEnd].name}`);
  h += row('Ataques vencidos / perdidos', `${cur.raidsWon} / ${cur.raidsLost}`) + row('Desafios cumpridos / perdidos', `${cur.chalWon} / ${cur.chalLost}`);
  h += row('Doações', `${cur.donations} · R$ ${cur.donated.toFixed(2).replace('.', ',')}`) + row('Membros novos', cur.members) + `</table>`;
  h += `<div class="bgrp">⏳ Tempo de live em cada era</div><table style="width:100%;font-size:14px;border-collapse:collapse">`;
  for (let i = 0; i <= s.era; i++) h += row(`${ERAS[i].icon} ${esc(ERAS[i].name)}${i === s.era ? ' (atual)' : ''}`, dur(st.eraActive[i] || 0));
  h += `</table>`;
  const past = st.sessions.slice(-8).reverse();
  h += `<div class="bgrp">🗓️ Últimas lives</div><table style="width:100%;font-size:13px;border-collapse:collapse"><tr><th style="text-align:left">Data</th><th>Duração</th><th>Pessoas</th><th>Msg/min</th><th>Eras</th></tr>`;
  for (const x of past) { const k = sessionSummary(x); h += `<tr><td>${new Date(x.start).toLocaleDateString('pt-BR')} ${new Date(x.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td><td style="text-align:center">${dur(x.activeMs)}</td><td style="text-align:center">${k.people}</td><td style="text-align:center">${k.rate.toFixed(1).replace('.', ',')}</td><td style="text-align:center">${x.eraStart + 1}→${x.eraEnd + 1}</td></tr>`; }
  h += `</table><div class="row" style="margin-top:12px"><button class="btn" id="stJson">⬇️ Exportar JSON</button><button class="btn" id="stCsv">⬇️ Exportar planilha (CSV)</button><button class="btn" id="stClose">Fechar</button></div>`;
  modal(h);
  $('stX').onclick = closeModal; $('stClose').onclick = closeModal;
  $('stJson').onclick = () => downloadText(`pixelandia-estatisticas-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ season: s.season, era: s.era, ...st }, null, 2), 'application/json');
  $('stCsv').onclick = () => {
    const head = 'inicio;duracao_min;temporada;era_inicio;era_fim;pessoas;mensagens;msg_por_min;pico_msg_min;chegadas;votacoes;votos;pesquisas;ataques_vencidos;ataques_perdidos;desafios_cumpridos;desafios_perdidos;doacoes;valor_doado;membros';
    const lines = st.sessions.map(x => { const k = sessionSummary(x); return [new Date(x.start).toISOString(), Math.round(x.activeMs / 60000), x.season, x.eraStart + 1, x.eraEnd + 1, k.people, x.msgs, k.rate.toFixed(2).replace('.', ','), k.peak, x.arrivals, x.votes, x.ballots, x.research, x.raidsWon, x.raidsLost, x.chalWon, x.chalLost, x.donations, x.donated.toFixed(2).replace('.', ','), x.members].join(';'); });
    downloadText(`pixelandia-lives-${new Date().toISOString().slice(0, 10)}.csv`, '﻿' + [head, ...lines].join('\r\n'), 'text/csv');
  };
}
function downloadText(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type })), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}

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
  return overviewShot();
}
// Plano geral: enquadra todas as obras e moradores. Quanto maior a vila, mais a câmera se afasta.
// O lado esquerdo da tela fica coberto pelo overlay da live, então a vila é enquadrada no resto.
function overviewShot() {
  let x0 = CX - 6, y0 = CY - 5, x1 = CX + 6, y1 = CY + 5;
  for (const b of buildings) { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y - 1); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); }
  for (const n of npcs) if (n.active && !n.inside) { const tx = n.x / T, ty = n.y / T; if (Math.abs(tx - CX) < 40 && Math.abs(ty - CY) < 40) { x0 = Math.min(x0, tx); y0 = Math.min(y0, ty - 1); x1 = Math.max(x1, tx + 1); y1 = Math.max(y1, ty + 1); } }
  const pad = 2, usableW = cw * (cw < 700 ? 1 : 0.74), usableH = ch * 0.86;
  const z = Math.max(zMin(), Math.min(isMobile() ? 2.2 : 2.6, usableW / ((x1 - x0 + pad * 2) * T), usableH / ((y1 - y0 + pad * 2) * T)));
  const shift = (cw - usableW) / 2 / z; // empurra a vila para a direita, longe do overlay
  return { x: (x0 + x1) / 2 * T - shift, y: (y0 + y1) / 2 * T + ch * 0.04 / z, z };
}
// Sem ninguém em destaque, a câmera volta ao plano geral da vila (e se afasta conforme ela cresce).
let ovAt = 0, ovTarget = null;
function overviewFrame(dt) {
  if (!npcs.length || TOUR || REC || follow != null || Date.now() < camQ.until || Date.now() - lastUserCam < 60000) { ovTarget = null; return; }
  if (!ovTarget || Date.now() - ovAt > 3000) { ovAt = Date.now(); ovTarget = overviewShot(); }
  const k = Math.min(1, dt * 0.6);
  cam.x += (ovTarget.x - cam.x) * k; cam.y += (ovTarget.y - cam.y) * k; cam.z += (ovTarget.z - cam.z) * k;
}
function vitrineSummary() {
  const s = L(), e = ERAS[s.era], built = buildings.filter(b => b.done).length;
  const top = topViewers(3).map(v => v.name).join(', ');
  announce(`${e.icon} ${villageName}`, `${fmt(npcs.length)} morador${npcs.length === 1 ? '' : 'es'} · ${built} obra${built === 1 ? '' : 's'} · ${e.name}${top ? ' · Fundadores: ' + top : ''}`);
  if (L().hall.length && (vitSummaryN++ % 2)) showHall = Date.now() + 15000; else showTop = Date.now() + 15000;
}
let vitSummaryN = 0;
const EMPTY_EX = ['@Ana/lenhadora', '@Leo/pedreiro', '@Bia/pescadora', '@Rafa/minerador', '@Duda/pedreira', '@Caio/caçador'];
let vitLast = performance.now();
function vitrineFrame(now) {
  const dt = Math.min(0.1, (now - vitLast) / 1000); vitLast = now;
  const on = vitrineActive();
  try { raidFrame(dt); } catch (e) { console.error('saqueadores:', e); }
  try { beastFrame(dt); } catch (e) { console.error('feras:', e); }
  if (on !== vit.on) { vit.on = on; vit.target = null; vit.shotAt = 0; }
  if (on) {
    const t = Date.now();
    if (!vit.target || t - vit.shotAt > VIT_SHOT) { vit.shotAt = t; vit.target = vitrinePick(); }
    if (vit.target) {
      const k = Math.min(1, dt * 0.35);
      cam.x += (vit.target.x - cam.x) * k; cam.y += (vit.target.y - cam.y) * k; cam.z += (vit.target.z - cam.z) * k;
    }
    if (npcs.length && t - vit.summaryAt > VIT_SUMMARY) { vit.summaryAt = t; vitrineSummary(); }
  } else {
    try { overviewFrame(dt); } catch (e) { console.error('câmera:', e); }
  }
  requestAnimationFrame(vitrineFrame);
}
requestAnimationFrame(vitrineFrame);
// Mexer na câmera com o mouse pausa a vitrine por 1 minuto.
for (const ev of ['pointerdown', 'wheel']) $('c').addEventListener(ev, () => { lastUserCam = Date.now(); vit.target = null; }, { passive: true });
setInterval(() => {
  if (!npcs.length) { const s = L(), m = MODS[mod()]; $('emptySeason').textContent = s.season > 1 || s.vote?.kind === 'mundo' ? `Temporada ${s.season} · ${s.vote?.kind === 'mundo' ? 'vote no mundo: digite 1, 2 ou 3' : m.icon + ' ' + m.label}` : ''; }
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
  for (const v of Object.values(s.viewers)) { const n = npcOf(v); if (n) { n.liveTag = viewerTag(v); n.liveLv = level(v); } }
  applyEraNames(); restyleHouses();
  if (changed) save();
})();

// ================== LIVE SOZINHA ==================
// Para a live rodar sem ninguém no comando: eventos e estações acontecem sozinhos,
// e os botões de gravar vídeo e de disparar eventos à mão ficam escondidos.
function applyStudioHide() {
  let st = document.getElementById('lvHideCss');
  if (!st) { st = document.createElement('style'); st.id = 'lvHideCss'; document.head.appendChild(st); }
  st.textContent = LIVE_CFG.hideStudio ? '#recMenuBtn,#camBtn,#sndRec,#evBtn,#tlBtn,#pxQuick [data-action="cinema"],#pxQuick [data-action="events"]{display:none!important}' : '';
}
applyStudioHide();

const AUTO_EV = [
  { k: 'rain', w: 5, ok: () => !isNight(), msg: ['🌧️ CHUVA NA VILA!', 'As plantações agradecem 🌱'] },
  { k: 'chickens', w: 3, ok: () => !isNight() && npcs.length >= 3, msg: null },
  { k: 'party', w: 3, ok: () => hour() >= 16 && hour() < 20.5 && npcs.length >= 3, msg: ['🎆 FESTA NA PRAÇA!', 'Fim de tarde é dia de festa!'] },
  { k: 'ufo', w: 1, ok: () => npcs.length >= 4, msg: null },
  { k: 'snow', w: 3, ok: () => new Date().getMonth() === 11 && mod() !== 'inverno', msg: null },
];
let autoEvNext = Date.now() + 4 * 60000;
function autoEventBusy() {
  return TOUR || REC || L().raid || EV.rain > 0 || EV.snow > 0 || EV.party > 0 || EV.fire || EV.chickens.length || EV.ufo || EV.launch;
}
function autoEventTick() {
  if (!LIVE_CFG.autoEv || npcs.length < 2) return;
  if (Date.now() < autoEvNext) return;
  if (autoEventBusy()) { autoEvNext = Date.now() + 60000; return; }
  const opts = AUTO_EV.filter(e => e.ok());
  autoEvNext = Date.now() + LIVE_CFG.evMin * 60000 * (0.7 + Math.random() * 0.6);
  if (!opts.length) return;
  let r = Math.random() * opts.reduce((a, e) => a + e.w, 0), ev = opts[0];
  for (const e of opts) { r -= e.w; if (r <= 0) { ev = e; break; } }
  startEvent(ev.k);
  if (ev.msg) announce(ev.msg[0], ev.msg[1]);
  feed(`🎲 Evento automático: ${ev.msg ? ev.msg[0] : ev.k}`);
}
const SEASON_ORDER = ['primavera', 'verao', 'outono', 'inverno'];
function autoSeasonTick() {
  if (!LIVE_CFG.autoSeason || TOUR || REC) return;
  const want = mod() === 'inverno' ? 'inverno' : SEASON_ORDER[Math.floor((day() - 1) / Math.max(1, LIVE_CFG.seasonDays)) % 4];
  if (want !== SEASON) setSeason(want, mod() === 'inverno');
}
setInterval(() => { try { autoEventTick(); autoSeasonTick(); } catch (e) { console.error('live sozinha:', e); } }, 5000);

// ================== PAINEL: LEMBRA SE ESTAVA ESCONDIDO ==================
// O estado da tecla H vale entre recarregamentos: atualizar o jogo nunca reabre o painel na live.
const PANEL_KEY = 'pixelandia-live-panel-hidden';
function panelHidden() { const p = document.getElementById('panel'); return !!p && p.classList.contains('hidden'); }
addEventListener('load', () => setTimeout(() => {
  try {
    const p = document.getElementById('panel'); if (!p) return;
    if (localStorage.getItem(PANEL_KEY) === '1' && !panelHidden() && typeof togglePanel === 'function') togglePanel();
    new MutationObserver(() => { try { localStorage.setItem(PANEL_KEY, panelHidden() ? '1' : '0'); } catch (e) {} }).observe(p, { attributes: true, attributeFilter: ['class'] });
  } catch (e) { console.warn('painel:', e); }
}, 0));

// ================== ATUALIZAÇÃO AUTOMÁTICA ==================
// A cada minuto confere se index.html ou live-game.js mudaram no servidor local.
// Achou versão nova (igual em duas conferências seguidas, para não pegar arquivo pela metade):
// espera um momento calmo (sem ataque nem votação aberta), salva o mundo e recarrega sozinho.
// O painel continua como estava (escondido com H fica escondido).
const UPD_FILES = ['./index.html', './live-game.js'];
let updBase = null, updSeen = null, updReadyAt = 0;
function updHash(t) { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return t.length + ':' + (h >>> 0).toString(36); }
async function updSig() {
  const texts = await Promise.all(UPD_FILES.map(f => fetch(f + '?upd=' + Date.now(), { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })));
  return texts.map(updHash).join('|');
}
function updCalm() {
  const s = L();
  return !s.raid && !s.vote && !TOUR && !REC && !EV.ufo && !EV.launch && !(camQ.cur && Date.now() < camQ.until);
}
async function updCheck() {
  if (!/^https?:$/.test(location.protocol)) return;
  try {
    const sig = await updSig();
    if (!updBase) { updBase = sig; return; }
    if (sig === updBase) { updSeen = null; updReadyAt = 0; return; }
    if (sig !== updSeen) { updSeen = sig; return; } // espera a próxima conferência confirmar
    if (!updReadyAt) { updReadyAt = Date.now(); console.log('Versão nova do jogo encontrada: recarrega no próximo momento calmo.'); }
    if (updCalm() || Date.now() - updReadyAt > 10 * 60000) {
      try { if (typeof save === 'function') save(); } catch (e) {}
      try { localStorage.setItem(PANEL_KEY, panelHidden() ? '1' : '0'); } catch (e) {}
      location.reload();
    }
  } catch (e) { /* servidor fora do ar: tenta de novo depois */ }
}
setTimeout(updCheck, 5000);
setInterval(() => { updCheck(); }, 60000);
// Com versão nova confirmada, confere a cada 10 s se já está calmo para recarregar.
setInterval(() => { if (updReadyAt && (updCalm() || Date.now() - updReadyAt > 10 * 60000)) updCheck(); }, 10000);

// Jogo aberto pelo servidor local (iniciar-live.bat): a ponte já conecta sozinha.
try { if (new URL(LIVE_CFG.bridgeUrl, location.href).origin === location.origin) bridgeConnect(); } catch (e) {}
// Chave e live já salvas: reconecta o chat do YouTube sozinho ao reabrir ou recarregar o jogo.
if (LIVE_CFG.ytKey.trim() && LIVE_CFG.ytVideo.trim()) ytConnect();

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
