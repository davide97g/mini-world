import Phaser from "phaser";
import { useEffect, useRef } from "react";
import { createGameConfig } from "../game/GameConfig";
import MobileControls from "./MobileControls";

const Game = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!gameRef.current || phaserGameRef.current) return;

    const config = createGameConfig("game-container");
    phaserGameRef.current = new Phaser.Game(config);

    const handleResize = () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.scale.resize(
          window.innerWidth,
          window.innerHeight,
        );
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, []);

  const handleDirectionChange = (direction: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  }) => {
    window.dispatchEvent(
      new CustomEvent("mobileDirectionChange", { detail: direction }),
    );
  };

  const handleActionA = () => {
    window.dispatchEvent(new CustomEvent("mobileActionA"));
  };

  const handleActionB = () => {
    window.dispatchEvent(new CustomEvent("mobileActionB"));
  };

  const handleStart = () => {
    window.dispatchEvent(new CustomEvent("mobileStart"));
  };

  return (
    <>
      <div
        id="game-container"
        ref={gameRef}
        style={{
          width: "100vw",
          height: "100vh",
          margin: 0,
          padding: 0,
        }}
      />
      <MobileControls
        onDirectionChange={handleDirectionChange}
        onActionA={handleActionA}
        onActionB={handleActionB}
        onStart={handleStart}
      />
    </>
  );
};

export default Game;
