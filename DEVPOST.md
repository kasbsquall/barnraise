# Barnraise — texto para Devpost

Borrador para pegar. Todo lo que afirma está verificado contra el repo o contra
una ejecución real; lo que no se puede sostener no está. Repasar antes de enviar
por si alguna cifra ha cambiado.

---

## Nombre

Barnraise

## Frase (tagline)

Every agent in this sector works inside one organization. Barnraise is the first
one that works between them.

## Track

Good Neighbor Agents

---

## Inspiration

Cooperation between neighbouring community organizations has always existed. It
just never left a trace.

Every AI tool in the nonprofit sector automates the *inside* of one organization:
its donors, its volunteers, its grants. Meanwhile funders ask, explicitly, to see
that you work with food banks, schools and clinics rather than operating in a
silo. They ask for collaboration, and nobody built the infrastructure that lets
it happen without meetings.

A library has a van that sits idle on Tuesdays. A food bank two streets away
needs one that day. Neither can see what the other has.

## What it does

Barnraise gives every organization its own agent over its own private data. The
agents reach each other over A2A, the agent-to-agent protocol, across process
boundaries, and negotiate concrete exchanges: this resource, that day, these
conditions.

Then they stop. Nothing is written until a human on each side signs. Every closed
agreement lands in a shared ledger, and that ledger is the asset: when a funding
call appears, the coalition agent can show documented prior collaboration rather
than assert it.

Two layers, one cycle. Daily cooperation produces evidence; the evidence makes a
coalition credible; the coalition brings money that funds more cooperation.

## How we built it

- **Strands Agents SDK** for the agents and for the human-in-the-loop interrupt.
  A round genuinely blocks on a worker thread waiting on an event, not on a timer.
- **A2A** with one server process per organization, six of them, each serving its
  own agent card. Ports 9001 to 9006.
- **Model-agnostic**: Amazon Bedrock, Google AI Studio and Ollama behind one
  environment variable. The demo was recorded on Gemini's free tier; the local
  path needs no key at all.
- **Deterministic guards at the tool boundary.** What reaches the ledger is
  checked by code rather than trusted to a model: the direction of the exchange,
  the day that was actually negotiated, whether the counterparty is a real
  organization id, and whether the same trade is already live between the two.
- **Data isolation by construction.** Each agent's tools are closures over one
  profile, so no tool exists that returns a neighbour's inventory.
- **FastAPI + SSE** for the live console, and **MapLibre over OpenStreetMap**
  with real driving routes from OSRM, so the distances on screen are real.

## Challenges we ran into

The interesting failures were the ones no test caught.

An agent that is told "no" would call the same tool again, and the loop put the
decision the director had just refused straight back in front of them, forever.
The app stayed marked busy and every later round failed until the process was
restarted. It is bounded now, and a stub agent that never stops asking is a test.

The ledger accepted the same exchange over and over. Six copies of one
van-for-food trade had accumulated. A book that records one trade six times
documents an agent looping, not a neighbourhood collaborating, so a guard now
refuses a trade already live between the same two parties.

## Accomplishments that we're proud of

The product refuses things, and it can show you. A funder reading this ledger is
reading rows that a model could not have written on its own: every one passed a
deterministic check and carries two human signatures.

## What we learned

Building agents that talk to each other is the easy half. The hard half is making
what they produce trustworthy enough that someone outside would rely on it, and
almost all of that work is checks, refusals and evidence rather than capability.

## What's next for Barnraise

Authentication is the piece a real deployment needs and this prototype does not
have: the signing organization is a field in the request, so the checks constrain
the interface rather than an arbitrary caller. After that, letting an
organization publish its agent card to neighbours it has not met.

## Built with

python · strands-agents · a2a · amazon-bedrock · google-gemini · ollama ·
fastapi · sqlite · maplibre · openstreetmap · osrm · remotion

## Try it out

- Demo video: https://www.youtube.com/watch?v=sdSvH0PwtYQ
- Repository: https://github.com/kasbsquall/barnraise
- Build write-up: https://builder.aws.com/content/3INkNpD9WU7cRi69pfK13Ul7Yve/agents-for-humans-six-strands-agents-one-ledger-and-the-pause-that-would-not-stop-asking
- Runs locally with no key at all on Ollama, or on Gemini's free tier.

---

## Lo que NO decimos, a propósito

Esto no va en Devpost, es la lista de control antes de enviar. Cada punto es una
afirmación que sería fácil hacer y que no se sostiene.

- **No decimos que solo una coalición califica.** Califican cuatro tríos, y el
  número se mueve según crece el libro.
- **No decimos que el libro se construyó solo.** Cuatro de las ocho filas son
  historia sembrada, y el film lo dice en voz alta.
- **No decimos que un agente no pueda físicamente leer datos de un vecino.** Lo
  que se garantiza es que no existe una herramienta que los devuelva.
- **No decimos que las firmas estén autenticadas.** No lo están.
- **No decimos que la demo corra sobre Bedrock.** El proveedor es una variable de
  entorno y el repo documenta los tres, pero no se ha grabado ninguna ejecución
  sobre Bedrock.
- **No decimos que las organizaciones sean reales.** Las calles y las rutas sí;
  las organizaciones no, y el aviso está en pantalla durante todo el film.
- **Hay una afirmación cuya prueba está en el código y no en su fotograma.** En S5
  la voz dice que el servidor rechaza la firma de una directora sobre la decisión
  de otra organización. Es cierto (`web/runner.py:80-83`, 403 con "This decision
  belongs to..."), pero en pantalla no se ve el intento. Todas las demás cifras y
  afirmaciones del film están visibles en el plano donde se dicen.

## Pendiente antes de enviar

- [ ] **AWS Builder ID creado.** Es entregable obligatorio.
- [x] **Límite de duración del vídeo leído en las bases.** El tope son 5:00 y el
      montaje dura 2:52,9, así que sobra margen.
- [x] Vídeo subido: https://www.youtube.com/watch?v=sdSvH0PwtYQ
      Falta pegar el enlace en el formulario de envío.
- [ ] **Diagrama de arquitectura**: existe en docs/ARCHITECTURE.md y está enlazado
      desde el README. Repasar que se vea al abrirlo desde el envío.
- [x] Post de builder.aws.com publicado (0,2 puntos). Falta pegar la URL en el
      campo del bonus del formulario:
      https://builder.aws.com/content/3INkNpD9WU7cRi69pfK13Ul7Yve/agents-for-humans-six-strands-agents-one-ledger-and-the-pause-that-would-not-stop-asking
- [ ] Claves de Gemini y ElevenLabs rotadas.
