# Presentaciones Interactivas

App tipo AhaSlides: el presentador lanza encuestas y nubes de palabras en vivo, la audiencia
entra desde el celular con un código de sesión y responde en tiempo real vía Socket.io.

## Estructura

```
presentaciones interactivas/
├── server/                 # Node + Express + Socket.io
│   ├── src/
│   │   ├── index.js        # bootstrap: Express + HTTP server + Socket.io
│   │   ├── routes/
│   │   │   └── health.js   # GET /health
│   │   ├── socket/
│   │   │   └── index.js    # todos los eventos de Socket.io (presenter:* / audience:*)
│   │   └── state/
│   │       └── store.js    # Room / Slide en memoria (sin DB por ahora)
│   ├── .env.example
│   └── package.json
└── client/                 # React (Vite) — vista presentador + vista audiencia
```

## Modelo de datos (en memoria)

- **Room**: una sesión, identificada por un `code` de 6 caracteres. Tiene un presentador
  (socket) y N participantes (audiencia).
- **Slide**: pregunta dentro de la sesión, de tipo `poll` (opciones con conteo de votos) o
  `wordcloud` (palabras con frecuencia acumulada).
- Solo una slide está "activa" a la vez (`room.activeSlideId`); la audiencia solo puede votar/
  enviar palabras contra la slide activa.

## Eventos de Socket.io

**Presentador**
- `presenter:create-session` → crea una Room, devuelve `{ code }`
- `presenter:add-slide { type, title, options? }` → agrega una slide (poll u wordcloud)
- `presenter:set-active-slide { slideId }` → cambia la slide visible para la audiencia
- `presenter:reset-slide { slideId }` → limpia votos/palabras de una slide
- `presenter:end-session` → cierra la sesión y desconecta a todos

**Audiencia**
- `audience:join { code, nickname? }` → entra a una Room existente
- `audience:vote { optionId }` → vota en la slide activa (tipo poll)
- `audience:submit-word { text }` → envía una palabra (tipo wordcloud)

**Broadcast del servidor** (a todos en la Room)
- `session:state` → snapshot completo `{ code, activeSlide, slides, participantCount }`,
  se emite cada vez que cambia algo (nueva slide, voto, palabra, join/leave)
- `session:ended` → la sesión terminó

Todos los eventos que el cliente emite aceptan un callback de ack:
`socket.emit("presenter:add-slide", payload, (res) => { ... })`, con `res = { ok, error? , ...datos }`.

## Cómo correr el servidor

```bash
cd server
npm install
cp .env.example .env
npm run dev   # nodemon-like, usa --watch de Node 22
```

El servidor queda escuchando en `http://localhost:4000` (configurable con `PORT`).

## Próximos pasos

1. Scaffolding del cliente React (Vite) con vista presentador y vista audiencia.
2. Conectar `socket.io-client`, formulario de "unirme con código" y componente de nube de
   palabras (ej. con `react-wordcloud` o una implementación simple con tamaño ∝ frecuencia).
3. Persistencia opcional (Redis o SQLite) si se necesita sobrevivir reinicios del servidor.
