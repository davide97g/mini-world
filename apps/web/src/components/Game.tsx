import Phaser from "phaser";
import { useEffect, useRef, useState } from "react";
import packageJson from "../../package.json";
import { createGameConfig } from "../game/GameConfig";
import type { GameScene } from "../game/GameScene";
import MobileControls from "./MobileControls";
import WorldSelection from "./WorldSelection";

const Game = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const [showWorldSelection, setShowWorldSelection] = useState(true);
  const [worldId, setWorldId] = useState<string | null>(null);

  useEffect(() => {
    if (!gameRef.current || phaserGameRef.current || showWorldSelection) return;

    const config = createGameConfig("game-container");
    phaserGameRef.current = new Phaser.Game(config);

    // Wait for game to be ready, then set world ID
    const checkGameReady = setInterval(() => {
      if (phaserGameRef.current && worldId) {
        const scene = phaserGameRef.current.scene.getScene(
          "GameScene",
        ) as GameScene;
        if (scene) {
          scene.setWorldId(worldId);
          clearInterval(checkGameReady);
        }
      }
    }, 100);

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
      clearInterval(checkGameReady);
      window.removeEventListener("resize", handleResize);
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, [showWorldSelection, worldId]);

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

  const handleActionX = () => {
    window.dispatchEvent(new CustomEvent("mobileActionX"));
  };

  const handleStart = () => {
    window.dispatchEvent(new CustomEvent("mobileStart"));
  };

  const handleWorldSelected = (selectedWorldId: string) => {
    setWorldId(selectedWorldId);
    setShowWorldSelection(false);
  };

  const handleWorldCreated = (createdWorldId: string) => {
    setWorldId(createdWorldId);
    setShowWorldSelection(false);
  };

  return (
    <>
      {showWorldSelection ? (
        <WorldSelection
          onWorldSelected={handleWorldSelected}
          onWorldCreated={handleWorldCreated}
        />
      ) : (
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
            onActionX={handleActionX}
            onStart={handleStart}
          />
          <div
            className="absolute bottom-4 right-4 text-white px-2 py-1 rounded pointer-events-none"
            style={{
              zIndex: 9999,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              position: "absolute",
              bottom: "4px",
              right: "4px",
              fontFamily: "monospace",
              fontSize: "12px",
              textShadow: "1px 1px 2px rgba(0, 0, 0, 0.8)",
              letterSpacing: "0.5px",
            }}
          >
            v{packageJson.version}
          </div>
        </>
      )}
    </>
  );
};

export default Game;
