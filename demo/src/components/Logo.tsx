import React from 'react';

type LogoProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
};

export const LuLuLogo: React.FC<LogoProps> = ({ className = '', size = 'md', showTagline = false }) => {
  const heights = {
    sm: 22,
    md: 28,
    lg: 38,
    xl: 52,
  };

  const h = heights[size];
  const w = Math.round(h * 3.1);

  return (
    <div className={`lulu-logo-wrap ${className}`} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <svg
        width={w}
        height={h}
        viewBox="0 0 155 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="LuLu"
        role="img"
      >
        {/* L */}
        <path
          d="M12 4C12 4 12 36 12 38C12 42.5 15.5 46 20 46C24.5 46 44 46 44 46"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* u */}
        <path
          d="M52 18V35C52 41 56 46 63 46C70 46 74 41 74 35V18"
          stroke="currentColor"
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* L */}
        <path
          d="M87 4C87 4 87 36 87 38C87 42.5 90.5 46 95 46C99.5 46 119 46 119 46"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* u */}
        <path
          d="M127 18V35C127 41 131 46 138 46C145 46 149 41 149 35V18"
          stroke="currentColor"
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showTagline && (
        <span
          style={{
            fontFamily: 'Inter Tight, sans-serif',
            fontSize: size === 'sm' ? '9px' : '11px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            marginTop: '3px',
            fontWeight: 500,
          }}
        >
          Journal • Storybook
        </span>
      )}
    </div>
  );
};

export const LuLuAppIcon: React.FC<{ size?: number; dark?: boolean; className?: string }> = ({
  size = 48,
  dark = false,
  className = '',
}) => {
  return (
    <div
      className={`lulu-app-icon ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.24),
        backgroundColor: dark ? '#080808' : '#FFFFFF',
        color: dark ? '#FFFFFF' : '#080808',
        boxShadow: dark
          ? '0 4px 14px rgba(0,0,0,0.35)'
          : '0 2px 10px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg
        width={Math.round(size * 0.65)}
        height={Math.round(size * 0.28)}
        viewBox="0 0 155 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 4V38C12 42.5 15.5 46 20 46H44"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M52 18V35C52 41 56 46 63 46C70 46 74 41 74 35V18"
          stroke="currentColor"
          strokeWidth="8.5"
          strokeLinecap="round"
        />
        <path
          d="M87 4V38C87 42.5 90.5 46 95 46H119"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M127 18V35C127 41 131 46 138 46C145 46 149 41 149 35V18"
          stroke="currentColor"
          strokeWidth="8.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
