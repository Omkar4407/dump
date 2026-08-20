/*
 * Memphis ornaments.
 *
 * Purely decorative geometry — squiggles,
 * confetti dots, zigzags and rings. Every
 * shape is inline SVG so the shell ships no
 * extra requests, and all of it is hidden
 * from assistive technology.
 */

type ShapeProps = {
  className?: string;
};

export function Squiggle({ className }: ShapeProps) {
  return (
    <svg
      viewBox="0 0 120 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M4 20C14 4 26 4 36 20s22 16 32 0 22-16 32 0"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Zigzag({ className }: ShapeProps) {
  return (
    <svg
      viewBox="0 0 120 36"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M4 28 22 8l18 20L58 8l18 20L94 8l18 20"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Ring({ className }: ShapeProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle
        cx="32"
        cy="32"
        r="26"
        stroke="currentColor"
        strokeWidth="8"
      />
    </svg>
  );
}

export function Confetti({ className }: ShapeProps) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="14" r="6" />
      <circle cx="48" cy="10" r="4" />
      <circle cx="84" cy="20" r="6" />
      <circle cx="18" cy="50" r="4" />
      <circle cx="54" cy="46" r="6" />
      <circle cx="88" cy="58" r="4" />
      <circle cx="10" cy="84" r="6" />
      <circle cx="46" cy="86" r="4" />
      <circle cx="82" cy="90" r="6" />
    </svg>
  );
}

export function Triangle({ className }: ShapeProps) {
  return (
    <svg
      viewBox="0 0 64 56"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M32 4 62 52H2z" />
    </svg>
  );
}

export function Blob({ className }: ShapeProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M42 -62C56 -52 69 -42 74 -28C79 -14 76 4 69 20C62 36 51 50 36 60C21 70 2 76 -16 73C-34 70 -51 58 -63 42C-75 26 -82 6 -79 -12C-76 -30 -63 -46 -47 -57C-31 -68 -12 -74 4 -76C20 -78 28 -72 42 -62Z" transform="translate(100 100)" />
    </svg>
  );
}
