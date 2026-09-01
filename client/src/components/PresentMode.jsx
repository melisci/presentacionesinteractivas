import { useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";

import SlideStage from "./SlideStage.jsx";

// Pantalla completa para proyectar: la que la audiencia/el público ve. El
// presentador navega con las flechas del teclado (o los botones) y cada
// cambio de slide se sincroniza al instante para todos vía socket.
export default function PresentMode({ room, onNext, onPrev, onExit }) {
  const currentIndex = room.slides.findIndex((s) => s.id === room.activeSlide?.id);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        onNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        onPrev();
      } else if (e.key === "Escape") {
        onExit();
      }
    },
    [onNext, onPrev, onExit]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const joinUrl = `${window.location.origin}/join/${room.code}`;

  return (
    <div className="present-mode">
      <div className="present-stage">
        {room.activeSlide ? (
          <SlideStage slide={room.activeSlide} />
        ) : (
          <div className="stage-question">
            <QRCodeSVG value={joinUrl} size={260} includeMargin />
            <p className="join-code">{room.code}</p>
            <p className="join-hint">Sumate en {window.location.host}/join</p>
          </div>
        )}
      </div>

      <div className="present-controls">
        <button className="button" onClick={onPrev} disabled={currentIndex <= 0}>
          ← Anterior
        </button>
        <span className="present-counter">
          {currentIndex >= 0 ? currentIndex + 1 : "–"} / {room.slides.length}
        </span>
        <button className="button" onClick={onNext} disabled={currentIndex >= room.slides.length - 1}>
          Siguiente →
        </button>
        <button className="button" onClick={onExit}>
          Salir (Esc)
        </button>
      </div>
    </div>
  );
}
