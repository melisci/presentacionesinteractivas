import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// host: true expone el dev server en la red local para que los celulares
// puedan escanear el QR y entrar desde la misma wifi.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
});
