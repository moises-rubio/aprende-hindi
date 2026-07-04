import { Link } from 'react-router-dom';
import { LEVELS, topicsOfLevel } from '../data';

export default function GrammarPage() {
  return (
    <main className="page">
      <h1>Gramática</h1>
      <p className="muted">
        Postposiciones, conjugación verbal, concordancia de género, tiempos y estructura de la oración.
        Cada tema tiene 3 pasos de dificultad con ejemplos y audio.
      </p>
      {LEVELS.map((lvl) => (
        <section key={lvl.id} className="card" aria-label={`Gramática de ${lvl.id}`}>
          <h2>{lvl.title}</h2>
          <ul className="topic-list">
            {topicsOfLevel(lvl.id).map((t) => (
              <li key={t.id}>
                <Link to={`/grammar/${t.id}`} className="topic-link">
                  <strong>{t.title}</strong>
                  <span className="muted"> — {t.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
