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
| `1`, `2`, `3` (ou `!votar fonte`) | Vota na próxima obra. |
| `A` / `B` | Escolhe a opção de um dilema. |
| `!ajudar` | Conta no mutirão e dá ânimo ao seu morador. |
| `!meu` | Entra na fila da câmera: seu morador aparece por 8 s, com nível e status. |
| `!top` | Mostra o ranking de quem mais ajudou. |
| `!era` | Mostra o que falta para a próxima era. |
| `!ajuda` | Mostra os comandos na tela. |
| Qualquer outra mensagem | Seu morador fala o texto num balão e ganha ânimo (trabalha 60% mais rápido por 45 s). |

Profissões:

- **Liberada na era atual:** o morador chega trabalhando nela.
- **De uma era futura:** o morador chega como **Aprendiz** e se forma quando a vila alcança essa era.
- **Desconhecida** (ex.: astronauta): o morador mantém o nome da profissão e ajuda nas obras e no corte de madeira.

## Progressão: eras

| Era | Libera | Para avançar |
|---|---|---|
| 🔥 Acampamento | lenhador, pedreiro, fazendeiro, minerador · casa, serraria, celeiro, poço | 5 moradores, 3 obras, serraria |
| 🛖 Aldeia | pescador, caçador, cozinheiro, pecuarista, jardineiro, músico | 12 moradores, 9 obras, restaurante |
| 🏘️ Vila | padeiro, ferreiro, comerciante, carteiro, policial, médico, professor, prefeito | 25 moradores, 20 obras, prefeitura e escola |
| 🏙️ Cidade | bombeiro, enfermeiro, marinheiro, maquinista | 50 moradores, 35 obras, hospital e estação |
| 🚀 Metrópole | piloto, polissonografista · estádio, castelo, aeroporto, foguete | era final |

## Ciclo automático

Com o ciclo ligado (**Controle da partida**), o jogo alterna estas rodadas:

- **Votação de obra**, a cada 4 min, com 75 s para votar. São 3 opções da era atual. Uma casa entra entre as opções quando há gente sem casa. O voto tem peso maior para quem tem nível alto e para quem tem voto turbinado.
- **Dilema**, a cada 7 min, com 60 s para votar. O chat escolhe A ou B, e cada escolha tem uma consequência: recursos, eventos, novos vizinhos ou festa.
- **Desafio**, a cada 6 min. Há cinco tipos: juntar madeira, juntar pedra, mutirão de `!ajudar`, receber novos moradores e volume de mensagens. Se o chat cumprir, todos ganham recursos, ânimo e XP. Se falhar, a vila tem uma perda pequena.

Os intervalos podem ser ajustados no painel. Os botões **Votar obra**, **Dilema**, **Desafio** e **Apurar agora** disparam cada rodada na hora.

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
