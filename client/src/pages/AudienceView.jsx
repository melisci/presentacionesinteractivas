import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

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
        <h1>Unirme a la sesión</h1>
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
            Entrar
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  const activeSlide = room.activeSlide;

  return (
    <div className="page centered">
      {!activeSlide && <p className="empty-hint">Esperando a que el presentador active una pregunta...</p>}

      {activeSlide?.type === "poll" && (
        <div className="vote-card">
          <h2>{activeSlide.title}</h2>
          {hasVoted ? (
            <p className="empty-hint">¡Gracias por tu voto!</p>
          ) : (
            <div className="stack">
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
          {wordSent ? (
            <p className="empty-hint">¡Enviado! Podés mandar otra palabra.</p>
          ) : null}
          <form className="join-form" onSubmit={handleSubmitWord}>
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

      {error && <p className="error">{error}</p>}
    </div>
  );
}
