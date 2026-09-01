import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";

import { socket, emitWithAck } from "../socket.js";
import SlideStage from "../components/SlideStage.jsx";

// Vista de solo lectura pensada como segunda pantalla (proyector, monitor
// extendido): sin controles, solo QR + la slide activa en vivo.
export default function DisplayView() {
  const { code } = useParams();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    emitWithAck("display:join", { code: code?.toUpperCase() })
      .then((res) => setRoom(res.room))
      .catch((err) => setError(err.message));

    const onState = (state) => setRoom(state);
    const onEnded = () => setError("La sesión terminó.");

    socket.on("session:state", onState);
    socket.on("session:ended", onEnded);
    return () => {
      socket.off("session:state", onState);
      socket.off("session:ended", onEnded);
    };
  }, [code]);

  if (error) {
    return (
      <div className="page centered display-view">
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="page centered display-view">
        <p className="empty-hint">Cargando...</p>
      </div>
    );
  }

  const joinUrl = `${window.location.origin}/join/${room.code}`;

  if (!room.activeSlide) {
    return (
      <div className="page centered display-view">
        <QRCodeSVG value={joinUrl} size={260} includeMargin />
        <p className="join-code">{room.code}</p>
        <p className="join-hint">Sumate en {window.location.host}/join</p>
      </div>
    );
  }

  return (
    <div className="page centered display-view">
      <SlideStage slide={room.activeSlide} />
    </div>
  );
}
