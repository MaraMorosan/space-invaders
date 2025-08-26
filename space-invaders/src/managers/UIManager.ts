import Phaser from "phaser";

export class UIManager {
  private scene: Phaser.Scene;
  private scoreText!: Phaser.GameObjects.Text;
  private bossTimerText!: Phaser.GameObjects.Text;
  private bossHpBar?: Phaser.GameObjects.Graphics;
  private powerText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, pfLeft: number, pfRight: number) {
    this.scene = scene;

    this.scoreText = scene.add.text(pfLeft + 12, 10, "Score: 0", {
      fontFamily: "monospace",
      fontSize: "20px",
      color: "#C2F970",
    }).setDepth(10).setScrollFactor(0);

    this.bossTimerText = scene.add.text(pfRight - 12, 10, "Boss in: --", {
      fontFamily: "monospace",
      fontSize: "20px",
      color: "#00E5FF",
    }).setOrigin(1, 0).setDepth(10).setScrollFactor(0);

    this.powerText = scene.add.text(pfLeft + 12, 34, "", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#FFD166",
    }).setDepth(10).setScrollFactor(0);
  }

  setScore(score: number) {
    this.scoreText.setText(`Score: ${score}`);
  }

  setBossTimerText(text: string) {
    this.bossTimerText.setText(text);
  }

  setPowerUpLabel(text: string) { this.powerText.setText(text ? `POWER-UP: ${text}` : ""); }
  clearPowerUpLabel() { this.powerText.setText(""); }

  drawBossHpBar(current: number, max: number, centerX: number) {
    const ratio = Phaser.Math.Clamp(current / Math.max(1, max), 0, 1);
    const barW = 220, barH = 10;
    const x = centerX - barW / 2;
    const y = 36;

    if (!this.bossHpBar) this.bossHpBar = this.scene.add.graphics().setDepth(60);
    this.bossHpBar.clear();
    this.bossHpBar.fillStyle(0x1b2430, 1);
    this.bossHpBar.fillRoundedRect(x, y, barW, barH, 5);
    this.bossHpBar.fillStyle(0xff5d73, 1);
    this.bossHpBar.fillRoundedRect(x, y, barW * ratio, barH, 5);
  }

  clearBossHpBar() {
    this.bossHpBar?.destroy();
    this.bossHpBar = undefined;
  }
}
