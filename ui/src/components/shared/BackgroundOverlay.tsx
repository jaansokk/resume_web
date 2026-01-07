export function BackgroundOverlay() {
  return (
    <>
      {/* Background image with heavy overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/20221211-SBW_0367.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/50 to-[#0a0a0a]" />
      
      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(164,198,190,0.03)_0%,transparent_70%)]" />
    </>
  );
}

