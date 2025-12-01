import Phaser from "phaser";

export const splitTextIntoLines = (
  scene: Phaser.Scene,
  text: string,
  maxWidth: number,
  font: string = "16px monospace"
): string[] => {
  const tempText = scene.add.text(0, 0, "", {
    font,
    color: "#000000",
  });
  tempText.setVisible(false);

  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    tempText.setText(testLine);
    const textWidth = tempText.width;

    if (textWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  tempText.destroy();
  return lines;
};

