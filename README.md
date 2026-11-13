# Mundo Pixelândia LIVE

Jogo de vila controlado pelo chat de uma live. O mundo começa vazio, numa clareira com uma fogueira. Quem assiste cria moradores, vota nas obras, decide dilemas e cumpre desafios. Super Chats, Pix e membros aceleram o crescimento.

## Como abrir

Dê dois cliques em **`iniciar-live.bat`**. Ele:

1. liga o servidor local (`node ponte/ponte.mjs`) numa janela minimizada, que deve ficar aberta durante a live;
2. abre o jogo em `http://localhost:8787/` numa janela própria do Chrome (ou do Edge, se não houver Chrome);
3. usa um perfil de navegador só do jogo, em `%LOCALAPPDATA%\PixelandiaLive\navegador`.

Sempre o mesmo endereço e o mesmo perfil: o mundo salvo continua de uma live para a outra, mesmo se você limpar o histórico do seu navegador do dia a dia. A ponte de eventos já conecta sozinha. Precisa do [Node.js](https://nodejs.org) instalado.

Um mundo criado em outro endereço (abrindo o `index.html` direto, por exemplo) não aparece aqui: exporte em **Controles → Backup** lá e importe nesta janela. Faça backup de vez em quando.

Antes de transmitir, esconda o painel com a tecla **H**. O overlay da live, no canto inferior esquerdo, continua visível. No OBS, capture a janela "Mundo Pixelândia LIVE".

Ao reabrir, votações e desafios que venceram com o jogo fechado são cancelados sem penalidade, e o ciclo recomeça com folga.

## Comandos do chat

| Comando | Efeito |
|---|---|
| `@Nome/profissão` (ou `!morador Nome \| profissão`) | Traz seu morador. É um morador por pessoa. |
| `1`, `2`, `3` (ou `!votar fonte`) | Vota na próxima obra ou na próxima pesquisa. |
| `A` / `B` | Escolhe a opção de um dilema. |
| `!ajudar` | Acelera a pesquisa, conta no mutirão e dá ânimo ao seu morador. |
| `!defender` | Durante um ataque de saqueadores, prepara a defesa da vila (até 3 vezes por pessoa). |
| `!meu` | Entra na fila da câmera: seu morador aparece por 8 s, com nível e status. |
| `!top` | Mostra o ranking de quem mais ajudou. |
| `!era` | Mostra o que falta para a próxima era. |
| `!hall` | Mostra o hall da fama das temporadas passadas. |
| `!temporada` | Mostra a temporada atual e como é o mundo dela. |
| `!ajuda` | Mostra os comandos na tela. |
| Qualquer outra mensagem | Seu morador fala o texto num balão e ganha ânimo (trabalha 60% mais rápido por 45 s). |

Profissões:

- **Liberada na era atual:** o morador chega trabalhando nela.
- **De uma era futura:** o morador chega como **Aprendiz** e se forma quando a vila alcança essa era.
- **Desconhecida** (ex.: astronauta): o morador mantém o nome da profissão e ajuda nas obras e no corte de madeira.

## Progressão: 10 eras

A vila começa na **Era da Pedra** e avança até a **Era Moderna**. Para sair de uma era, o chat precisa cumprir todos os requisitos mostrados no overlay: população, obras prontas, prédios específicos, a **pesquisa-chave** da era e a **produção total** de recursos. A produção conta tudo o que a vila já produziu, não o que está guardado: construir nunca atrasa a era.

| # | Era | Profissões novas | Obras novas | Para avançar |
|---|---|---|---|---|
| 1 | 🪨 Pedra | lenhador, pedreiro, minerador, caçador, pescador, guerreiro | cabana, pátio da lenha, pesqueiro, depósito, oficina, totem | 4 moradores, 4 obras, depósito, Agricultura, 150 🪵, 40 🍖 |
| 2 | 🌾 Agrícola | fazendeiro, pecuarista, cozinheiro | celeiro, curral, poço, moinho, paliçada, cozinha comunitária | 7 moradores, 9 obras, moinho e paliçada, Metalurgia, 250 🍖, 400 🪵, 120 🪨 |
| 3 | 🥉 Bronze | comerciante, músico, padeiro, líder | mercado, mina, templo, muralha, palácio, taverna, fonte, estátua, padaria | 10 moradores, 15 obras, templo e mina, Fundição de ferro, 120 🪙, 350 🪨 |
| 4 | ⚔️ Ferro | ferreiro, guarda | ferraria, torre de vigia, estábulo, posto da guarda, sobrado | 14 moradores, 22 obras, ferraria e torre, Engenharia, 100 ⚙️, 300 🪙 |
| 5 | 🏛️ Clássica | professor, marinheiro, curandeiro | academia, porto, anfiteatro, parque, casa de cura, aqueduto | 19 moradores, 29 obras, academia, anfiteatro e aqueduto, Filosofia |
| 6 | 🏰 Medieval | mensageiro | mosteiro, castelo, estalagem, casa dos mensageiros | 24 moradores, 36 obras, castelo, Feudalismo |
| 7 | 📜 Baixa Idade Média | jardineiro | biblioteca, farol, catedral, universidade | 30 moradores, 43 obras, biblioteca, catedral e universidade, Universidades |
| 8 | 🎨 Renascença | bombeiro, cientista | banco, quartel de bombeiros | 36 moradores, 50 obras, banco, Navegação |
| 9 | 🏭 Industrial | maquinista, enfermeiro, polissonografista, operário, engenheiro | estação de trem, hospital, prédio, roda-gigante, fábrica, usina | 45 moradores, 60 obras, estação, fábrica e usina, Eletricidade, 300 ⚡ |
| 10 | 🚀 Moderna | piloto, programador | aeroporto, estádio, foguete, centro de tecnologia | **grande final** (abaixo) |

As eras 5 a 10 também pedem produção total de ouro, ferro, pedra ou energia (o overlay mostra os valores).

**Grande final:** na Era Moderna, com 55 moradores, 70 obras, foguete, aeroporto e centro de tecnologia, a pesquisa Corrida espacial e 1.500 ⚡ produzidos, o foguete da vila decola. Há festa, fogos, o ranking dos fundadores na tela e XP para todos. Acontece uma vez por mundo; depois a vila continua viva.

- **Pesquisa:** o chat vota o que a vila vai descobrir (`1`, `2`, `3`). A pesquisa-chave da era sempre está entre as opções. Ela avança sozinha, e cada mensagem no chat e cada `!ajudar` aceleram. Algumas pesquisas liberam obras: Ferramentas de pedra → oficina, Cestaria → depósito, Rituais → totem, Domesticação → curral, Moagem → moinho, Comércio → mercado, Mineração → mina, Forja → ferraria, Equitação → estábulo, Aquedutos → aqueduto, Medicina → casa de cura, Mosteiros → mosteiro, Arquitetura gótica → catedral, Universidades → universidade, Bancos → banco, Máquina a vapor → fábrica, Ferrovia → estação, Usina a carvão → usina, Aviação → aeroporto, Computação → centro de tecnologia, Corrida espacial → foguete. Universidade (+25%), centro de tecnologia (+50%) e cientistas aceleram as pesquisas; Cavalaria (+10) e Pólvora (+20) aumentam a defesa.
- **Recursos novos:** 🪙 ouro aparece no Bronze (mina, comércio e fábrica), ⚙️ ferro no Ferro (mina e ferraria) e ⚡ energia na Industrial (usina, mais com engenheiro). A oficina e a fábrica produzem ferramentas; o moinho e o aqueduto, comida.
- **O mundo muda de cara:** as casas passam de palha e tronco para barro, pedra, tijolo e, na era final, concreto. Alguns nomes acompanham a era: Cabana → Casa de barro → Casa; Guarda → Policial; Curandeiro → Médico.
- **Profissão do futuro:** quem pede uma profissão de era posterior chega como aprendiz e se forma quando a vila chega lá.
- **Metas de população** dão de presente uma obra da era atual, nunca um prédio do futuro.

## Temporadas

Quando a vila termina (normalmente depois do foguete), o streamer clica em **🌱 Nova temporada** em **Controle da partida**. O botão pede confirmação, porque o mundo recomeça do zero.

1. O mundo atual é **baixado como backup** (`pixelandia-temporada-N-data.json`) e entra no **hall da fama**: vila, era alcançada, se o foguete decolou, população, obras, ataques vencidos e os 5 maiores fundadores.
2. Um mundo novo começa na Era da Pedra, com um **memorial** dos fundadores ao lado da fogueira.
3. O chat **vota como será o novo mundo** (`1`, `2`, `3`):
   - 🌍 **Mundo clássico:** sem surpresas.
   - ❄️ **Inverno eterno:** neve o tempo todo e plantações lentas.
   - 🌱 **Terra fértil:** comida em dobro.
   - ⚔️ **Terras hostis:** ataques desde a Pedra, mais fortes, mais frequentes e com saque dobrado.
   - 🪙 **Corrida do ouro:** minas rendem o dobro.
   - 📚 **Povo sábio:** pesquisas 50% mais rápidas.
4. **Veteranos:** quem jogou temporadas anteriores ganha ⭐ com o número de temporadas na etiqueta do morador, +10 XP ao voltar e um aviso no overlay. Nível e XP recomeçam a cada temporada, para todos disputarem de igual.

O hall da fama e os veteranos ficam salvos dentro do mundo, então vão junto no backup. O overlay mostra a temporada e o mundo no topo (ex.: `T2 🪙 · 🪨 Era da Pedra`). O modo vitrine alterna entre o ranking atual e o hall da fama, e o botão **🏛️ Hall** mostra o hall na tela.

## Saqueadores

A partir da **Era Agrícola**, com pelo menos 5 moradores, saqueadores atacam de dia, a cada 15 min em média.

1. **Aviso (90 s):** o overlay mostra de onde vêm e compara 🛡️ Defesa com 🗡️ força dos saqueadores. O chat digita `!defender`, e Pix e Super Chat contratam mercenários (+2 de defesa por real).
2. **Batalha:** os saqueadores saem da floresta e os defensores correm para encontrá-los.
3. **Resultado:**
   - **Vitória:** os saqueadores fogem e deixam ouro (ou madeira, antes do Bronze). Quem ajudou e os donos de guerreiros, guardas e caçadores ganham XP.
   - **Derrota:** levam de 15% a 30% dos estoques, e às vezes um prédio pega fogo.

A defesa soma:
- **Estruturas:** paliçada 10, muralha 25, torre de vigia 12, castelo 60, posto da guarda 8, estábulo 5.
- **Moradores:** guerreiro 8 (12 com ferraria), guarda 6, caçador 3.
- **Chat:** `!defender` vale +2, até 3 vezes por pessoa.
- **Mercenários:** doações durante o ataque.

A força dos saqueadores cresce com a era, a população e o número de ataques. Os inimigos mudam com a época: **saqueadores** até o Ferro, **invasores** na Clássica e Medieval, **piratas** na Renascença (sempre pelo mar, a leste) e **bandidos** da era Industrial em diante.

**Guerreiro** é profissão da Era da Pedra (também aceita soldado, lanceiro, cavaleiro, vigia, espadachim). Fora dos ataques, patrulha as defesas.

Em **Controle da partida**, o botão **⚔️ Ataque** anuncia um ataque na hora, e a opção **Ataques de saqueadores** liga ou desliga os automáticos. Um ataque interrompido ao fechar o jogo é cancelado sem penalidade.

## Ciclo automático

Com o ciclo ligado (**Controle da partida**), o jogo alterna estas rodadas:

- **Votação de pesquisa**, sempre que nenhuma pesquisa estiver em andamento (tem prioridade sobre as outras rodadas), com 75 s para votar.
- **Votação de obra**, a cada 4 min, com 75 s para votar. São 3 opções liberadas na era; as obras que a era exige aparecem primeiro. Uma casa entra entre as opções quando há gente sem casa. O voto tem peso maior para quem tem nível alto e para quem tem voto turbinado.
- **Dilema**, a cada 7 min, com 60 s para votar. O chat escolhe A ou B, e cada escolha tem uma consequência: recursos, eventos, novos vizinhos ou festa.
- **Desafio**, a cada 6 min. Há cinco tipos: juntar madeira, juntar pedra, mutirão de `!ajudar`, receber novos moradores e volume de mensagens. Se o chat cumprir, todos ganham recursos, ânimo e XP. Se falhar, a vila tem uma perda pequena.

Os intervalos podem ser ajustados no painel. Os botões **Votar obra**, **Dilema**, **Desafio** e **Apurar agora** disparam cada rodada na hora.

Desafios de coleta (madeira e pedra) só aparecem de dia, porque os moradores dormem à noite.

O relógio usa o modo **🔴 Live** (Controles → duração do dia): o dia dura o tempo escolhido em minutos reais e a noite passa em poucos segundos. O modo **📺 Episódio** congela às 16h e serve para gravar vídeos, não para live.

Para tirar um troll, use **Bloquear espectador** em **Controle da partida**: o morador dele é removido e as mensagens passam a ser ignoradas.

## Nível do espectador

O XP vem de mensagens (1 a cada 15 s), votos, `!ajudar`, desafios vencidos e doações. O **trabalho do seu morador também conta**: cada árvore cortada ou martelada numa obra rende XP. Os títulos vão de Forasteiro até Lenda de Pixelândia.

## Doações e membros

| Valor | Efeito (acumulativo) |
|---|---|
| Qualquer valor | +8 🪵 e +4 🪨 por real. Também conta na meta da live e nos desafios de recurso. |
| ≥ R$ 5 | 3 votos turbinados (+4 de peso cada). |
| ≥ R$ 10 | Obra relâmpago: +40% na obra atual. Também dispara um evento se a mensagem tiver `!festa`, `!chuva`, `!neve`, `!galinhas` ou `!ovni`. |
| ≥ R$ 25 | Com `!obra nome` na mensagem, essa obra vem de presente. |
| ≥ R$ 50 | Mansão VIP para o morador de quem doou. |

Outros apoios:

- **Membro novo:** o morador ganha mansão VIP. Se a pessoa ainda não tem morador, a mansão vem quando ela chegar.
- **Assinaturas presenteadas:** festa na praça.
- **Meta da live:** quando é batida, há festa e um bônus grande de recursos, e a meta dobra.

O painel tem botões para simular Pix, Super Chat e membro. Eles também servem para registrar à mão um Pix que chegou por outro alerta.

## Conexões

### YouTube

Em **Conexões**, informe uma chave da YouTube Data API v3 e o link da live, e clique em **Conectar**. O jogo lê pela API: mensagens, Super Chats, Super Stickers, novos membros e assinaturas presenteadas.

- O jogo só lê o chat. Ele não responde no chat do YouTube: as respostas aparecem no overlay.
- Cada leitura gasta cota da API, e o intervalo nunca fica abaixo de 6 s. A cota diária padrão (10.000 unidades) cobre algumas horas de live. Se precisar de mais, peça aumento no Google Cloud.
- Valores em outras moedas são convertidos para real por uma tabela aproximada, definida em `RATES` no arquivo `live-game.js`.
- Ainda não foi testado com uma live real. Se a API recusar a chave para o chat, será preciso autenticar com OAuth.

### Pix e outras fontes (ponte local)

O `iniciar-live.bat` já liga a ponte e o jogo se conecta sozinho. Qualquer serviço pode enviar eventos com `POST http://localhost:8787/evento`:

```json
{ "type": "pix", "user": "id-unico", "name": "João", "amount": 10, "currency": "BRL", "text": "!festa" }
```

Tipos aceitos: `pix`, `donation`, `chat`, `member` e `gift`. Defina `PONTE_TOKEN` para exigir `Authorization: Bearer <token>`.

Para receber webhooks da internet, como os do LivePix, exponha a porta com um túnel (cloudflared ou ngrok). Depois, traduza o corpo do webhook na função `adaptar()` de `ponte/ponte.mjs`. O formato do LivePix ainda não está mapeado.

No console do navegador também dá para injetar eventos com `liveEvent({...})`.

## Arquivos

- `index.html`: simulação da vila.
- `live-game.js`: motor da live (comandos, eras, votações, dilemas, desafios, doações, overlay e conexões).
- `ponte/ponte.mjs`: servidor local do jogo e ponte HTTP → SSE para Pix e outras integrações.
- `iniciar-live.bat`: abre servidor e jogo sempre no mesmo endereço e perfil.
