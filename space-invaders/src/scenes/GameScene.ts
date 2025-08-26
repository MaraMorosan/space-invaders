import Phaser from "phaser";
import { CFG } from "../config";
import { UIManager } from "../managers/UIManager";
import { WaveManager } from "../managers/WaveManager";
import { BossManager } from "../managers/BossManager";
import { PowerUpManager } from "../managers/PowerUpManager";

export default class GameScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private bullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;

  private score = 0;
  private ui!: UIManager;

  private pfLeft = 0;
  private pfRight = 0;

  private waveMgr!: WaveManager;
  private bossMgr!: BossManager;

  private bossCountdown = CFG.bossCountdownStart;

	private powerUpMgr!: PowerUpManager;

  constructor() { super("GameScene"); }

  preload() {
    this.load.svg("player", "/assets/images/player.svg");
    this.load.svg("enemy", "/assets/images/enemy.svg");
    this.load.svg("boss",  "/assets/images/enemy.svg");

    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 10);
    g.generateTexture("bullet", 2, 10);
    g.destroy();
  }

  create() {
   const W = this.scale.width, H = this.scale.height;
		this.pfLeft = CFG.gutterX;
		this.pfRight = W - CFG.gutterX;

		const gutter = this.add.graphics().setDepth(5);
		gutter.fillStyle(0x05070b, 1);
		gutter.fillRect(0, 0, this.pfLeft, H);
		gutter.fillRect(this.pfRight, 0, W - this.pfRight, H);
		this.physics.world.setBounds(this.pfLeft, 0, this.pfRight - this.pfLeft, H, true, true, true, true);

		this.player = this.physics.add.image((this.pfLeft + this.pfRight) / 2, H - 70, "player");
		this.player.setCollideWorldBounds(true);
		this.player.setCircle(16, 8, 8);
		this.player.setMaxVelocity(420);

		this.cursors = this.input.keyboard!.createCursorKeys();

		this.bullets      = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 120 });
		this.enemies      = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 200 });
		this.enemyBullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 120 });

		this.ui = new UIManager(this, this.pfLeft, this.pfRight);

		this.powerUpMgr = new PowerUpManager(this, this.player, this.bullets, this.ui, this.pfLeft, this.pfRight);

		this.time.addEvent({ delay: CFG.autoFireMs, loop: true, callback: () => this.shoot() });

		this.waveMgr = new WaveManager(this, this.enemies, this.pfLeft, this.pfRight);
		this.waveMgr.start();

		this.bossMgr = new BossManager(this, this.player, this.bullets, this.enemyBullets, this.ui, this.pfLeft, this.pfRight);

    this.physics.add.overlap(
      this.bullets, this.enemies,
      (bullet, enemy) => this.hitEnemy(bullet as Phaser.Physics.Arcade.Image, enemy as Phaser.Physics.Arcade.Image)
    );

    this.physics.add.overlap(
      this.player, this.enemies,
      (_player, enemy) => {
        (enemy as Phaser.Physics.Arcade.Image).destroy();
        this.cameras.main.shake(120, 0.01);
        this.addScore(-25);
      }
    );

    this.physics.add.overlap(
      this.player, this.enemyBullets,
      (_player, ebullet) => {
        (ebullet as Phaser.Physics.Arcade.Image).destroy();
        this.cameras.main.shake(150, 0.012);
        this.addScore(-40);
      }
    );

    this.ui.setBossTimerText(`Boss in: ${this.bossCountdown}s`);
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.bossMgr.active) return;
        this.bossCountdown--;
        if (this.bossCountdown <= 0) {
          this.bossMgr.spawn(() => this.waveMgr.pause());
          this.bossCountdown = CFG.bossCountdownStart;
        } else {
          this.ui.setBossTimerText(`Boss in: ${this.bossCountdown}s`);
        }
      },
    });
  }

  private addScore(delta: number) {
    this.score = Math.max(0, this.score + delta);
    this.ui.setScore(this.score);
  }

  private shoot() {
    this.powerUpMgr.shoot();
  }

  private hitEnemy(bullet: Phaser.Physics.Arcade.Image, enemy: Phaser.Physics.Arcade.Image) {
    if ((enemy as any).getData?.("__isBoss") || enemy === this.bossMgr.boss) return;

    bullet.destroy();
    const hp = (enemy.getData("hp") as number) - 1;
    enemy.setData("hp", hp);
    this.addScore(2);
    if (hp <= 0) {
      const sc = enemy.getData("score") as number | undefined;
      enemy.destroy();
      this.addScore(sc ?? 10);
    }
  }

	private pruneGroup(
		group: Phaser.Physics.Arcade.Group,
		isOut: (o: Phaser.Physics.Arcade.Image) => boolean
	) {
		(group.getChildren() as Phaser.GameObjects.GameObject[]).forEach((obj) => {
			const go = obj as Phaser.Physics.Arcade.Image;
			if (go.active && isOut(go)) go.destroy();
		});
	}

  update() {
    const speed = 420;
    this.player.setVelocity(0);
    if (this.cursors.left?.isDown) this.player.setVelocityX(-speed);
    else if (this.cursors.right?.isDown) this.player.setVelocityX(speed);

		this.pruneGroup(this.enemies,      e  => e.y > this.scale.height + 40);
		this.pruneGroup(this.bullets,      b  => b.y < -20);
		this.pruneGroup(this.enemyBullets, eb => eb.y > this.scale.height + 20);

    this.bossMgr.update();

    if (!this.bossMgr.active) this.waveMgr.resume();
  }
}
