interface ProgressBarProps {
  value: number;
}

const ProgressBar = ({ value }: ProgressBarProps) => {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
      <div className="h-full bg-primary transition-all" style={{ width: `${safeValue}%` }} />
    </div>
  );
};

export default ProgressBar;
