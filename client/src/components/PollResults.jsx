export default function PollResults({ slide }) {
  const total = slide.options.reduce((sum, o) => sum + o.votes, 0);

  return (
    <div className="poll-results">
      {slide.options.map((option) => {
        const pct = total > 0 ? Math.round((option.votes / total) * 100) : 0;
        return (
          <div className="poll-row" key={option.id}>
            <div className="poll-row-label">
              <span>{option.text}</span>
              <span className="poll-row-count">
                {option.votes} {option.votes === 1 ? "voto" : "votos"} ({pct}%)
              </span>
            </div>
            <div className="poll-bar-track">
              <div className="poll-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
      <p className="poll-total">{total} {total === 1 ? "respuesta" : "respuestas"} en total</p>
    </div>
  );
}
