import { nanoid } from "nanoid";

// Guardado en memoria, igual que las Rooms: no sobrevive un reinicio del
// server. Alcanza para el caso de uso (subís las slides antes de presentar).
class ImageStore {
  constructor() {
    /** @type {Map<string, { buffer: Buffer, contentType: string }>} */
    this.images = new Map();
  }

  save(buffer, contentType) {
    const id = nanoid(12);
    this.images.set(id, { buffer, contentType });
    return id;
  }

  get(id) {
    return this.images.get(id) ?? null;
  }
}

export const imageStore = new ImageStore();
