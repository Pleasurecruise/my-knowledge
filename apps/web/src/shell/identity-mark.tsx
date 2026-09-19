export function IdentityMark({ size = 36 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 40 40" fill="none">
      <path
        d="M8 19V8l9 6a19 19 0 0 1 6 0l9-6v11c5 15-29 15-24 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M17 25l3 2 3-2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* oxlint-disable-next-line shadcn/no-raw-colors -- brand mark color, approved by design */}
      <circle cx="14" cy="21" r="2" fill="#526682" />
      {/* oxlint-disable-next-line shadcn/no-raw-colors -- brand mark color, approved by design */}
      <circle cx="26" cy="21" r="2" fill="#806127" />
    </svg>
  );
}
