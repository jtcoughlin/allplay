// Official Network Logo Components as SVGs
export const NetworkLogos = {
  FOX: () => (
    <div className="w-8 h-6 bg-white rounded flex items-center justify-center">
      <span className="text-black font-bold text-xs">FOX</span>
    </div>
  ),
  
  NBC: () => (
    <div className="w-8 h-6 flex items-center justify-center">
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <defs>
          <linearGradient id="nbcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF6B35" />
            <stop offset="20%" stopColor="#F7931E" />
            <stop offset="40%" stopColor="#FFD100" />
            <stop offset="60%" stopColor="#4CBB17" />
            <stop offset="80%" stopColor="#00A8CC" />
            <stop offset="100%" stopColor="#6A4C93" />
          </linearGradient>
        </defs>
        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="url(#nbcGradient)" />
        <text x="12" y="18" textAnchor="middle" className="text-xs font-bold fill-white">NBC</text>
      </svg>
    </div>
  ),
  
  ABC: () => (
    <div className="w-8 h-6 bg-black rounded flex items-center justify-center">
      <span className="text-white font-bold text-xs">abc</span>
    </div>
  ),
  
  CBS: () => (
    <div className="w-8 h-6 flex items-center justify-center">
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#000" />
        <path d="M12 6C8.69 6 6 8.69 6 12S8.69 18 12 18C15.31 18 18 15.31 18 12S15.31 6 12 6Z" fill="#FFF" />
        <text x="12" y="14" textAnchor="middle" className="text-xs font-bold fill-black">CBS</text>
      </svg>
    </div>
  ),
  
  PBS: () => (
    <div className="w-8 h-6 bg-blue-800 rounded flex items-center justify-center">
      <span className="text-white font-bold text-xs">PBS</span>
    </div>
  ),
  
  TBS: () => (
    <div className="w-8 h-6 bg-orange-500 rounded flex items-center justify-center">
      <span className="text-white font-bold text-xs">TBS</span>
    </div>
  ),
  
  TNT: () => (
    <div className="w-8 h-6 bg-red-600 rounded flex items-center justify-center">
      <span className="text-white font-bold text-xs">TNT</span>
    </div>
  ),
  
  FS1: () => (
    <div className="w-8 h-6 bg-blue-600 rounded flex items-center justify-center">
      <span className="text-white font-bold text-xs">FS1</span>
    </div>
  ),
  
  FS2: () => (
    <div className="w-8 h-6 bg-blue-700 rounded flex items-center justify-center">
      <span className="text-white font-bold text-xs">FS2</span>
    </div>
  ),
  
  DISNEY: () => (
    <div className="w-8 h-6 bg-blue-500 rounded flex items-center justify-center">
      <span className="text-white font-bold text-xs">DIS</span>
    </div>
  ),
  
  NICK: () => (
    <div className="w-8 h-6 bg-orange-400 rounded flex items-center justify-center">
      <span className="text-white font-bold text-xs">NICK</span>
    </div>
  ),
  
  TRUTV: () => (
    <div className="w-8 h-6 bg-green-600 rounded flex items-center justify-center">
      <span className="text-white font-bold text-xs">truTV</span>
    </div>
  ),
  
  AMC: () => (
    <div className="w-8 h-6 bg-black rounded flex items-center justify-center">
      <span className="text-white font-bold text-xs">AMC</span>
    </div>
  ),
  
  BBC: () => (
    <div className="w-8 h-6 bg-red-600 rounded flex items-center justify-center">
      <span className="text-white font-bold text-xs">BBC</span>
    </div>
  ),
  
  CARTOON: () => (
    <div className="w-8 h-6 bg-yellow-400 rounded flex items-center justify-center">
      <span className="text-black font-bold text-xs">CN</span>
    </div>
  ),
  
  CMT: () => (
    <div className="w-8 h-6 bg-orange-600 rounded flex items-center justify-center">
      <span className="text-white font-bold text-xs">CMT</span>
    </div>
  ),
  
  COMEDY: () => (
    <div className="w-8 h-6 bg-purple-600 rounded flex items-center justify-center">
      <span className="text-white font-bold text-xs">COM</span>
    </div>
  ),
  
  FX: () => (
    <div className="w-8 h-6 bg-black rounded flex items-center justify-center">
      <span className="text-white font-bold text-xs">FX</span>
    </div>
  ),
  
  MTV: () => (
    <div className="w-8 h-6 bg-pink-500 rounded flex items-center justify-center">
      <span className="text-white font-bold text-xs">MTV</span>
    </div>
  ),
  
  HALLMARK: () => (
    <div className="w-8 h-6 bg-purple-500 rounded flex items-center justify-center">
      <span className="text-white font-bold text-xs">HAL</span>
    </div>
  ),
  
  NATGEO: () => (
    <div className="w-8 h-6 bg-yellow-500 rounded flex items-center justify-center">
      <span className="text-black font-bold text-xs">NAT</span>
    </div>
  ),
  
  DISCOVERY: () => (
    <div className="w-8 h-6 bg-blue-500 rounded flex items-center justify-center">
      <span className="text-white font-bold text-xs">DISC</span>
    </div>
  ),
  
  CNN: () => (
    <div className="w-8 h-6 bg-red-600 rounded flex items-center justify-center">
      <span className="text-white font-bold text-xs">CNN</span>
    </div>
  ),
  
  ESPN: () => (
    <div className="w-8 h-6 bg-red-600 rounded flex items-center justify-center">
      <span className="text-white font-bold text-xs">ESPN</span>
    </div>
  )
};

export type NetworkLogoKey = keyof typeof NetworkLogos;