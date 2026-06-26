interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizes = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
  };

  const heightClass = sizes[size];

  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src="/draba-logo.png" 
        alt="Draba" 
        className={`${heightClass} w-auto object-contain`}
      />
    </div>
  );
}
