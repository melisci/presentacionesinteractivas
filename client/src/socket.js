import { io } from "socket.io-client";

// En producción el server sirve el build del cliente desde el mismo origen
// (ver server/src/index.js), así que no hace falta especificar host/puerto.
// En dev, el cliente corre en Vite (5173) y el server en otro puerto (4000
// por defecto), tanto en localhost como en la IP de LAN para el flujo de QR.
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ??
  (import.meta.env.PROD ? undefined : `${window.location.protocol}//${window.location.hostname}:4000`);

export const socket = io(SERVER_URL, {
  autoConnect: true,
});

export function emitWithAck(event, payload = {}) {
  return new Promise((resolve, reject) => {
    socket.emit(event, payload, (res) => {
      if (res?.ok) resolve(res);
      else reject(new Error(res?.error ?? "Error desconocido"));
    });
  });
}
