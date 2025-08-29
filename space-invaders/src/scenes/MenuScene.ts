import Phaser from 'phaser';

import { CFG } from '../config';

type MenuMode = 'start' | 'pause';
type MenuData = { mode?: MenuMode };
type AnySound = Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;
type ParticleManager = ReturnType<Phaser.GameObjects.GameObjectFactory['particles']>;

export class MenuScene extends Phaser.Scene {
  private mode: MenuMode = 'start';

  private overlay?: Phaser.GameObjects.Rectangle;
  private panel?: Phaser.GameObjects.Container;

  private musicBtnRect?: Phaser.GameObjects.Rectangle;
  private musicBtnLabel?: Phaser.GameObjects.DOMElement;
  private primaryBtnRect?: Phaser.GameObjects.Rectangle;
  private primaryBtnLabel?: Phaser.GameObjects.DOMElement;
  private starsSlow?: ParticleManager;
  private starsFast?: ParticleManager;

  private bgmMuted = false;

  constructor() {
    super({ key: 'MenuScene', active: true });
  }

  preload() {
    if (!this.textures.exists('powerup_logo')) {
      this.load.svg('powerup_logo', 'assets/images/logo-white.svg', { width: 24, height: 24 });
    }
  }

  init(data: MenuData) {
    this.mode = data?.mode ?? 'start';
  }

