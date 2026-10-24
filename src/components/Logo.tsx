import React from 'react';

type LogoProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  dark?: boolean;
};

const wordmarkAssets = {
  light: '/media/brand/lulu-wordmark-black.png',
  dark: '/media/brand/lulu-wordmark-white.png',
} as const;

export const LuLuLogo: React.FC<LogoProps> = ({ className = '', size = 'md', showTagline = false, dark = false }) => {
  const heights = { sm: 22, md: 28, lg: 38, xl: 52 };
  const height = heights[size];

  return (
    <span className={`lulu-logo-wrap ${className}`} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <img
        className="lulu-wordmark"
        src={wordmarkAssets[dark ? 'dark' : 'light']}
        alt="LuLu"
        width={Math.round(height * 540 / 215)}
        height={height}
        style={{ display: 'block', width: 'auto', height, objectFit: 'contain' }}
      />
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
    </span>
  );
};

export const LuLuAppIcon: React.FC<{ size?: number; dark?: boolean; className?: string }> = ({
  size = 48,
  dark = false,
  className = '',
}) => (
  <span
    className={`lulu-app-icon ${className}`}
    aria-label="LuLu"
    role="img"
    style={{
      width: size,
      height: size,
      borderRadius: Math.round(size * 0.24),
      backgroundColor: dark ? '#080808' : '#faf9f6',
      boxShadow: dark ? '0 4px 14px rgba(0,0,0,0.35)' : '0 2px 10px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.06)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      overflow: 'hidden',
    }}
  >
    <img
      src={dark ? '/media/brand/lu-mark-white.png' : '/media/brand/lu-mark-black.png'}
      alt=""
      width={Math.round(size * 0.65)}
      height={Math.round(size * 0.52)}
      style={{ width: '65%', height: '52%', objectFit: 'contain', display: 'block' }}
    />
  </span>
);
