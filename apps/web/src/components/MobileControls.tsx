import { useEffect, useRef, useState } from "react";

interface MobileControlsProps {
  onDirectionChange: (direction: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  }) => void;
  onActionA: () => void;
  onActionB: () => void;
  onStart: () => void;
}

const checkMobile = (): boolean => {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) || window.innerWidth <= 768
  );
};

const MobileControls = ({
  onDirectionChange,
  onActionA,
  onActionB,
  onStart,
}: MobileControlsProps) => {
  const [isMobile, setIsMobile] = useState(checkMobile());
  const directionStateRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(checkMobile());
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleDirectionStart = (
    direction: "up" | "down" | "left" | "right",
  ) => {
    directionStateRef.current[direction] = true;
    onDirectionChange({ ...directionStateRef.current });
  };

  const handleDirectionEnd = (direction: "up" | "down" | "left" | "right") => {
    directionStateRef.current[direction] = false;
    onDirectionChange({ ...directionStateRef.current });
  };

  const handleTouchStart = (
    direction: "up" | "down" | "left" | "right",
    e: React.TouchEvent,
  ) => {
    e.preventDefault();
    handleDirectionStart(direction);
  };

  const handleTouchEnd = (
    direction: "up" | "down" | "left" | "right",
    e: React.TouchEvent,
  ) => {
    e.preventDefault();
    handleDirectionEnd(direction);
  };

  const handleMouseDown = (direction: "up" | "down" | "left" | "right") => {
    handleDirectionStart(direction);
  };

  const handleMouseUp = (direction: "up" | "down" | "left" | "right") => {
    handleDirectionEnd(direction);
  };

  const handleActionA = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onActionA();
  };

  const handleActionB = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onActionB();
  };

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onStart();
  };

  if (!isMobile) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {/* Semi-transparent overlay background for controls area */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-background/50 backdrop-blur-sm pointer-events-none" />

      {/* Controls Container - Bottom Center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-3">
        {/* D-Pad Controls */}
        <div className="relative w-24 h-24">
          {/* Up Button */}
          <button
            type="button"
            className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 bg-card border-2 border-border rounded-lg flex items-center justify-center text-foreground text-lg font-bold active:bg-accent select-none touch-none shadow-md hover:ev-glow-sm transition-shadow"
            onTouchStart={(e) => handleTouchStart("up", e)}
            onTouchEnd={(e) => handleTouchEnd("up", e)}
            onMouseDown={() => handleMouseDown("up")}
            onMouseUp={() => handleMouseUp("up")}
            onMouseLeave={() => handleMouseUp("up")}
            aria-label="Move Up"
          >
            ↑
          </button>

          {/* Down Button */}
          <button
            type="button"
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 bg-card border-2 border-border rounded-lg flex items-center justify-center text-foreground text-lg font-bold active:bg-accent select-none touch-none shadow-md hover:ev-glow-sm transition-shadow"
            onTouchStart={(e) => handleTouchStart("down", e)}
            onTouchEnd={(e) => handleTouchEnd("down", e)}
            onMouseDown={() => handleMouseDown("down")}
            onMouseUp={() => handleMouseUp("down")}
            onMouseLeave={() => handleMouseUp("down")}
            aria-label="Move Down"
          >
            ↓
          </button>

          {/* Left Button */}
          <button
            type="button"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-card border-2 border-border rounded-lg flex items-center justify-center text-foreground text-lg font-bold active:bg-accent select-none touch-none shadow-md hover:ev-glow-sm transition-shadow"
            onTouchStart={(e) => handleTouchStart("left", e)}
            onTouchEnd={(e) => handleTouchEnd("left", e)}
            onMouseDown={() => handleMouseDown("left")}
            onMouseUp={() => handleMouseUp("left")}
            onMouseLeave={() => handleMouseUp("left")}
            aria-label="Move Left"
          >
            ←
          </button>

          {/* Right Button */}
          <button
            type="button"
            className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-card border-2 border-border rounded-lg flex items-center justify-center text-foreground text-lg font-bold active:bg-accent select-none touch-none shadow-md hover:ev-glow-sm transition-shadow"
            onTouchStart={(e) => handleTouchStart("right", e)}
            onTouchEnd={(e) => handleTouchEnd("right", e)}
            onMouseDown={() => handleMouseDown("right")}
            onMouseUp={() => handleMouseUp("right")}
            onMouseLeave={() => handleMouseUp("right")}
            aria-label="Move Right"
          >
            →
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* A Button - Main Action */}
          <button
            type="button"
            className="w-14 h-14 bg-ev-teal/90 border-2 border-ev-teal rounded-full flex items-center justify-center text-background text-lg font-bold active:bg-ev-tealDark select-none touch-none shadow-md hover:ev-glow transition-shadow"
            onTouchStart={handleActionA}
            onTouchEnd={(e) => e.preventDefault()}
            onClick={handleActionA}
            aria-label="Action A - Interact"
          >
            A
          </button>

          {/* B Button - Cancel */}
          <button
            type="button"
            className="w-14 h-14 bg-danger-rust/90 border-2 border-danger-rust rounded-full flex items-center justify-center text-foreground text-lg font-bold active:bg-danger-rustDark select-none touch-none shadow-md hover:ev-glow-sm transition-shadow"
            onTouchStart={handleActionB}
            onTouchEnd={(e) => e.preventDefault()}
            onClick={handleActionB}
            aria-label="Action B - Cancel"
          >
            B
          </button>

          {/* Start Button */}
          <button
            type="button"
            className="w-16 h-10 bg-primary/90 border-2 border-primary rounded-lg flex items-center justify-center text-primary-foreground text-xs font-bold active:bg-primary/80 select-none touch-none shadow-md hover:ev-glow-sm transition-shadow"
            onTouchStart={handleStart}
            onTouchEnd={(e) => e.preventDefault()}
            onClick={handleStart}
            aria-label="Start - Menu"
          >
            START
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileControls;
