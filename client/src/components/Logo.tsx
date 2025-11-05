import { Car } from 'lucide-react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className = '', showText = true, size = 'md' }: LogoProps) {
  const sizes = {
    sm: { container: 'h-6 w-6', icon: 'h-3.5 w-3.5', text: 'text-base' },
    md: { container: 'h-8 w-8', icon: 'h-5 w-5', text: 'text-xl' },
    lg: { container: 'h-10 w-10', icon: 'h-6 w-6', text: 'text-2xl' },
  };

  const sizeConfig = sizes[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Logo Icon */}
      <div className={`${sizeConfig.container} rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md`}>
        <Car className={`${sizeConfig.icon} text-primary-foreground`} strokeWidth={2.5} />
      </div>
      
      {/* Logo Text */}
      {showText && (
        <div className={`${sizeConfig.text} font-bold font-heading`}>
          <span className="text-foreground">Drivers</span>
          <span className="text-primary"> On Demand</span>
        </div>
      )}
    </div>
  );
}
