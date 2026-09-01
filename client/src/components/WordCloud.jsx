const COLORS = ["#6d28d9", "#2563eb", "#0891b2", "#059669", "#d97706", "#db2777"];

export default function WordCloud({ words }) {
  const entries = Object.entries(words).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    return <p className="empty-hint">Esperando respuestas...</p>;
  }

  const maxCount = entries[0][1];
  const minCount = entries[entries.length - 1][1];
  const range = Math.max(maxCount - minCount, 1);

  return (
    <div className="wordcloud">
      {entries.map(([word, count], index) => {
        const scale = (count - minCount) / range; // 0..1
        const fontSize = 1 + scale * 2.6; // 1rem .. 3.6rem
        return (
          <span
            key={word}
            className="wordcloud-word"
            style={{ fontSize: `${fontSize}rem`, color: COLORS[index % COLORS.length] }}
            title={`${count} ${count === 1 ? "vez" : "veces"}`}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}
