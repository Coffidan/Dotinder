import React from 'react';

const ACCENT = '#c62828';

// Минималистичный логотип-монограмма Dotinder (используется в навбаре и на входе)
const LogoMark: React.FC<{ size?: number }> = ({ size = 30 }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} className="dota-brand-mark" aria-hidden="true">
    <rect x="1" y="1" width="46" height="46" rx="13" fill="#0e0e11" stroke="rgba(255,255,255,0.1)" />
    <circle cx="24" cy="24" r="14.5" fill="none" stroke={ACCENT} strokeWidth="2.5" />
    <text
      x="24"
      y="31.5"
      textAnchor="middle"
      fontFamily="Cinzel, Georgia, serif"
      fontSize="21"
      fontWeight="800"
      fill="#ffffff"
    >
      D
    </text>
  </svg>
);

export default LogoMark;
