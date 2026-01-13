interface BackgroundOverlayProps {
  isFadingToBlack?: boolean;
}

export function BackgroundOverlay({ isFadingToBlack = false }: BackgroundOverlayProps) {
  return (
    <>
      {/* Background image with heavy overlay */}
      <div 
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-500 ${
          isFadingToBlack ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ backgroundImage: "url('/20221211-SBW_0367.jpg')" }}
      />
      <div className={`absolute inset-0 transition-opacity duration-500 ${
        isFadingToBlack 
          ? 'bg-[#0a0a0a]' 
          : 'bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/50 to-[#0a0a0a]'
      }`} />
      
      {/* Subtle radial glow */}
      <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(164,198,190,0.03)_0%,transparent_70%)] transition-opacity duration-500 ${
        isFadingToBlack ? 'opacity-0' : 'opacity-100'
      }`} />
    </>
  );
}

