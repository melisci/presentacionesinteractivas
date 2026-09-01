import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="page centered" style={{ minHeight: "100vh", justifyContent: "center" }}>
      <div className="home-hero">
        <span className="home-badge">✨ En vivo, en tiempo real</span>
        <h1 className="home-title">Presentaciones Interactivas</h1>
        <p className="subtitle">Encuestas, nube de palabras y tus slides de Canva, todo en un mismo lugar.</p>
      </div>

      <div className="home-cards">
        <Link className="home-card" to="/presenter">
          <span className="home-card-icon">🎤</span>
          <h3>Soy presentador</h3>
          <p>Creá una sesión, armá tus slides y mostrá resultados en vivo.</p>
        </Link>
        <Link className="home-card" to="/join">
          <span className="home-card-icon">📱</span>
          <h3>Unirme con un código</h3>
          <p>Entrá desde tu celular para votar o escribir una palabra.</p>
        </Link>
      </div>
    </div>
  );
}
