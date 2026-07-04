/**
 * Servicio de audio: API nativa Audio del navegador, 100% sin conexión.
 * Siempre detiene el audio en curso antes de reproducir uno nuevo.
 */

class AudioService {
  private current: HTMLAudioElement | null = null;

  play(src: string): Promise<void> {
    this.stop();
    return new Promise((resolve, reject) => {
      const el = new Audio(src);
      this.current = el;
      el.onended = () => {
        if (this.current === el) this.current = null;
        resolve();
      };
      el.onerror = () => reject(new Error(`No se pudo cargar el audio: ${src}`));
      el.play().catch((err: unknown) => reject(err instanceof Error ? err : new Error(String(err))));
    });
  }

  stop(): void {
    if (this.current) {
      this.current.pause();
      this.current.currentTime = 0;
      this.current = null;
    }
  }
}

export const audioService = new AudioService();

const base = import.meta.env.BASE_URL;

export function wordAudioSrc(wordId: string): string {
  return `${base}audio/words/${wordId}.mp3`;
}

export function grammarAudioSrc(topicId: string, stepIndex: number, exampleIndex: number): string {
  return `${base}audio/grammar/${topicId}-s${stepIndex + 1}-e${exampleIndex + 1}.mp3`;
}