  create() {
    this.cameras.main.setRoundPixels(false);

    const fromLS = localStorage.getItem('bgmMuted');
    this.bgmMuted = fromLS === 'true';

    const bgm = this.sound.get('bgm') as AnySound | null;
    if (bgm) bgm.setVolume(this.bgmMuted ? 0 : 0.05);

    this.createStarfield();

    const W = this.scale.width;
    const H = this.scale.height;

    this.overlay?.destroy();
    this.overlay = this.add
      .rectangle(0, 0, W, H, 0x000000, 0.6)
      .setOrigin(0)
      .setDepth(999)
      .setScrollFactor(0);

    const cx = W / 2;
    const cy = H * 0.45;

    const PW = Math.min(520, Math.floor(W * 0.8));
    const PH = this.mode === 'start' ? 360 : 260;

    this.panel?.destroy();
    this.panel = this.add.container(cx, cy).setDepth(1000).setScrollFactor(0);
    this.panel.setScale(0.84).setAlpha(0);

    const panelBg = this.add
      .rectangle(0, 0, PW, PH, 0x1e293b, 1)
      .setOrigin(0.5)
      .setStrokeStyle(3, 0x243244);

    this.panel.add(panelBg);
    const paddingTop = 18;
    let curY = -PH / 2 + paddingTop;

    const titleHtml = `
      <div style="
        font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', Arial, sans-serif;
        font-weight: 800;
        font-size: 24px;
        line-height: 1.1;
        letter-spacing: 1.1px;
        color: #C2F970;
        text-align: center;
        margin: 0;
      ">
        ${this.mode === 'start' ? 'WELCOME, CAPTAIN!' : 'PAUSED'}
      </div>
    `;
    const titleDom = this.add.dom(0, curY).createFromHTML(titleHtml).setOrigin(0.5, 0);
    this.panel.add(titleDom);

    const msgLinesStart = [
      'Start your space adventure!',
      'Control the spaceship with keys ← and →.',
      'Pause the game with ESC or P key.',
      'Look out for power-ups — they will help you a lot!',
    ];
    const msgLinesPause = [
      'You paused the game.',
      'Control the spaceship with keys ← and →.',
      'Continue to look out for power-ups!',
    ];

    const msgLines = this.mode === 'start' ? msgLinesStart : msgLinesPause;

    const titleH = (titleDom.node as HTMLElement).offsetHeight;
    const gapAfterTitle = msgLines.length <= 3 ? 0 : 6;
    curY += titleH + gapAfterTitle;

    const msgHtml = `
  <div style="
    display:inline-block;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', Arial, sans-serif;
    font-weight: 600;
    font-size: 15px;
    line-height: 1.38;
    color: #B7C3D7;
    text-align: center;
    max-width: ${PW - 48}px;
    margin: 0 auto;
    white-space: pre-line;
  ">
    ${msgLines.join('\n')}
  </div>
`;
    const msgDom = this.add.dom(0, curY).createFromHTML(msgHtml).setOrigin(0.5, 0);
    this.panel.add(msgDom);
    curY += (msgDom.node as HTMLElement).offsetHeight + 10;

    const logo = this.add.image(0, curY, 'powerup_logo').setOrigin(0.5, 0);
    logo.setDisplaySize(22, 22);
    this.panel.add(logo);
    curY += 28;

    const BTN_H1 = 48;
    const BTN_H2 = 42;
    const GAP_AFTER_LOGO = 24;
    const GAP_BETWEEN_BTNS = 14;

    const primaryBtnY = logo.y + logo.displayHeight + GAP_AFTER_LOGO + BTN_H1 / 2;
    const musicBtnY = primaryBtnY + BTN_H1 / 2 + GAP_BETWEEN_BTNS + BTN_H2 / 2;

    const bottomPad = 22;
    const maxPrimaryCenterY = PH / 2 - bottomPad - BTN_H1 / 2 - GAP_BETWEEN_BTNS - BTN_H2 - 2;
    const shift = Math.min(0, maxPrimaryCenterY - primaryBtnY);
    const finalPrimaryBtnY = primaryBtnY + shift;
    const finalMusicBtnY = musicBtnY + shift;

    this.primaryBtnRect = this.add
      .rectangle(0, finalPrimaryBtnY, PW - 32, BTN_H1, 0x1e293b, 1)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x00e5ff)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.primaryBtnRect!.setFillStyle(0x243244))
      .on('pointerout', () => this.primaryBtnRect!.setFillStyle(0x1e293b))
      .on('pointerup', () => this.onPrimary());

    this.musicBtnRect = this.add
      .rectangle(0, finalMusicBtnY, PW - 32, BTN_H2, 0x1e293b, 1)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0xffd166)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.musicBtnRect!.setFillStyle(0x243244))
      .on('pointerout', () => this.musicBtnRect!.setFillStyle(0x1e293b))
      .on('pointerup', () => this.toggleMusic());

    this.primaryBtnLabel = this.add
      .dom(0, finalPrimaryBtnY)
      .createFromHTML(
        `
  <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', Arial, sans-serif; font-weight:700; font-size:18px; letter-spacing:.6px; color:#00E5FF; text-align:center; pointer-events:none;">START</div>
`,
      )
      .setOrigin(0.5);

    this.setDomText(this.primaryBtnLabel, this.mode === 'start' ? 'START' : 'RESUME');

    this.musicBtnLabel = this.add
      .dom(0, finalMusicBtnY)
      .createFromHTML(
        `
  <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', Arial, sans-serif; font-weight:700; font-size:16px; letter-spacing:.6px; color:#FFD166; text-align:center; pointer-events:none;">MUSIC: ${this.bgmMuted ? 'OFF' : 'ON'}</div>
`,
      )
      .setOrigin(0.5);

    this.panel.add([
      this.primaryBtnRect,
      this.musicBtnRect,
      this.primaryBtnLabel,
      this.musicBtnLabel,
    ]);

    this.tweens.add({
      targets: this.panel,
      scale: 0.92,
      alpha: 1,
      ease: 'Back.Out',
      duration: 220,
    });

    this.scale.on('resize', this.onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.onResize);
    });

    this.input.keyboard?.once('keydown-ESC', () => {
      if (this.mode === 'pause') this.onPrimary();
    });
  }

  private createStarfield() {
    if (!this.textures.exists('star1') || !this.textures.exists('star2')) {
      const g = this.add.graphics();
      g.clear().fillStyle(0xffffff, 1).fillRect(0, 0, 1, 1);
      g.generateTexture('star1', 1, 1);
      g.clear().fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2);
      g.generateTexture('star2', 2, 2);
      g.destroy();
    }

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    const gutterX = Math.max(CFG.gutterX, Math.round(W * 0.12));
    const pfLeft = gutterX;
    const pfRight = W - gutterX;

    this.starsSlow?.destroy();
    this.starsFast?.destroy();

    this.starsSlow = this.add.particles(0, 0, 'star1', {
      x: { min: pfLeft, max: pfRight },
      y: -10,
      speedY: { min: 20, max: 45 },
      lifespan: 8000,
      quantity: 2,
      frequency: 70,
      alpha: { start: 0.8, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
    });
    this.starsSlow.setDepth(-10);

    this.starsFast = this.add.particles(0, 0, 'star2', {
      x: { min: pfLeft, max: pfRight },
      y: -10,
      speedY: { min: 80, max: 130 },
      lifespan: 4500,
      quantity: 1,
      frequency: 40,
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
    });
    this.starsFast.setDepth(-9);

    for (let i = 0; i < 60; i++)
      this.starsSlow.emitParticleAt(
        Phaser.Math.Between(pfLeft, pfRight),
        Phaser.Math.Between(0, H),
      );
    for (let i = 0; i < 40; i++)
      this.starsFast.emitParticleAt(
        Phaser.Math.Between(pfLeft, pfRight),
        Phaser.Math.Between(0, H),
      );
  }

  private onResize = () => {
    const W = this.scale.width;
    const H = this.scale.height;

    this.overlay?.setSize(W, H);
    this.panel?.setPosition(W / 2, H * 0.45);

    this.createStarfield();
  };

  private onPrimary() {
    if (this.mode === 'start') {
      this.scene.stop();
      this.scene.start('GameScene', { bgmMuted: this.bgmMuted });
    } else {
      this.scene.stop();
      this.scene.resume('GameScene');
    }
  }

  private toggleMusic() {
    this.bgmMuted = !this.bgmMuted;
    localStorage.setItem('bgmMuted', String(this.bgmMuted));

    const bgm = this.sound.get('bgm') as AnySound | null;
    if (bgm) bgm.setVolume(this.bgmMuted ? 0 : 0.05);

    this.setDomText(this.musicBtnLabel, `MUSIC: ${this.bgmMuted ? 'OFF' : 'ON'}`);

    this.musicBtnLabel?.updateSize();
    if (this.musicBtnRect) this.musicBtnLabel?.setPosition(0, this.musicBtnRect.y);
  }

  private domContentEl(dom?: Phaser.GameObjects.DOMElement): HTMLElement | null {
    if (!dom) return null;
    const root = dom.node as HTMLElement;
    return (root.firstElementChild as HTMLElement) ?? root;
  }
  private setDomText(dom: Phaser.GameObjects.DOMElement | undefined, text: string) {
    const el = this.domContentEl(dom);
    if (el) el.textContent = text;
  }
}
