import { Router } from "express";
import express from "express";

import { imageStore } from "../state/imageStore.js";

export const uploadsRouter = Router();

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE = 15 * 1024 * 1024; // 15MB, de sobra para un PNG exportado de Canva

uploadsRouter.post(
  "/api/uploads",
  express.raw({ type: ALLOWED_TYPES, limit: MAX_SIZE }),
  (req, res) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ ok: false, error: "Imagen inválida o tipo no soportado (usá PNG, JPG o WEBP)." });
    }

    const id = imageStore.save(req.body, req.headers["content-type"]);
    res.json({ ok: true, id, url: `/uploads/${id}` });
  }
);

uploadsRouter.get("/uploads/:id", (req, res) => {
  const image = imageStore.get(req.params.id);
  if (!image) return res.status(404).end();

  res.set("Content-Type", image.contentType);
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  res.send(image.buffer);
});
