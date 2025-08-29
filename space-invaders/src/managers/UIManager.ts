import Phaser from 'phaser';

export class UIManager {
  private scene: Phaser.Scene;
  private bossHpBar?: Phaser.GameObjects.Graphics;
  private scoreDom?: Phaser.GameObjects.DOMElement;
  private bossTimerDom?: Phaser.GameObjects.DOMElement;
  private powerDom?: Phaser.GameObjects.DOMElement;
  private hearts: Phaser.GameObjects.Image[] = [];
  private heartSpacing = 22;
  private left = 0;
  private right = 0;
  private goOverlay?: Phaser.GameObjects.Rectangle;
  private goPanel?: Phaser.GameObjects.Container;
  private goBtn?: Phaser.GameObjects.Rectangle;
  private goBtnLabel?: Phaser.GameObjects.DOMElement;

  constructor(scene: Phaser.Scene, left: number, right: number) {
    this.scene = scene;
    this.left = left;
    this.right = right;

    this.scoreDom = scene.add
      .dom(left + 12, 10)
      .createFromHTML(
        `
    <div style="
      display:inline-block;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', Arial, sans-serif;
      font-weight: 800;
      font-size: 20px;
      color: #C2F970;
      text-align: left;
      white-space: nowrap;
      pointer-events: none;
    ">Score: 0</div>
  `,
      )
      .setOrigin(0, 0)
      .setDepth(10)
      .setScrollFactor(0);

    this.bossTimerDom = scene.add
      .dom(right - 12, 10)
      .createFromHTML(
        `
    <div style="
      display:inline-block;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', Arial, sans-serif;
      font-weight: 800;
      font-size: 20px;
      color: #00E5FF;
      text-align: right;
      white-space: nowrap;
      pointer-events: none;
    ">Boss in: 25s</div>
  `,
      )
      .setOrigin(0, 0)
      .setDepth(10)
      .setScrollFactor(0);

    this.powerDom = scene.add
      .dom(right - 12, 34)
      .createFromHTML(
        `
    <div style="
      display:inline-block;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', Arial, sans-serif;
      font-weight: 700;
      font-size: 14px;
      color: #FFD166;
      text-align: right;
      white-space: nowrap;
      pointer-events: none;
    "></div>
  `,
      )
      .setOrigin(0, 0)
      .setDepth(10)
      .setScrollFactor(0);
  }

  setLives(current: number, max: number) {
    for (let i = this.hearts.length; i < max; i++) {
      const img = this.scene.add
        .image(0, 0, 'heart')
        .setOrigin(0, 0)
        .setDisplaySize(22, 20)
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
    const el = this.domContentEl(this.scoreDom);
    if (!el || !this.scoreDom) return;
    el.textContent = `Score: ${v}`;
    this.layoutHudDom();
  }

  setBossTimerText(t: string) {
    const el = this.domContentEl(this.bossTimerDom);
    if (!el || !this.bossTimerDom) return;
    el.textContent = t;
    this.layoutHudDom();
  }

  setPowerUpLabel(text: string) {
    const el = this.domContentEl(this.powerDom);
    if (!el || !this.powerDom) return;
    el.textContent = text ? `POWER-UP: ${text}` : '';
    this.layoutHudDom();
  }

  clearPowerUpLabel() {
    this.setPowerUpLabel('');
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

    this.scoreDom
      ?.updateSize()
      .setOrigin(0, 0)
      .setPosition(this.left + 12, 10);
    this.bossTimerDom
      ?.updateSize()
      .setOrigin(1, 0)
      .setPosition(this.right - 12, 10);
    this.powerDom
      ?.updateSize()
      .setOrigin(1, 0)
      .setPosition(this.right - 12, 34);

    if (this.hearts.length) {
      const baseX = this.left + 12;
      const y = 34;
      this.hearts.forEach((img, i) => {
        img.setPosition(baseX + i * this.heartSpacing, y);
      });
    }
    this.layoutHudDom();
    this.layoutGameOverOnResize();
  }

  showGameOver(score: number, onRestart: () => void) {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;

    this.scene.cameras.main.setRoundPixels(false);

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
      .rectangle(0, 0, 460, 270, 0x0f141b, 1)
      .setStrokeStyle(2, 0x2b3a55, 1)
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.goPanel.add(panelBg);

    const titleDom = this.scene.add
      .dom(0, -82)
      .createFromHTML(
        `
      <div style="
        display:inline-block;
        font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', Arial, sans-serif;
        font-weight: 800;
        font-size: 28px;
        line-height: 1.1;
        letter-spacing: 1.1px;
        color: #FF5D73;
        text-align: center;
        margin: 0;
        pointer-events: none;
      ">GAME OVER</div>
    `,
      )
      .setOrigin(0.5, 0);

    const scoreDom = this.scene.add
      .dom(0, -30)
      .createFromHTML(
        `
      <div style="
        display:inline-block;
        font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', Arial, sans-serif;
        font-weight: 700;
        font-size: 18px;
        color: #C2F970;
        text-align: center;
        margin: 0;
        pointer-events: none;
      ">Score: ${score}</div>
    `,
      )
      .setOrigin(0.5);

    this.goBtn?.destroy();
    this.goBtnLabel?.destroy();

    this.goBtn = this.scene.add
      .rectangle(0, 48, 240, 52, 0x1e293b, 1)
      .setStrokeStyle(2, 0x00e5ff)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.goBtn!.setFillStyle(0x243244))
      .on('pointerout', () => this.goBtn!.setFillStyle(0x1e293b))
      .on('pointerup', () => {
        this.hideGameOver();
        onRestart();
      });

    this.goBtnLabel = this.scene.add
      .dom(0, 48)
      .createFromHTML(
        `
      <div style="
        display:inline-block;
        font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', Arial, sans-serif;
        font-weight: 800;
        font-size: 18px;
        letter-spacing: .6px;
        color: #00E5FF;
        text-align: center;
        pointer-events: none;
      ">TRY AGAIN</div>
    `,
      )
      .setOrigin(0.5);

    this.goPanel.add([titleDom, scoreDom, this.goBtn, this.goBtnLabel]);

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

    this.scene.cameras.main.setRoundPixels(true);
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

  private layoutHudDom() {
    if (this.scoreDom) {
      this.scoreDom.updateSize();
      this.scoreDom.setOrigin(0, 0).setPosition(this.left + 12, 10);
    }

    if (this.bossTimerDom) {
      this.bossTimerDom.updateSize();
      const w = this.domContentWidth(this.bossTimerDom);
      this.bossTimerDom.setOrigin(0, 0).setPosition(this.right - 12 - w, 10);
    }

    if (this.powerDom) {
      this.powerDom.updateSize();
      const w = this.domContentWidth(this.powerDom);
      this.powerDom.setOrigin(0, 0).setPosition(this.right - 12 - w, 34);
    }
  }

  private domContentEl(dom?: Phaser.GameObjects.DOMElement): HTMLElement | null {
    if (!dom) return null;
    const root = dom.node as HTMLElement;
    return (root.firstElementChild as HTMLElement) ?? root;
  }

  private domContentWidth(dom?: Phaser.GameObjects.DOMElement): number {
    const el = this.domContentEl(dom);
    return el ? el.offsetWidth : 0;
  }
}
