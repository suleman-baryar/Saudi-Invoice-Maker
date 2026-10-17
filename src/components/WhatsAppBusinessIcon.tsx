import React from 'react';

interface WhatsAppBusinessIconProps {
  className?: string;
  size?: number;
}

export const WhatsAppBusinessIcon: React.FC<WhatsAppBusinessIconProps> = ({
  className = 'w-4 h-4',
  size,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24M9.5 7.5h2.9c1.6 0 2.6.85 2.6 2.05 0 .85-.45 1.45-1.15 1.75.9.3 1.45 1 1.45 2 0 1.35-1.1 2.2-2.85 2.2H9.5V7.5zm1.55 3.1h1.15c.65 0 1.1-.35 1.1-.9s-.45-.9-1.1-.9h-1.15v1.8zm0 3.6h1.35c.75 0 1.2-.4 1.2-1s-.45-1-1.2-1h-1.35v2z" />
    </svg>
  );
};
