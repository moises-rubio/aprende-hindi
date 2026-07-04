import { useEffect, useRef, useState } from 'react';
import type { AchievementDef } from '../types';

const MIN_VISIBLE_MS = 5000;
const AUTO_DISMISS_MS = 8000;

interface Props {
  achievement: AchievementDef;
  onDismiss: () => void;
}

/**
 * Notificación superpuesta de logro: nombre, descripción y condición.
 * Visible al menos 5 segundos o hasta que el usuario la cierre.
 */
export default function AchievementNotification({ achievement, onDismiss }: Props) {
  const [canDismiss, setCanDismiss] = useState(false);
  const shownAt = useRef(Date.now());

  useEffect(() => {
    shownAt.current = Date.now();
    setCanDismiss(false);
    const minTimer = window.setTimeout(() => setCanDismiss(true), MIN_VISIBLE_MS);
    const autoTimer = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(autoTimer);
    };
  }, [achievement.id, onDismiss]);

  return (
    <div className="achievement-overlay" role="alertdialog" aria-label={`Logro desbloqueado: ${achievement.name}`}>
      <div className="achievement-toast">
        <div className="achievement-icon" aria-hidden="true">
          🏆
        </div>
        <div>
          <p className="achievement-title">¡Logro desbloqueado!</p>
          <p className="achievement-name">{achievement.name}</p>
          <p className="achievement-desc">{achievement.description}</p>
          <p className="achievement-cond muted">Condición: {achievement.condition}</p>
        </div>
        <button
          type="button"
          className="btn btn-small"
          onClick={onDismiss}
          disabled={!canDismiss}
          aria-label="Cerrar notificación de logro"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
