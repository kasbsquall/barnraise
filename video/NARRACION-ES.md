# Lo que se dice en el film, en español

Traducción de la narración grabada, con el minuto en que entra cada escena y lo
que se ve mientras se dice. Está aquí para poder juzgar el contenido sin depender
del inglés hablado: si alguna frase no dice lo que debe, se cambia esa frase y se
regenera solo ese clip, no el guion entero.

Total 2:52.9. La voz se grabó primero y de su duración medida salieron las
duraciones de las escenas, así que el vídeo sigue a la voz y no al revés.

---

## S1 · La pausa — 0:00, 10,6s

> Este agente terminó de negociar con el agente de otra organización. Entonces se
> detuvo, y esperó a que una persona firmara.

**En pantalla:** el panel de decisión con los términos que los agentes acaban de
cerrar, y los botones de firmar o rechazar. Sin logo y sin rótulo: el film abre
con un agente parado.

---

## S2 · Seis organizaciones, setecientos metros — 0:10, 24,9s

> Seis organizaciones comunitarias, todas dentro de un mismo distrito. Una
> biblioteca con una furgoneta que está parada los martes. Un banco de alimentos
> con sitio en la cámara frigorífica que no llena. Una cocina con seis fuegos que
> nadie usa antes de las cuatro de la tarde. Están a setecientos metros unas de
> otras, y ninguna puede ver lo que las demás tienen parado.

**En pantalla:** el mapa con las seis, y la ficha de cada una abriéndose sobre la
frase que la nombra. Al final, la lista de distancias reales por carretera: la
biblioteca al banco de alimentos son 714 metros.

**Ojo con esta frase.** Antes decía "ninguna sabe lo que tienen las otras", y el
mapa de esa misma escena enseña siete acuerdos que ya han firmado entre ellas. Lo
que sí es cierto es que ningún agente tiene una herramienta que devuelva el
inventario del vecino: no pueden **verlo**.

---

## S3 · Para quién es — 0:35, 10,2s

> Es para ellos. Seis personas, seis organizaciones, sin departamento de
> informática, y sin ganas de otro panel de control que revisar.

**En pantalla:** tres fichas con su foto, su directora o director, la gente a la
que sirven y su dirección. Ana Torres, Luis Mendoza y Marta Ochoa.

---

## S4 · Los agentes hablan — 0:45, 31,4s

> Cada organización ejecuta su propio agente sobre sus propios datos privados.
> Los agentes se alcanzan por A2A, el protocolo agente a agente, cruzando la
> frontera entre procesos. El banco de alimentos necesita una furgoneta los
> martes. La biblioteca tiene una parada. Ninguno de los dos lo sabía. Ahí está.
> Un vehículo que iba a quedarse quieto, y el vecino que lo necesitaba ese día.

**En pantalla:** la ronda real corriendo. Lo que se escribe en la columna es lo
que los agentes se dijeron por A2A, y cada mensaje cruza el mapa por la carretera
que tomaría. Termina en TERMS CLOSED, con los dos agentes cerrando el trato.

---

## S5 · Dos firmas — 1:17, 31,5s

> Nada se ejecuta con una sola firma. Luis firma desde el banco de alimentos. Ana
> no puede ver su decisión desde la biblioteca, y el servidor rechaza su firma si
> lo intenta. Ella firma su propio lado. Solo entonces existe el acuerdo, y la
> línea entre ellos se vuelve más gruesa. Cuatro de estas filas son historia
> sembrada. Las otras cuatro las negociaron los agentes, en rondas como esta.

**En pantalla:** las dos firmas, el panel de decisión desapareciendo de la consola
de la otra directora, y la fila virando a crema. El crema es el único color
reservado del film: significa acuerdo firmado por las dos partes y no aparece en
ningún otro sitio.

---

## S6 · Lo que rechaza — 1:48, 20,5s

> Un agente no tiene ninguna herramienta que devuelva los recursos de un vecino.
> Y lo que llega al libro lo revisa el código en vez de confiárselo a un modelo:
> la dirección equivocada, un día que nadie negoció, una organización que no es
> parte. Un financiador va a leer esto.

**En pantalla:** el código fuente real, con la cámara entrando sobre las dos
firmas donde vive la garantía (ninguna de las dos herramientas acepta
argumentos), y después los tres rechazos con su respuesta literal. Los dos
primeros salen de llamar a los guardias; el tercero es un 403 del servidor.

---

## S7 · La coalición — 2:09, 32,2s

> Entonces aparece una convocatoria. Sola, la más fuerte de ellas cubre tres
> requisitos de seis, y la cocina no cubre ninguno. Ninguna llega a las mil
> personas que el fondo pide. Juntas cubren los seis y llegan a tres mil
> doscientas cincuenta. Y el requisito que nadie puede fingir es este:
> colaboración previa documentada. Pide tres acuerdos. El libro tiene ocho.

**En pantalla:** la convocatoria entera, leída de arriba abajo. Las ocho cifras
que se dicen están en pantalla cuando se dicen, y todas salen del escaneo
determinista, no de un modelo.

---

## S8 · Cierre — 2:41, 11,7s

> Todo agente de este sector trabaja dentro de una organización. Barnraise es el
> primero que trabaja entre ellas.

**En pantalla:** la marca dibujándose radio a radio, el nombre, la frase, y el
enlace al repositorio con su código QR, que decodifica de verdad.

---

## Lo que el film NO afirma, a propósito

- Que solo una coalición califica. Califican cuatro tríos, y el número se mueve
  según crece el libro, que es el producto funcionando y no un defecto.
- Que el libro se construyó solo. Cuatro de las ocho filas son historia sembrada,
  y S5 lo dice en voz alta.
- Que un agente no puede físicamente leer datos de un vecino. Lo que S6 enseña es
  la garantía real: no existe una herramienta que los devuelva.
- Que las firmas están autenticadas. No lo están, y el README lo dice.
- Que se ejecuta sobre Bedrock. Corre en Gemini y en Ollama; el proveedor es una
  variable de entorno y el repo documenta los tres, pero no se ha grabado ninguna
  ejecución sobre Bedrock.
- Que las fotos de los edificios o las direcciones correspondan a organizaciones
  reales. Las calles son reales, las organizaciones no, y el aviso está en
  pantalla durante todo el film.
