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

// SERVER_URL es undefined en producción (mismo origen); acá lo resolvemos a
// un prefijo usable para fetch(), vacío cuando no hace falta un host propio.
const API_BASE = SERVER_URL ?? "";

export async function uploadImage(file) {
  const res = await fetch(`${API_BASE}/api/uploads`, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error ?? "No se pudo subir la imagen.");
  return `${API_BASE}${data.url}`;
}
