import Phaser from "phaser";
import { UIManager } from "./UIManager";

export type PowerUpType = "triple" | "quad" | "rapid";

export const POWERUP_CFG = {
  spawnEveryMs: 12000,
  durationMs: 6000,
  fallSpeed: [140, 180],
};

export class PowerUpManager {
  private scene: Phaser.Scene;
  private player: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  private bullets: Phaser.Physics.Arcade.Group;
  private ui: UIManager;
  private pfLeft: number;
  private pfRight: number;

  private crates: Phaser.Physics.Arcade.Group;
  private current?: { type: PowerUpType; until: number };

  constructor(
    scene: Phaser.Scene,
    player: Phaser.Types.Physics.Arcade.ImageWithDynamicBody,
    bullets: Phaser.Physics.Arcade.Group,
    ui: UIManager,
    pfLeft: number,
    pfRight: number
  ) {
    this.scene = scene;
    this.player = player;
    this.bullets = bullets;
    this.ui = ui;
    this.pfLeft = pfLeft;
    this.pfRight = pfRight;

    // if (!scene.textures.exists("crate")) {
    //   const g = scene.add.graphics();
    //   g.fillStyle(0xffe066, 1).fillRoundedRect(0, 0, 18, 18, 4);
    //   g.lineStyle(2, 0x4a3f35, 1).strokeRoundedRect(0, 0, 18, 18, 4);
    //   g.generateTexture("crate", 18, 18);
    //   g.destroy();
    // }

    this.crates = scene.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 3 });

    this.scene.time.delayedCall(0, () => {
        this.scene.physics.add.overlap(
            this.player,
            this.crates,
            (_p, c) => this.pickUp(c as Phaser.Physics.Arcade.Image),
            undefined,
            this
        );
    });

    scene.time.addEvent({
      delay: POWERUP_CFG.spawnEveryMs,
      loop: true,
      callback: () => this.spawnCrate(),
    });
  }

  private spawnCrate() {
    const x = Phaser.Math.Between(this.pfLeft + 30, this.pfRight - 30);
    const c = this.crates.get(x, -24, "crate") as Phaser.Physics.Arcade.Image | null;
    if (!c) return;
    c.setActive(true).setVisible(true);
    c.setVelocity(0, Phaser.Math.Between(POWERUP_CFG.fallSpeed[0], POWERUP_CFG.fallSpeed[1]));
    const types: PowerUpType[] = ["triple", "quad", "rapid"];
    const t = Phaser.Utils.Array.GetRandom(types);
    c.setData("type", t);
    const tint = t === "triple" ? 0x6df7c1 : t === "quad" ? 0x9bf6ff : 0xffd6a5;
    c.setTint(tint);
  }

  private pickUp(crate: Phaser.Physics.Arcade.Image) {
    const type = (crate.getData("type") as PowerUpType) ?? "triple";
    crate.destroy();

    this.current = { type, until: this.scene.time.now + POWERUP_CFG.durationMs };
    this.ui.setPowerUpLabel(type.toUpperCase());

    this.scene.time.delayedCall(POWERUP_CFG.durationMs + 50, () => {
      if (this.current && this.scene.time.now >= this.current.until) {
        this.current = undefined;
        this.ui.clearPowerUpLabel();
      }
    });
  }

  shoot() {
    const now = this.scene.time.now;
    if (!this.current || now >= this.current.until) {
      this.current = undefined;
      this.ui.clearPowerUpLabel();
      return this.fireStraight();
    }

    switch (this.current.type) {
      case "triple":
        return this.fireSpread(3, 12);
      case "quad":
        return this.fireSpread(4, 16);
      case "rapid":
        this.fireStraight();
        this.scene.time.delayedCall(55, () => this.fireStraight());
        return;
      default:
        return this.fireStraight();
    }
  }

  private fireStraight() {
    const b = this.bullets.get(this.player.x, this.player.y - 28, "bullet") as Phaser.Physics.Arcade.Image | null;
    if (!b) return;
    b.setActive(true).setVisible(true);
    b.setVelocity(0, -520);
  }

  private fireSpread(count: number, halfAngle: number) {
    const baseSpeed = 520;
    const angles: number[] = [];

    if (count === 3) angles.push(-halfAngle, 0, halfAngle);
    else if (count === 4) angles.push(-halfAngle * 1.5, -halfAngle * 0.5, halfAngle * 0.5, halfAngle * 1.5);
    else angles.push(0);

    for (const a of angles) {
      const rad = Phaser.Math.DegToRad(a);
      const vx = baseSpeed * Math.sin(rad);
      const vy = -baseSpeed * Math.cos(rad);
      const b = this.bullets.get(this.player.x, this.player.y - 28, "bullet") as Phaser.Physics.Arcade.Image | null;
      if (!b) continue;
      b.setActive(true).setVisible(true);
      b.setVelocity(vx, vy);
      b.setAngle(-a);
    }
  }

  update() {
    const H = this.scene.scale.height;
    this.crates.children.iterate((obj: Phaser.GameObjects.GameObject | null) => {
      const c = obj as Phaser.Physics.Arcade.Image;
      if (!c || !c.active) return false;
      if (c.y > H + 30) c.destroy();
      return false;
    });
  }
}
