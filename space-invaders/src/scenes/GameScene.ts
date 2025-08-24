import Phaser from "phaser";

export default class GameScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private shootKey!: Phaser.Input.Keyboard.Key;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private lastShot = 0;
  private score = 0;
  private scoreText!: Phaser.GameObjects.Text;

  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.svg("player", "/assets/images/player.svg");
    this.load.svg("enemy", "/assets/images/enemy.svg");

    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 2, 10);
    g.generateTexture("bullet", 2, 10);
    g.destroy();

    // this.load.audio("shoot", "/assets/sfx/shoot.ogg");
    // this.load.audio("boom",  "/assets/sfx/boom.ogg");
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    // Player
    this.player = this.physics.add.image(w / 2, h - 70, "player");
    this.player.setCollideWorldBounds(true);
    this.player.setCircle(16, 8, 8);
    this.player.setMaxVelocity(380);

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.shootKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Grupuri
    this.bullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 80,
      runChildUpdate: false,
    });

    this.enemies = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 200,
      runChildUpdate: false,
    });

    this.time.addEvent({
      delay: 700,
      loop: true,
      callback: () => {
        const x = Phaser.Math.Between(40, w - 40);
        const e = this.enemies.get(x, -30, "enemy") as Phaser.Physics.Arcade.Image | null;
        if (!e) return;
        e.setActive(true).setVisible(true);
        e.setVelocity(0, Phaser.Math.Between(90, 160));
        e.setData("hp", 1);
      },
    });

    this.physics.add.overlap(
      this.bullets,
      this.enemies,
      (bullet, enemy) => {
        (bullet as Phaser.Physics.Arcade.Image).destroy();
        (enemy as Phaser.Physics.Arcade.Image).destroy();
        this.addScore(10);
        // this.sound.play("boom", { volume: 0.5 });
      }
    );

    this.physics.add.overlap(
      this.player,
      this.enemies,
      (_player, enemy) => {
        (enemy as Phaser.Physics.Arcade.Image).destroy();
        this.cameras.main.shake(100, 0.01);
        this.addScore(-25);
      }
    );

    this.scoreText = this.add.text(12, 10, "Score: 0", {
      fontFamily: "monospace",
      fontSize: "20px",
      color: "#C2F970",
    }).setDepth(10).setScrollFactor(0);
  }

  private addScore(delta: number) {
    this.score = Math.max(0, this.score + delta);
    this.scoreText.setText(`Score: ${this.score}`);
  }

  private shoot() {
    const now = this.time.now;
    if (now - this.lastShot < 130) return;
    this.lastShot = now;

    const b = this.bullets.get(this.player.x, this.player.y - 28, "bullet") as Phaser.Physics.Arcade.Image | null;
    if (!b) return;
    b.setActive(true).setVisible(true);
    b.setVelocity(0, -520);
    // this.sound.play("shoot", { volume: 0.4 });
  }

  update(_time: number, _delta: number) {
    const speed = 420;
    this.player.setVelocity(0);

    if (this.cursors.left?.isDown) {
      this.player.setVelocityX(-speed);
    } else if (this.cursors.right?.isDown) {
      this.player.setVelocityX(speed);
    }

    if (Phaser.Input.Keyboard.JustDown(this.shootKey)) {
      this.shoot();
    }

    (this.enemies.getChildren() as Phaser.GameObjects.GameObject[]).forEach((child) => {
      const e = child as Phaser.Physics.Arcade.Image;
      if (e.active && e.y > this.scale.height + 40) e.destroy();
    });

    (this.bullets.getChildren() as Phaser.GameObjects.GameObject[]).forEach((child) => {
      const b = child as Phaser.Physics.Arcade.Image;
      if (b.active && b.y < -20) b.destroy();
    });
  }
}
