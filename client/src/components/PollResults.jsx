import { motion, AnimatePresence } from "framer-motion";
import { Crown } from "lucide-react";

import AnimatedNumber from "./AnimatedNumber.jsx";

export default function PollResults({ slide }) {
  const total = slide.options.reduce((sum, o) => sum + o.votes, 0);
  const maxVotes = Math.max(...slide.options.map((o) => o.votes), 0);

  // Ordenadas por votos: al cambiar el orden, motion anima la reubicación
  // de cada fila en vez de que salten de posición de golpe (layout FLIP).
  const sorted = [...slide.options].sort((a, b) => b.votes - a.votes);

  return (
    <div className="poll-results">
      <AnimatePresence initial={false}>
        {sorted.map((option) => {
          const pct = total > 0 ? Math.round((option.votes / total) * 100) : 0;
          const isLeading = option.votes > 0 && option.votes === maxVotes;
          return (
            <motion.div
              layout
              key={option.id}
              className="poll-row"
              transition={{ layout: { type: "spring", stiffness: 380, damping: 32 } }}
            >
              <div className="poll-row-label">
                <span className="poll-row-name">
                  {isLeading && (
                    <motion.span
                      className="poll-crown"
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    >
                      <Crown size={15} />
                    </motion.span>
                  )}
                  {option.text}
                </span>
                <span className="poll-row-count">
                  <AnimatedNumber value={option.votes} /> {option.votes === 1 ? "voto" : "votos"} ({pct}%)
                </span>
              </div>
              <div className="poll-bar-track">
                <motion.div
                  className="poll-bar-fill"
                  animate={{ width: `${pct}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 18 }}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      <p className="poll-total">
        <AnimatedNumber value={total} /> {total === 1 ? "respuesta" : "respuestas"} en total
      </p>
    </div>
  );
}
