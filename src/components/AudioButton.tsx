import { useEffect, useRef, useState } from 'react';
import { audioService } from '../services/audio';

type AudioState = 'idle' | 'playing' | 'error' | 'unavailable';

interface Props {
  src: string;
  /** Texto que describe el audio para lectores de pantalla. */
  label: string;
  /** Transcripción fonética (IPA) mostrada como alternativa si el audio falla. */
  phonetic?: string;
}

/**
 * Botón de reproducción con estados de error:
 * 1er fallo => indicador de error + reintento;
 * 2º fallo => «no disponible» + control deshabilitado (+ fonética si existe).
 */
export default function AudioButton({ src, label, phonetic }: Props) {
  const [state, setState] = useState<AudioState>('idle');
  const failures = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const play = async () => {
    setState('playing');
    try {
      await audioService.play(src);
      if (mounted.current) setState('idle');
    } catch {
      failures.current += 1;
      if (mounted.current) setState(failures.current >= 2 ? 'unavailable' : 'error');
    }
  };

  if (state === 'unavailable') {
    return (
      <span className="audio-unavailable">
        <button type="button" className="audio-btn" disabled aria-label={`Audio no disponible: ${label}`}>
          🔇
        </button>
        <span className="audio-note">
          Audio no disponible{phonetic ? <span className="phonetic"> · [{phonetic}]</span> : null}
        </span>
      </span>
    );
  }

  if (state === 'error') {
    return (
      <span className="audio-error">
        <button type="button" className="audio-btn" onClick={play} aria-label={`Error de audio, reintentar: ${label}`}>
          ⚠️ Reintentar
        </button>
        {phonetic ? <span className="phonetic"> [{phonetic}]</span> : null}
      </span>
    );
  }

  return (
    <button
      type="button"
      className="audio-btn"
      onClick={play}
      disabled={state === 'playing'}
      aria-label={state === 'playing' ? `Reproduciendo: ${label}` : `Escuchar: ${label}`}
    >
      {state === 'playing' ? '🔊 …' : '🔊'}
    </button>
  );
}
