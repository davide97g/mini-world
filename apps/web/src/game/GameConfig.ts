import Phaser from "phaser";
import { GameScene } from "./GameScene";
import { PreloaderScene } from "./PreloaderScene";

export const createGameConfig = (
  parent: string
): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent,
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0, x: 0 },
    },
  },
  audio: {
    disableWebAudio: false, // Use Web Audio API for better background playback
    noAudio: false,
  },
  scene: [PreloaderScene, GameScene],
});
