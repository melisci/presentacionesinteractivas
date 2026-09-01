import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

import { healthRouter } from "./routes/health.js";
import { uploadsRouter } from "./routes/uploads.js";
import { registerSocketHandlers } from "./socket/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT ?? 4000;
// En dev el cliente se sirve tanto en localhost como en la IP de LAN (para
// que los celulares entren por el QR), así que reflejamos cualquier origen
// en vez de fijar uno solo. Restringir esto es tarea de un despliegue real.
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? true;

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());
app.use(healthRouter);
app.use(uploadsRouter);

// Si existe el build del cliente (client/dist), lo servimos desde el mismo
// proceso: así el deploy queda en una sola URL (necesario para embeberla en
// Canva) y el cliente/servidor comparten origen, sin depender de CORS.
const clientDist = path.resolve(__dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/socket.io") || req.path === "/health") return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN },
});

registerSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
