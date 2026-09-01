import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Hash chico y determinístico para variar la animación idle de cada palabra
// (duración/delay) sin que cambie en cada render ni sea igual para todas.
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export default function WordCloud({ words }) {
  const entries = Object.entries(words).sort((a, b) => b[1] - a[1]);
  const prevCounts = useRef(new Map());

  useEffect(() => {
    prevCounts.current = new Map(entries.map(([word, count]) => [word, count]));
  });

  if (entries.length === 0) {
    return <p className="empty-hint">Esperando respuestas...</p>;
  }

  const maxCount = entries[0][1];
  const minCount = entries[entries.length - 1][1];
  const range = Math.max(maxCount - minCount, 1);

  return (
    <div className="wordcloud">
      <AnimatePresence initial={false}>
        {entries.map(([word, count]) => {
          const scale = (count - minCount) / range; // 0..1
          const fontSize = 1 + scale * 2.6; // 1rem .. 3.6rem
          const grew = (prevCounts.current.get(word) ?? 0) < count;
          const h = hash(word);
          const floatDuration = 3.2 + (h % 10) / 5; // 3.2s..5.2s
          const floatDelay = (h % 7) / 4; // 0..1.5s

          return (
            <motion.span
              layout
              key={word}
              className="wordcloud-word-motion"
              title={`${count} ${count === 1 ? "vez" : "veces"}`}
              initial={{ opacity: 0, scale: 0.4, y: 16 }}
              animate={{
                opacity: 1,
                scale: grew ? [1.35, 1] : 1,
                y: 0,
              }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{
                layout: { type: "spring", stiffness: 300, damping: 28 },
                default: { type: "spring", stiffness: 260, damping: 16 },
              }}
            >
              {/* El float idle es una animación CSS aparte: framer-motion ya
                  controla `transform` para scale/entrada, así que el vaivén
                  continuo va en un span hijo para no pisarse entre los dos. */}
              <span
                className="wordcloud-word"
                style={{
                  fontSize: `${fontSize}rem`,
                  animationDuration: floatDuration + "s",
                  animationDelay: floatDelay + "s",
                }}
              >
                {word}
              </span>
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
