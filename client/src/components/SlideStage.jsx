import PollResults from "./PollResults.jsx";
import WordCloud from "./WordCloud.jsx";

// Renderiza una slide "grande": la imagen de Canva tal cual, o el
// título + resultados en vivo para encuesta / nube de palabras.
export default function SlideStage({ slide }) {
  if (!slide) return <p className="empty-hint">Esperando la primera slide...</p>;

  if (slide.type === "image") {
    return <img key={slide.id} className="stage-image" src={slide.imageUrl} alt={slide.title || "Slide"} />;
  }

  return (
    <div key={slide.id} className="stage-question">
      <h2>{slide.title}</h2>
      {slide.type === "poll" && <PollResults slide={slide} />}
      {slide.type === "wordcloud" && <WordCloud words={slide.words} />}
    </div>
  );
}
