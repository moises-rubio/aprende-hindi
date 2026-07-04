interface Props {
  secondsLeft: number;
}

export default function TimerDisplay({ secondsLeft }: Props) {
  const s = Math.max(0, secondsLeft);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  const warning = s <= 300;
  return (
    <div
      className={`timer ${warning ? 'timer-warning' : ''}`}
      role="timer"
      aria-live={warning ? 'assertive' : 'off'}
      aria-label={`Tiempo restante: ${mm} minutos ${ss} segundos`}
    >
      ⏱ {mm}:{ss}
    </div>
  );
}
