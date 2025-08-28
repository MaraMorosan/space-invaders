import Phaser from 'phaser';

export class UIManager {
  private scene: Phaser.Scene;
  private scoreText!: Phaser.GameObjects.Text;
  private bossTimerText!: Phaser.GameObjects.Text;
  private bossHpBar?: Phaser.GameObjects.Graphics;
  private powerText!: Phaser.GameObjects.Text;
  private hearts: Phaser.GameObjects.Image[] = [];
  private heartSpacing = 22;
  private left = 0;
  private right = 0;
  private goOverlay?: Phaser.GameObjects.Rectangle;
  private goPanel?: Phaser.GameObjects.Container;
  private goBtn?: Phaser.GameObjects.Rectangle;
  private goBtnLabel?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, left: number, right: number) {
    this.scene = scene;
    this.left = left;
    this.right = right;

    this.scoreText = scene.add
      .text(left + 12, 10, 'Score: 0', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#C2F970',
      })
      .setDepth(10)
      .setScrollFactor(0);

    this.bossTimerText = scene.add
      .text(right - 12, 10, 'Boss in: 25s', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#00E5FF',
      })
      .setOrigin(1, 0)
      .setDepth(10)
      .setScrollFactor(0);

    this.powerText = scene.add
      .text(right - 12, 34, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#FFD166',
      })
      .setOrigin(1, 0)
      .setDepth(10)
      .setScrollFactor(0);
  }

  setLives(current: number, max: number) {
    for (let i = this.hearts.length; i < max; i++) {
      const img = this.scene.add
        .image(0, 0, 'heart')
        .setOrigin(0, 0)
        .setScale(0.9)
        .setDepth(10)
        .setScrollFactor(0);
      this.hearts.push(img);
    }
    const baseX = this.left + 12;
    const y = 34;
    for (let i = 0; i < this.hearts.length; i++) {
      const img = this.hearts[i];
      img.setVisible(i < max);
      img.setPosition(baseX + i * this.heartSpacing, y);
      img.setAlpha(i < current ? 1 : 0.25);
    }
  }

  setScore(v: number) {
    this.scoreText.setText(`Score: ${v}`);
  }
  setBossTimerText(t: string) {
    this.bossTimerText.setText(t);
  }

  setPowerUpLabel(text: string) {
    this.powerText.setText(text ? `POWER-UP: ${text}` : '');
  }
  clearPowerUpLabel() {
    this.powerText.setText('');
  }

  drawBossHpBar(current: number, max: number, centerX: number) {
    const ratio = Phaser.Math.Clamp(current / Math.max(1, max), 0, 1);
    const barW = 220,
      barH = 10;
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

    this.bossTimerText.setX(this.right - 12).setOrigin(1, 0);

    this.powerText.setX(this.right - 12).setOrigin(1, 0);

    if (this.hearts.length) {
      const baseX = this.left + 12;
      const y = 34;
      this.hearts.forEach((img, i) => {
        img.setPosition(baseX + i * this.heartSpacing, y);
      });
    }
    this.layoutGameOverOnResize();
  }

  showGameOver(score: number, onRestart: () => void) {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;

    this.goOverlay?.destroy();
    this.goOverlay = this.scene.add
      .rectangle(0, 0, W, H, 0x000000, 0.6)
      .setOrigin(0)
      .setDepth(999)
      .setScrollFactor(0);

    const cx = (this.left + this.right) / 2;
    const cy = H * 0.45;

    this.goPanel?.destroy();
    this.goPanel = this.scene.add.container(cx, cy).setDepth(1000).setScrollFactor(0);
    this.goPanel.setScale(0.6).setAlpha(0);

    const panelBg = this.scene.add
      .rectangle(0, 0, 440, 260, 0x0f141b, 1)
      .setStrokeStyle(2, 0x2b3a55, 1)
      .setOrigin(0.5)
      .setScrollFactor(0);

    const title = this.scene.add
      .text(0, -80, 'GAME OVER', {
        fontFamily: 'monospace',
        fontSize: '42px',
        color: '#FF5D73',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const scoreTxt = this.scene.add
      .text(0, -26, `Score: ${score}`, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#C2F970',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.goBtn?.destroy();
    this.goBtnLabel?.destroy();

    this.goBtn = this.scene.add
      .rectangle(0, 46, 220, 50, 0x1e293b, 1)
      .setStrokeStyle(2, 0x00e5ff)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    this.goBtnLabel = this.scene.add
      .text(0, 46, 'TRY AGAIN', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#00E5FF',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.goBtn
      .on('pointerover', () => this.goBtn!.setFillStyle(0x243244))
      .on('pointerout', () => this.goBtn!.setFillStyle(0x1e293b))
      .on('pointerup', () => {
        this.hideGameOver();
        onRestart();
      });

    this.goPanel.add([panelBg, title, scoreTxt, this.goBtn, this.goBtnLabel]);

    this.scene.tweens.add({
      targets: this.goPanel,
      scale: 1,
      alpha: 1,
      ease: 'Back.Out',
      duration: 240,
    });
  }

  hideGameOver() {
    this.goOverlay?.destroy();
    this.goOverlay = undefined;
    this.goPanel?.destroy();
    this.goPanel = undefined;
    this.goBtn?.destroy();
    this.goBtn = undefined;
    this.goBtnLabel?.destroy();
    this.goBtnLabel = undefined;
  }

  private layoutGameOverOnResize() {
    if (!this.goOverlay && !this.goPanel) return;
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;

    this.goOverlay?.setSize(W, H);

    const cx = (this.left + this.right) / 2;
    const cy = H * 0.45;
    this.goPanel?.setPosition(cx, cy);
  }
}
