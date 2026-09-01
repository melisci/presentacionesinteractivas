import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  AlertCircle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Cloud,
  Download,
  Image,
  Link2,
  Loader2,
  Play,
  RotateCcw,
} from "lucide-react";

import { socket, emitWithAck, uploadImage } from "../socket.js";
import SlideStage from "../components/SlideStage.jsx";
import PresentMode from "../components/PresentMode.jsx";

const emptyPollDraft = { type: "poll", title: "", options: ["", ""] };
const emptyWordcloudDraft = { type: "wordcloud", title: "" };
const emptyImageDraft = { type: "image", title: "", files: [] };

const SLIDE_ICON = {
  poll: <BarChart3 size={15} />,
  wordcloud: <Cloud size={15} />,
  image: <Image size={15} />,
};

export default function PresenterView() {
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(emptyImageDraft);
  const [uploading, setUploading] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const qrCanvasRef = useRef(null);

  useEffect(() => {
    emitWithAck("presenter:create-session")
      .then((res) => setRoom(res.room))
      .catch((err) => setError(err.message));

    const onState = (state) => setRoom(state);
    const onEnded = () => setRoom(null);

    socket.on("session:state", onState);
    socket.on("session:ended", onEnded);
    return () => {
      socket.off("session:state", onState);
      socket.off("session:ended", onEnded);
    };
  }, []);

  const joinUrl = room ? `${window.location.origin}/join/${room.code}` : "";
  const displayUrl = room ? `${window.location.origin}/display/${room.code}` : "";

  async function handleCopyDisplayUrl() {
    try {
      await navigator.clipboard.writeText(displayUrl);
      setError("");
    } catch {
      setError("No se pudo copiar. Copiá el link manualmente.");
    }
  }

  async function handleAddSlide(e) {
    e.preventDefault();
    setError("");
    try {
      if (draft.type === "image") {
        if (draft.files.length === 0) return setError("Elegí una o más imágenes primero.");
        setUploading(true);
        // Secuencial (no Promise.all) para que el orden de los archivos se
        // respete: cada add-slide se agrega al final en el momento en que
        // termina, si fueran en paralelo el orden final sería una lotería.
        for (const file of draft.files) {
          const imageUrl = await uploadImage(file);
          await emitWithAck("presenter:add-slide", { type: "image", title: "", imageUrl });
        }
        setDraft(emptyImageDraft);
      } else {
        const payload =
          draft.type === "poll"
            ? { type: "poll", title: draft.title, options: draft.options.filter((o) => o.trim()) }
            : { type: "wordcloud", title: draft.title };
        await emitWithAck("presenter:add-slide", payload);
        setDraft(draft.type === "poll" ? emptyPollDraft : emptyWordcloudDraft);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSetActive(slideId) {
    setError("");
    try {
      await emitWithAck("presenter:set-active-slide", { slideId });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReset(slideId) {
    setError("");
    try {
      await emitWithAck("presenter:reset-slide", { slideId });
    } catch (err) {
      setError(err.message);
    }
  }

  function handleDownloadQr() {
    const canvas = qrCanvasRef.current;
    if (!canvas || !room) return;
    const link = document.createElement("a");
    link.download = `qr-sesion-${room.code}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function handleEnterPresent() {
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      // el navegador puede negar fullscreen (ej. iframe); seguimos igual
    }
    setPresenting(true);
  }

  async function handleExitPresent() {
    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
    }
    setPresenting(false);
  }

  async function handleMoveSlide(index, direction) {
    const targetIndex = index + direction;
    if (!room || targetIndex < 0 || targetIndex >= room.slides.length) return;

    const ids = room.slides.map((s) => s.id);
    [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];

    setError("");
    try {
      await emitWithAck("presenter:reorder-slides", { slideIds: ids });
    } catch (err) {
      setError(err.message);
    }
  }

  function goToOffset(offset) {
    if (!room) return;
    const currentIndex = room.slides.findIndex((s) => s.id === room.activeSlide?.id);
    const nextIndex = currentIndex + offset;
    const nextSlide = room.slides[nextIndex];
    if (nextSlide) handleSetActive(nextSlide.id);
  }

  if (!room) {
    return (
      <div className="page centered">
        <p>{error ? error : "Creando sesión..."}</p>
      </div>
    );
  }

  if (presenting) {
    return (
      <PresentMode
        room={room}
        onNext={() => goToOffset(1)}
        onPrev={() => goToOffset(-1)}
        onExit={handleExitPresent}
      />
    );
  }

  const activeSlide = room.activeSlide;

  return (
    <div className="page presenter-layout">
      <aside className="sidebar">
        <div className="join-card">
          <QRCodeCanvas
            ref={qrCanvasRef}
            value={joinUrl}
            size={512}
            marginSize={2}
            style={{ width: 180, height: 180 }}
          />
          <p className="join-code">{room.code}</p>
          <p className="join-hint">Escaneá el QR o entrá en {window.location.host}/join</p>
          <button type="button" className="link-button small" onClick={handleDownloadQr}>
            <Download size={13} /> Descargar QR (PNG)
          </button>
          <p className="participant-count">
            <span className="live-dot" />
            {room.participantCount} {room.participantCount === 1 ? "persona conectada" : "personas conectadas"}
          </p>
          <button type="button" className="link-button small" onClick={handleCopyDisplayUrl}>
            <Link2 size={13} /> Copiar link de solo-resultados
          </button>
        </div>

        {room.slides.length > 0 && (
          <button type="button" className="button primary" onClick={handleEnterPresent}>
            <Play size={16} /> Presentar pantalla completa
          </button>
        )}

        <form className="add-slide-form" onSubmit={handleAddSlide}>
          <h3>Nueva slide</h3>
          <div className="type-toggle">
            <button
              type="button"
              className={`type-toggle-primary ${draft.type === "image" ? "active" : ""}`}
              onClick={() => setDraft(emptyImageDraft)}
            >
              <Image size={17} /> Slides/Imágenes
            </button>
            <div className="type-toggle-secondary">
              <button
                type="button"
                className={draft.type === "poll" ? "active" : ""}
                onClick={() => setDraft(emptyPollDraft)}
              >
                <BarChart3 size={16} /> Encuesta
              </button>
              <button
                type="button"
                className={draft.type === "wordcloud" ? "active" : ""}
                onClick={() => setDraft(emptyWordcloudDraft)}
              >
                <Cloud size={16} /> Palabras
              </button>
            </div>
          </div>

          {draft.type !== "image" && (
            <input
              placeholder="Título / pregunta"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              required
            />
          )}

          {draft.type === "poll" &&
            draft.options.map((opt, i) => (
              <input
                key={i}
                placeholder={`Opción ${i + 1}`}
                value={opt}
                onChange={(e) => {
                  const options = [...draft.options];
                  options[i] = e.target.value;
                  setDraft({ ...draft, options });
                }}
                required
              />
            ))}

          {draft.type === "poll" && draft.options.length < 6 && (
            <button
              type="button"
              className="link-button"
              onClick={() => setDraft({ ...draft, options: [...draft.options, ""] })}
            >
              + Agregar opción
            </button>
          )}

          {draft.type === "image" && (
            <>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(e) => setDraft({ ...draft, files: Array.from(e.target.files ?? []) })}
                required
              />
              <p className="join-hint">
                Exportá tus slides de Canva como PNG (Descargar → PNG → todas las páginas) y
                seleccionalas todas juntas acá; se agregan en ese orden y después las podés
                reacomodar con las flechas de la lista.
                {draft.files.length > 0 && ` (${draft.files.length} seleccionadas)`}
              </p>
            </>
          )}

          <button type="submit" className="button primary" disabled={uploading}>
            {uploading && <Loader2 size={16} className="icon-spin" />}
            {uploading ? "Subiendo..." : "Agregar slide"}
          </button>
        </form>

        {error && (
          <p className="error">
            <AlertCircle size={15} /> {error}
          </p>
        )}

        <ul className="slide-list">
          {room.slides.map((slide, index) => (
            <li key={slide.id} className={slide.id === room.activeSlide?.id ? "active" : ""}>
              <div className="slide-reorder">
                <button
                  type="button"
                  className="reorder-button"
                  disabled={index === 0}
                  onClick={() => handleMoveSlide(index, -1)}
                  aria-label="Mover arriba"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  className="reorder-button"
                  disabled={index === room.slides.length - 1}
                  onClick={() => handleMoveSlide(index, 1)}
                  aria-label="Mover abajo"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              <button className="slide-list-item" onClick={() => handleSetActive(slide.id)}>
                <span className="slide-type">{SLIDE_ICON[slide.type]}</span>
                {slide.title || (slide.type === "image" ? "Slide de Canva" : "(sin título)")}
              </button>
              {slide.type !== "image" && (
                <button className="link-button small" onClick={() => handleReset(slide.id)} aria-label="Reiniciar">
                  <RotateCcw size={13} />
                </button>
              )}
            </li>
          ))}
        </ul>
      </aside>

      <main className="results-panel">
        <SlideStage slide={activeSlide} />
      </main>
    </div>
  );
}
