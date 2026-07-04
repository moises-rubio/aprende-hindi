interface Props {
  value: number; // 0-100
  label: string;
}

export default function ProgressBar({ value, label }: Props) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="progress-row">
      <div className="progress-label">
        <span>{label}</span>
        <span className="progress-value">{v}%</span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${v}%`}
      >
        <div className="progress-fill" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}
