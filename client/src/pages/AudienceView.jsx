import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertCircle, ArrowRight, Check, Clock, Eye, HandMetal } from "lucide-react";

import { socket, emitWithAck } from "../socket.js";

export default function AudienceView() {
  const { code: codeFromUrl } = useParams();
  const [code, setCode] = useState((codeFromUrl ?? "").toUpperCase());
  const [nickname, setNickname] = useState("");
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [hasVoted, setHasVoted] = useState(false);
  const [wordInput, setWordInput] = useState("");
  const [wordSent, setWordSent] = useState(false);

  useEffect(() => {
    const onState = (state) => setRoom(state);
    const onEnded = () => {
      setRoom(null);
      setError("El presentador cerró la sesión.");
    };
    socket.on("session:state", onState);
    socket.on("session:ended", onEnded);
    return () => {
      socket.off("session:state", onState);
      socket.off("session:ended", onEnded);
    };
  }, []);

  useEffect(() => {
    setHasVoted(false);
    setWordSent(false);
    setWordInput("");
  }, [room?.activeSlide?.id]);

  async function handleJoin(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await emitWithAck("audience:join", { code: code.trim().toUpperCase(), nickname });
      setRoom(res.room);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleVote(optionId) {
    setError("");
    try {
      await emitWithAck("audience:vote", { optionId });
      setHasVoted(true);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSubmitWord(e) {
    e.preventDefault();
    setError("");
    try {
      await emitWithAck("audience:submit-word", { text: wordInput });
      setWordSent(true);
      setWordInput("");
    } catch (err) {
      setError(err.message);
    }
  }

  if (!room) {
    return (
      <div className="page centered">
        <span className="home-badge">
          <HandMetal size={14} /> Bienvenido/a
        </span>
        <h1 className="home-title" style={{ fontSize: "2.2rem" }}>
          Unirme a la sesión
        </h1>
        <form className="join-form" onSubmit={handleJoin}>
          <input
            placeholder="Código de sesión"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            required
          />
          <input
            placeholder="Tu nombre (opcional)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={30}
          />
          <button type="submit" className="button primary">
            Entrar <ArrowRight size={16} />
          </button>
        </form>
        {error && (
          <p className="error">
            <AlertCircle size={15} /> {error}
          </p>
        )}
      </div>
    );
  }

  const activeSlide = room.activeSlide;

  return (
    <div className="page centered">
      {!activeSlide && (
        <div className="vote-card">
          <span className="icon-badge lg round" style={{ margin: "0 auto 0.5rem" }}>
            <Clock size={26} />
          </span>
          <p className="empty-hint">Esperando a que el presentador active una pregunta...</p>
        </div>
      )}

      {activeSlide?.type === "image" && (
        <div className="vote-card">
          <span className="icon-badge lg round" style={{ margin: "0 auto 0.5rem" }}>
            <Eye size={26} />
          </span>
          <p className="empty-hint">Mirá la pantalla principal.</p>
        </div>
      )}

      {activeSlide?.type === "poll" && (
        <div className="vote-card">
          <h2>{activeSlide.title}</h2>
          {hasVoted ? (
            <div style={{ marginTop: "1.5rem" }}>
              <div className="icon-badge lg round success success-check">
                <Check size={30} />
              </div>
              <p className="empty-hint">¡Gracias por tu voto!</p>
            </div>
          ) : (
            <div className="stack" style={{ marginTop: "1.5rem" }}>
              {activeSlide.options.map((option) => (
                <button key={option.id} className="button option-button" onClick={() => handleVote(option.id)}>
                  {option.text}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSlide?.type === "wordcloud" && (
        <div className="vote-card">
          <h2>{activeSlide.title}</h2>
          {wordSent && (
            <div style={{ marginTop: "0.75rem" }}>
              <div className="icon-badge lg round success success-check">
                <Check size={30} />
              </div>
              <p className="empty-hint">¡Enviado! Podés mandar otra palabra.</p>
            </div>
          )}
          <form className="join-form" onSubmit={handleSubmitWord} style={{ marginTop: "1.5rem" }}>
            <input
              placeholder="Escribí una palabra o frase corta"
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              maxLength={40}
              required
            />
            <button type="submit" className="button primary">
              Enviar
            </button>
          </form>
        </div>
      )}

      {error && (
        <p className="error">
          <AlertCircle size={15} /> {error}
        </p>
      )}
    </div>
  );
}
