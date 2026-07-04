import { useAppState } from '../context';
import { ACHIEVEMENTS, getAchievementState } from '../services/achievements';

export default function AchievementsPage() {
  useAppState();
  const state = getAchievementState();
  const earned = ACHIEVEMENTS.filter((a) => state.earned[a.id]);
  const locked = ACHIEVEMENTS.filter((a) => !state.earned[a.id]);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <main className="page">
      <h1>Logros</h1>
      <p className="muted">Palabras correctas acumuladas: {state.correctWordCount}</p>

      <section className="card" aria-label="Logros conseguidos">
        <h2>Conseguidos ({earned.length})</h2>
        {earned.length === 0 && <p className="muted">Todavía no has desbloqueado ningún logro. ¡A practicar!</p>}
        <ul className="achievement-list">
          {earned.map((a) => (
            <li key={a.id} className="achievement-item earned">
              <span className="achievement-icon" aria-hidden="true">
                🏆
              </span>
              <div>
                <strong>{a.name}</strong>
                <p>{a.description}</p>
                <p className="muted small">Desbloqueado el {fmt(state.earned[a.id])}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card" aria-label="Logros bloqueados">
        <h2>Bloqueados ({locked.length})</h2>
        <ul className="achievement-list">
          {locked.map((a) => (
            <li key={a.id} className="achievement-item locked">
              <span className="achievement-icon" aria-hidden="true">
                🔒
              </span>
              <div>
                <strong>{a.name}</strong>
                <p className="muted">Cómo desbloquearlo: {a.condition}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
