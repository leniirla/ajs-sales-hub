import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const LogoIcon: React.FC<LogoProps> = ({ className = '', size = 48 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background/Ambient glow/sparkles (Four-pointed stars) */}
      <g>
        {/* Star Top-Right */}
        <path d="M 135,45 Q 135,51 129,51 Q 135,51 135,57 Q 135,51 141,51 Q 135,51 135,45 Z" fill="#0f172a" />
        {/* Star Mid-Left */}
        <path d="M 45,68 Q 45,74 39,74 Q 45,74 45,80 Q 45,74 51,74 Q 45,74 45,68 Z" fill="#0f172a" />
        {/* Star Far-Left */}
        <path d="M 30,105 Q 30,111 24,111 Q 30,111 30,117 Q 30,111 36,111 Q 30,111 30,105 Z" fill="#0f172a" />
        {/* Star Bottom-Right */}
        <path d="M 155,135 Q 155,141 149,141 Q 155,141 155,147 Q 155,141 161,141 Q 155,141 155,135 Z" fill="#0f172a" />
        {/* Star Far-Right-Bottom */}
        <path d="M 175,150 Q 175,156 169,156 Q 175,156 175,162 Q 175,156 181,156 Q 175,156 175,150 Z" fill="#0f172a" />
      </g>

      {/* Orbit Ring (Back Half) */}
      <path
        d="M 185,115 C 195,135 125,165 55,145 C 35,139 12,122 17,105"
        stroke="#cbd5e1"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Orbit Ring Accent Line (Back Half) */}
      <path
        d="M 192,120 C 200,138 130,170 50,148"
        stroke="#cbd5e1"
        strokeWidth="1"
        strokeDasharray="3 3"
        fill="none"
      />

      {/* Main Grey Circle */}
      <circle cx="100" cy="100" r="48" fill="#a1a1aa" />

      {/* Orbit Ring (Front Half) */}
      <path
        d="M 17,105 C 22,88 95,58 165,78 C 185,84 190,100 185,115"
        stroke="#e2e8f0"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Orbit Ring Accent Line (Front Half) */}
      <path
        d="M 23,101 C 28,85 100,55 170,75 C 188,80 195,95 192,120"
        stroke="#cbd5e1"
        strokeWidth="1"
        strokeDasharray="3 3"
        fill="none"
      />

      {/* Letter 'A' (Serif, elegant, on the left) */}
      <text
        x="72"
        y="112"
        fill="#0f172a"
        fontSize="34"
        fontWeight="bold"
        fontFamily="Times New Roman, Georgia, serif"
        textAnchor="middle"
      >
        A
      </text>

      {/* Boot Silhouette */}
      <g transform="translate(80, 58) scale(0.95)">
        {/* Main Boot Body */}
        <path
          d="M 18,8 
             C 24,8 26,7 32,7 
             C 35,7 38,12 39,18 
             C 40,24 37,28 42,32 
             C 48,36 55,38 58,45 
             C 52,50 42,53 28,53 
             C 14,51 8,50 7,48 
             C 5,45 6,38 13,27 
             C 16,23 13,14 15,8 Z"
          fill="#0f172a"
        />

        {/* Sole & Heel Detail */}
        <path
          d="M 6,53 C 12,53 25,55 38,53 C 44,52 48,49 55,45 L 58,50 C 50,56 44,59 36,60 C 22,62 5,59 3,59 Z"
          fill="#0f172a"
        />

        {/* Sole Grip Teeth */}
        <path
          d="M 6,59 L 8,62 L 12,59 L 14,62 L 18,59 L 20,62 L 24,59 L 26,62 L 30,59"
          stroke="#0f172a"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Eyelets (White dots for laces) */}
        <circle cx="21" cy="14" r="1.5" fill="#ffffff" />
        <circle cx="23" cy="20" r="1.5" fill="#ffffff" />
        <circle cx="26" cy="27" r="1.5" fill="#ffffff" />
        <circle cx="29" cy="34" r="1.5" fill="#ffffff" />
        <circle cx="33" cy="40" r="1.5" fill="#ffffff" />

        {/* Styling Stitch Lines (thin grey dashed lines) */}
        <path d="M 17,11 C 21,24 16,37 8,44" stroke="#94a3b8" strokeWidth="1" strokeDasharray="1.5 1.5" fill="none" />
        <path d="M 27,11 C 28,22 24,33 18,42" stroke="#94a3b8" strokeWidth="1" strokeDasharray="1.5 1.5" fill="none" />
        <path d="M 32,19 C 32,30 40,38 51,44" stroke="#94a3b8" strokeWidth="1" strokeDasharray="1.5 1.5" fill="none" />
      </g>

      {/* Letter 'S' (Decorative serif, on the right) */}
      <text
        x="134"
        y="112"
        fill="#0f172a"
        fontSize="34"
        fontWeight="bold"
        fontFamily="Times New Roman, Georgia, serif"
        textAnchor="middle"
      >
        S
      </text>
    </svg>
  );
};

export const CompanyLogo: React.FC<LogoProps & { logoUrl?: string }> = ({ className = '', size = 48, logoUrl }) => {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="Company Logo"
        width={size}
        height={size}
        className={`object-contain rounded-lg ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return <LogoIcon className={className} size={size} />;
};

export const FullLogo: React.FC<LogoProps & { logoUrl?: string; companyName?: string }> = ({
  className = '',
  size = 160,
  logoUrl,
  companyName = 'Angkasa Jaya Shoes'
}) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Icon portion */}
      <CompanyLogo size={size} logoUrl={logoUrl} />

      {/* Text label underneath */}
      <div className="flex flex-col items-center justify-center mt-3 text-center">
        <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none">
          {companyName}
        </h2>
      </div>
    </div>
  );
};
