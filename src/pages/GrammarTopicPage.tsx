import { Link, useParams } from 'react-router-dom';
import AudioButton from '../components/AudioButton';
import { getTopic } from '../data';
import { grammarAudioSrc } from '../services/audio';

export default function GrammarTopicPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const topic = topicId ? getTopic(topicId) : undefined;

  if (!topic) {
    return (
      <main className="page">
        <p>Tema de gramática no encontrado.</p>
        <Link className="btn" to="/grammar">
          Volver a gramática
        </Link>
      </main>
    );
  }

  return (
    <main className="page">
      <nav aria-label="Ruta">
        <Link to="/grammar">← Gramática</Link>
      </nav>
      <h1>{topic.title}</h1>
      <p className="muted">
        Nivel {topic.levelId} · {topic.description}
      </p>
      {topic.steps.map((step, si) => (
        <section key={si} className="card grammar-step" aria-label={step.title}>
          <h2>{step.title}</h2>
          <p>{step.explanation}</p>
          <ul className="example-list">
            {step.examples.map((ex, ei) => (
              <li key={ei} className="example-item">
                <AudioButton src={grammarAudioSrc(topic.id, si, ei)} label={ex.hindi} phonetic={ex.ipa} />{' '}
                <span className="hindi-text">{ex.hindi}</span>
                <span className="muted"> — {ex.spanish}</span>
                <p className="muted small">[{ex.ipa}]</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
