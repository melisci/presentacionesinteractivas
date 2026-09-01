import { useEffect, useCallback, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import SlideStage from "./SlideStage.jsx";

const IDLE_HIDE_DELAY = 2200;

// Pantalla completa para proyectar: la que la audiencia/el público ve. El
// presentador navega con las flechas del teclado (o los botones) y cada
// cambio de slide se sincroniza al instante para todos vía socket.
export default function PresentMode({ room, onNext, onPrev, onExit }) {
  const currentIndex = room.slides.findIndex((s) => s.id === room.activeSlide?.id);

  // Los controles (Anterior/Siguiente/Salir) no deben quedar pisando lo
  // proyectado: se muestran al mover el mouse y se ocultan solos a los
  // pocos segundos de inactividad. La navegación por teclado sigue andando
  // estén visibles o no.
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef(null);

  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), IDLE_HIDE_DELAY);
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    scheduleHide();
    return () => clearTimeout(hideTimer.current);
  }, [scheduleHide]);

  const handleKeyDown = useCallback(
    (e) => {
      showControls();
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
    [onNext, onPrev, onExit, showControls]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const joinUrl = `${window.location.origin}/join/${room.code}`;

  return (
    <div className="present-mode" onMouseMove={showControls}>
      <div className="present-stage">
        {room.activeSlide ? (
          <SlideStage slide={room.activeSlide} />
        ) : (
          <div className="stage-question">
            <QRCodeSVG className="qr" value={joinUrl} size={260} includeMargin />
            <p className="join-code">{room.code}</p>
            <p className="join-hint">Sumate en {window.location.host}/join</p>
          </div>
        )}
      </div>

      <div className={`present-controls ${controlsVisible ? "" : "hidden"}`}>
        <button className="button" onClick={onPrev} disabled={currentIndex <= 0}>
          <ChevronLeft size={16} /> Anterior
        </button>
        <span className="present-counter">
          {currentIndex >= 0 ? currentIndex + 1 : "–"} / {room.slides.length}
        </span>
        <button className="button" onClick={onNext} disabled={currentIndex >= room.slides.length - 1}>
          Siguiente <ChevronRight size={16} />
        </button>
        <button className="button" onClick={onExit}>
          <X size={16} /> Salir (Esc)
        </button>
      </div>
    </div>
  );
}
