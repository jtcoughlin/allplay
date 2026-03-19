import vunoLogo from "@assets/Vuno_Logo_Cropped_1773886730767.png";

interface LogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
}

export function Logo({ className = "", size = 'medium' }: LogoProps) {
  const sizeClasses = {
    small: 'h-6',
    medium: 'h-8',
    large: 'h-12',
    xlarge: 'h-24',
  };

  return (
    <div className={`flex items-center ${className}`} data-testid="logo-vuno">
      <img 
        src={vunoLogo} 
        alt="Vuno" 
        className={`${sizeClasses[size]} w-auto object-contain`}
        data-testid="logo-image"
      />
    </div>
  );
}
