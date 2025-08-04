import { Play } from "lucide-react";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className = "", showText = true }: LogoProps) {
  return (
    <div className={`flex items-center space-x-2 ${className}`} data-testid="logo-allplay">
      <div className="relative">
        <div className="w-8 h-8 bg-blue-gradient rounded-full flex items-center justify-center">
          <Play className="w-4 h-4 text-white fill-white" data-testid="logo-play-icon" />
        </div>
      </div>
      {showText && (
        <span className="text-cream font-bold text-xl tracking-tight" data-testid="logo-text">
          allplay
        </span>
      )}
    </div>
  );
}
