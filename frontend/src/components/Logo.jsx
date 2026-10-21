export default function Logo({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="9" y="12" width="46" height="32" rx="5" fill="none" stroke="#0f2342" strokeWidth="5" />
      <path d="M22 27l8 8 14-15" fill="none" stroke="#1a9a55" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="25" y="49" width="14" height="5" rx="2.5" fill="#0f2342" />
    </svg>
  );
}
