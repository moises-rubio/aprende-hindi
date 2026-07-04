import AudioButton from '../components/AudioButton';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../constants';
import { useAppState } from '../context';
import { VOCAB } from '../data';
import { wordAudioSrc } from '../services/audio';
import { getVocabBank } from '../services/progress';

export default function VocabularyPage() {
  useAppState();
  const bank = getVocabBank();

  return (
    <main className="page">
      <h1>Vocabulario</h1>
      <p className="muted">
        Organizado por categorías temáticas (las conversacionales primero). Las palabras marcadas con ⭐
        ya están en tu banco de vocabulario.
      </p>
      {CATEGORY_ORDER.map((cat) => {
        const words = VOCAB.filter((w) => w.category === cat);
        if (words.length === 0) return null;
        return (
          <section key={cat} className="card" aria-label={CATEGORY_LABELS[cat]}>
            <h2>{CATEGORY_LABELS[cat]}</h2>
            <ul className="vocab-list">
              {words.map((w) => (
                <li key={w.id} className="vocab-item">
                  <AudioButton src={wordAudioSrc(w.id)} label={w.hindi} phonetic={w.ipa} />
                  <div>
                    <span className="hindi-text vocab-word">
                      {w.hindi} {bank[w.id] ? '⭐' : ''}
                    </span>
                    <span className="muted"> [{w.ipa}] — {w.spanish}</span>
                    <p className="muted small">
                      <span className="hindi-text">{w.exampleHi}</span> · {w.exampleEs}
                    </p>
                    <p className="muted small">Variantes aceptadas: {w.variants.join(', ')}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
