import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="page centered">
      <h1>Presentaciones Interactivas</h1>
      <p className="subtitle">Encuestas y nubes de palabras en vivo.</p>
      <div className="stack">
        <Link className="button primary" to="/presenter">
          Soy presentador
        </Link>
        <Link className="button" to="/join">
          Unirme con un código
        </Link>
      </div>
    </div>
  );
}
