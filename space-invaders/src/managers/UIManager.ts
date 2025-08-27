import Phaser from "phaser";

export class UIManager {
  private scene: Phaser.Scene;
  private scoreText!: Phaser.GameObjects.Text;
  private bossTimerText!: Phaser.GameObjects.Text;
  private bossHpBar?: Phaser.GameObjects.Graphics;
  private powerText!: Phaser.GameObjects.Text;
  private left = 0;
  private right = 0;

  constructor(scene: Phaser.Scene, left: number, right: number) {
    this.scene = scene;
    this.left = left;
    this.right = right;

    this.scoreText = scene.add.text(left + 12, 10, "Score: 0", {
      fontFamily: "monospace", fontSize: "20px", color: "#C2F970",
    }).setDepth(10).setScrollFactor(0);

    this.bossTimerText = scene.add.text(right - 12, 10, "Boss in: 25s", {
      fontFamily: "monospace", fontSize: "20px", color: "#00E5FF",
    }).setOrigin(1, 0).setDepth(10).setScrollFactor(0);

    this.powerText = scene.add.text(right - 12, 34, "", {
      fontFamily: "monospace", fontSize: "16px", color: "#FFD166",
    }).setOrigin(1, 0).setDepth(10).setScrollFactor(0);
  }

  setScore(v: number) { 
    this.scoreText.setText(`Score: ${v}`); 
  }
  setBossTimerText(t: string) { 
    this.bossTimerText.setText(t); 
  }

  setPowerUpLabel(text: string) { 
    this.powerText.setText(text ? `POWER-UP: ${text}` : ""); 
  }
  clearPowerUpLabel() { 
    this.powerText.setText(""); 
  }

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

  resize(left: number, right: number) {
    this.left = left;
    this.right = right;

    this.scoreText.setX(this.left + 12);

    this.bossTimerText
      .setX(this.right - 12)
      .setOrigin(1, 0);

    this.powerText
      .setX(this.right - 12)
      .setOrigin(1, 0);
  }
}
