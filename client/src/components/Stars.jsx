export default function Stars({ value = 0, size = 'text-base' }) {
  const rounded = Math.round(value);
  return (
    <span className={`${size} text-amber-500`} aria-label={`${value} out of 5 stars`}>
      {'★'.repeat(rounded)}
      <span className="text-slate-300">{'★'.repeat(5 - rounded)}</span>
    </span>
  );
}
