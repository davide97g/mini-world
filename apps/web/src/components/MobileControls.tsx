import { useEffect, useRef, useState } from 'react';

interface MobileControlsProps {
  onDirectionChange: (direction: { up: boolean; down: boolean; left: boolean; right: boolean }) => void;
  onActionA: () => void;
  onActionB: () => void;
  onStart: () => void;
}

const checkMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth <= 768;
};

const MobileControls = ({ onDirectionChange, onActionA, onActionB, onStart }: MobileControlsProps) => {
  const [isMobile, setIsMobile] = useState(checkMobile());
  const directionStateRef = useRef({ up: false, down: false, left: false, right: false });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(checkMobile());
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleDirectionStart = (direction: 'up' | 'down' | 'left' | 'right') => {
    directionStateRef.current[direction] = true;
    onDirectionChange({ ...directionStateRef.current });
  };

  const handleDirectionEnd = (direction: 'up' | 'down' | 'left' | 'right') => {
    directionStateRef.current[direction] = false;
    onDirectionChange({ ...directionStateRef.current });
  };

  const handleTouchStart = (direction: 'up' | 'down' | 'left' | 'right', e: React.TouchEvent) => {
    e.preventDefault();
    handleDirectionStart(direction);
  };

  const handleTouchEnd = (direction: 'up' | 'down' | 'left' | 'right', e: React.TouchEvent) => {
    e.preventDefault();
    handleDirectionEnd(direction);
  };

  const handleMouseDown = (direction: 'up' | 'down' | 'left' | 'right') => {
    handleDirectionStart(direction);
  };

  const handleMouseUp = (direction: 'up' | 'down' | 'left' | 'right') => {
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
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* D-Pad Controls - Bottom Left */}
      <div className="absolute bottom-6 left-6 pointer-events-auto">
        <div className="relative w-32 h-32">
          {/* Up Button */}
          <button
            className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-gray-800 bg-opacity-80 border-2 border-gray-600 rounded-lg flex items-center justify-center text-white text-xl font-bold active:bg-gray-700 select-none touch-none"
            onTouchStart={(e) => handleTouchStart('up', e)}
            onTouchEnd={(e) => handleTouchEnd('up', e)}
            onMouseDown={() => handleMouseDown('up')}
            onMouseUp={() => handleMouseUp('up')}
            onMouseLeave={() => handleMouseUp('up')}
            aria-label="Move Up"
          >
            ↑
          </button>

          {/* Down Button */}
          <button
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-gray-800 bg-opacity-80 border-2 border-gray-600 rounded-lg flex items-center justify-center text-white text-xl font-bold active:bg-gray-700 select-none touch-none"
            onTouchStart={(e) => handleTouchStart('down', e)}
            onTouchEnd={(e) => handleTouchEnd('down', e)}
            onMouseDown={() => handleMouseDown('down')}
            onMouseUp={() => handleMouseUp('down')}
            onMouseLeave={() => handleMouseUp('down')}
            aria-label="Move Down"
          >
            ↓
          </button>

          {/* Left Button */}
          <button
            className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-gray-800 bg-opacity-80 border-2 border-gray-600 rounded-lg flex items-center justify-center text-white text-xl font-bold active:bg-gray-700 select-none touch-none"
            onTouchStart={(e) => handleTouchStart('left', e)}
            onTouchEnd={(e) => handleTouchEnd('left', e)}
            onMouseDown={() => handleMouseDown('left')}
            onMouseUp={() => handleMouseUp('left')}
            onMouseLeave={() => handleMouseUp('left')}
            aria-label="Move Left"
          >
            ←
          </button>

          {/* Right Button */}
          <button
            className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-gray-800 bg-opacity-80 border-2 border-gray-600 rounded-lg flex items-center justify-center text-white text-xl font-bold active:bg-gray-700 select-none touch-none"
            onTouchStart={(e) => handleTouchStart('right', e)}
            onTouchEnd={(e) => handleTouchEnd('right', e)}
            onMouseDown={() => handleMouseDown('right')}
            onMouseUp={() => handleMouseUp('right')}
            onMouseLeave={() => handleMouseUp('right')}
            aria-label="Move Right"
          >
            →
          </button>
        </div>
      </div>

      {/* Action Buttons - Bottom Right */}
      <div className="absolute bottom-6 right-6 pointer-events-auto flex flex-col gap-4">
        {/* A Button - Main Action */}
        <button
          className="w-16 h-16 bg-green-600 bg-opacity-80 border-2 border-green-400 rounded-full flex items-center justify-center text-white text-xl font-bold active:bg-green-700 select-none touch-none shadow-lg"
          onTouchStart={handleActionA}
          onTouchEnd={(e) => e.preventDefault()}
          onClick={handleActionA}
          aria-label="Action A - Interact"
        >
          A
        </button>

        {/* B Button - Cancel */}
        <button
          className="w-16 h-16 bg-red-600 bg-opacity-80 border-2 border-red-400 rounded-full flex items-center justify-center text-white text-xl font-bold active:bg-red-700 select-none touch-none shadow-lg"
          onTouchStart={handleActionB}
          onTouchEnd={(e) => e.preventDefault()}
          onClick={handleActionB}
          aria-label="Action B - Cancel"
        >
          B
        </button>
      </div>

      {/* Start Button - Top Right */}
      <button
        className="absolute top-6 right-6 w-20 h-10 bg-blue-600 bg-opacity-80 border-2 border-blue-400 rounded-lg flex items-center justify-center text-white text-sm font-bold active:bg-blue-700 select-none touch-none shadow-lg pointer-events-auto"
        onTouchStart={handleStart}
        onTouchEnd={(e) => e.preventDefault()}
        onClick={handleStart}
        aria-label="Start - Menu"
      >
        START
      </button>
    </div>
  );
};

export default MobileControls;

