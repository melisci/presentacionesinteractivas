import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

import { socket, emitWithAck } from "../socket.js";
import PollResults from "../components/PollResults.jsx";
import WordCloud from "../components/WordCloud.jsx";

const emptyPollDraft = { type: "poll", title: "", options: ["", ""] };
const emptyWordcloudDraft = { type: "wordcloud", title: "" };

export default function PresenterView() {
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(emptyPollDraft);
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

  const joinUrl = room
    ? `${window.location.origin}/join/${room.code}`
    : "";
  const displayUrl = room
    ? `${window.location.origin}/display/${room.code}`
    : "";

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
      const payload =
        draft.type === "poll"
          ? { type: "poll", title: draft.title, options: draft.options.filter((o) => o.trim()) }
          : { type: "wordcloud", title: draft.title };
      await emitWithAck("presenter:add-slide", payload);
      setDraft(draft.type === "poll" ? emptyPollDraft : emptyWordcloudDraft);
    } catch (err) {
      setError(err.message);
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

  if (!room) {
    return (
      <div className="page centered">
        <p>{error ? error : "Creando sesión..."}</p>
      </div>
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
            ⬇ Descargar QR (PNG) para pegar en Canva
          </button>
          <p className="participant-count">
            {room.participantCount} {room.participantCount === 1 ? "persona conectada" : "personas conectadas"}
          </p>
          <button type="button" className="link-button small" onClick={handleCopyDisplayUrl}>
            📋 Copiar link para embeber resultados en Canva
          </button>
        </div>

        <form className="add-slide-form" onSubmit={handleAddSlide}>
          <h3>Nueva slide</h3>
          <div className="type-toggle">
            <button
              type="button"
              className={draft.type === "poll" ? "active" : ""}
              onClick={() => setDraft(emptyPollDraft)}
            >
              Encuesta
            </button>
            <button
              type="button"
              className={draft.type === "wordcloud" ? "active" : ""}
              onClick={() => setDraft(emptyWordcloudDraft)}
            >
              Nube de palabras
            </button>
          </div>

          <input
            placeholder="Título / pregunta"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            required
          />

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

          <button type="submit" className="button primary">
            Agregar slide
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        <ul className="slide-list">
          {room.slides.map((slide) => (
            <li key={slide.id} className={slide.id === room.activeSlide?.id ? "active" : ""}>
              <button className="slide-list-item" onClick={() => handleSetActive(slide.id)}>
                <span className="slide-type">{slide.type === "poll" ? "📊" : "☁️"}</span>
                {slide.title}
              </button>
              <button className="link-button small" onClick={() => handleReset(slide.id)}>
                reiniciar
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="results-panel">
        {!activeSlide && <p className="empty-hint">Elegí una slide para mostrar los resultados en vivo.</p>}
        {activeSlide && (
          <>
            <h2>{activeSlide.title}</h2>
            {activeSlide.type === "poll" && <PollResults slide={activeSlide} />}
            {activeSlide.type === "wordcloud" && <WordCloud words={activeSlide.words} />}
          </>
        )}
      </main>
    </div>
  );
}
