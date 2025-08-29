import Phaser from 'phaser';

import { BOSSES, CFG } from '../config';
import { freezeBodyFor, getFxTint, safeDestroyGroup, setFxTint } from '../utils/phaserHelpers';
import { EffectsManager } from './EffectsManager';
import { UIManager } from './UIManager';

type SfxBank = {
  bossFire: { play: (volMul?: number) => void };
  enemyDestroyed: { play: (volMul?: number) => void };
};

export class BossManager {
  public boss?: Phaser.Physics.Arcade.Image;
  public bossGroup: Phaser.Physics.Arcade.Group;

  public active = false;
  public kills = 0;

  private scene: Phaser.Scene;
  private player: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  private bullets: Phaser.Physics.Arcade.Group;
  private enemyBullets: Phaser.Physics.Arcade.Group;
  private ui: UIManager;
  private pfLeft: number;
  private pfRight: number;

  private invulnUntil = 0;
  private lastHitAt = 0;
  private hp = 0;
  private maxHp = 0;
  private shooting = false;
  private shootEvent?: Phaser.Time.TimerEvent;
  private fireToggleEvent?: Phaser.Time.TimerEvent;
  private finishing = false;
  private fx?: EffectsManager;
  private sfx?: SfxBank;

  constructor(
    scene: Phaser.Scene,
    player: Phaser.Types.Physics.Arcade.ImageWithDynamicBody,
    bullets: Phaser.Physics.Arcade.Group,
    enemyBullets: Phaser.Physics.Arcade.Group,
    ui: UIManager,
    pfLeft: number,
    pfRight: number,
    fx?: EffectsManager,
  ) {
    this.scene = scene;
    this.player = player;
    this.bullets = bullets;
    this.enemyBullets = enemyBullets;
    this.ui = ui;
    this.pfLeft = pfLeft;
    this.pfRight = pfRight;
    this.fx = fx;

    this.bossGroup = this.scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 1,
    });

    this.scene.physics.add.overlap(
      this.bullets,
      this.bossGroup,
      (bullet, b) => {
        if (!this.boss || b !== this.boss) return;
        this.hitBoss(bullet as Phaser.Physics.Arcade.Image, b as Phaser.Physics.Arcade.Image);
      },
      undefined,
      this,
    );
  }

  public setFx(fx: EffectsManager) {
    this.fx = fx;
  }
  public setSfx(sfx: SfxBank) {
    this.sfx = sfx;
  }

  spawn(onSpawn?: () => void) {
    if (this.active) return;
    if (this.boss || this.bossGroup.countActive(true) > 0) return;
    this.active = true;

    const spec = Phaser.Utils.Array.GetRandom(BOSSES);
    const cx = (this.pfLeft + this.pfRight) / 2;

    const boss = this.bossGroup.get(
      cx,
      CFG.bossSpawnY,
      spec.key,
    ) as Phaser.Physics.Arcade.Image | null;
    if (!boss) {
      this.active = false;
      return;
    }

    boss.setActive(true).setVisible(true);
    boss.setData('__isBoss', true).setName('BOSS');

    boss.clearTint();
    if (typeof spec.fxTint === 'number') {
      setFxTint(boss, spec.fxTint);
    }
    boss.setDepth(50);

    const body = boss.body as Phaser.Physics.Arcade.Body;
    body.setSize(boss.displayWidth, boss.displayHeight, true);
    body.setEnable(true);
    body.setAllowGravity(false);

    boss.setCollideWorldBounds(false);
    boss.setBounce(0, 1);

    const fieldW = this.pfRight - this.pfLeft - boss.displayWidth;
    const tCross = 2.2;
    const safeVx = Math.max(80, Math.min(spec.speedX, fieldW / Math.max(tCross, 0.8)));

    const dir = Phaser.Math.Between(0, 1) ? 1 : -1;
    body.setVelocity(safeVx * dir, spec.speedY);
    body.maxVelocity.x = safeVx;

    const mult = Math.min(
      CFG.bossHpMultiplierBase + this.kills * CFG.bossHpGrowthPerKill,
      CFG.bossHpCapMultiplier,
    );
    const minHits = CFG.bossMinHits + this.kills * CFG.bossMinHitsGrowth;
    const hpScaled = Math.max(Math.round(spec.hp * mult), minHits);
    this.hp = this.maxHp = hpScaled;
    boss.setData('hp', this.hp);

    this.boss = boss;
    this.invulnUntil = this.scene.time.now + CFG.bossEntryInvulnMs;
    this.lastHitAt = 0;

    this.ui.setBossTimerText('Boss: ONLINE');
    this.ui.drawBossHpBar(this.hp, this.maxHp, (this.pfLeft + this.pfRight) / 2);

    const fireDelay = Math.max(
      CFG.bossFireDelayFloor,
      Math.round(spec.fireDelay * Math.pow(0.92, this.kills)),
    );
    this.shooting = true;
    this.fireToggleEvent?.remove(false);
    this.fireToggleEvent = this.scene.time.addEvent({
      delay: spec.fireWindowMs + spec.firePauseMs,
      loop: true,
      callback: () => (this.shooting = !this.shooting),
    });
    this.shootEvent?.remove(false);
    this.shootEvent = this.scene.time.addEvent({
      delay: fireDelay,
      loop: true,
      callback: () => {
        if (this.boss && this.boss.active && this.shooting) this.fireBossBullet();
      },
    });

    boss.once(Phaser.GameObjects.Events.DESTROY, () => {
      if (this.finishing) return;
      if (!this.active) return;
      this.finish(false);
    });

    onSpawn?.();
  }

  finish(defeated = false) {
    if (this.finishing) return;
    this.finishing = true;

    const dyingBoss = this.boss;
    this.active = false;
    this.boss = undefined;

    if (dyingBoss && dyingBoss.active) {
      dyingBoss.destroy();
    }

    this.ui.clearBossHpBar();
    this.shootEvent?.remove(false);
    this.fireToggleEvent?.remove(false);
    this.shootEvent = undefined;
    this.fireToggleEvent = undefined;

    if (defeated) {
      this.kills++;
      this.ui.setBossTimerText('Boss defeated!');
      this.scene.cameras.main.shake(220, 0.008);
      this.sfx?.enemyDestroyed.play();
    }

    this.hp = 0;
    this.maxHp = 0;
    this.finishing = false;
  }

  hitBoss(bullet: Phaser.Physics.Arcade.Image, boss: Phaser.Physics.Arcade.Image) {
    bullet.destroy();
    if (!this.boss || boss !== this.boss) return;
    if (!boss.active) return;
    if (this.hp <= 0 || this.maxHp <= 0) return;

    const now = this.scene.time.now;
    if (now < this.invulnUntil) return;
    if (now - this.lastHitAt < CFG.bossHitCooldownMs) return;
    this.lastHitAt = now;

    this.hp -= CFG.playerDamage;
    boss.setData('hp', this.hp);

    boss.setAlpha(0.6);
    this.scene.tweens.add({ targets: boss, alpha: 1, duration: 80, ease: 'Linear' });

    if (this.hp <= 0) {
      const x = boss.x,
        y = boss.y;
      const tint = getFxTint(boss, 0xffffff);

      freezeBodyFor(this.scene, this.player.body as Phaser.Physics.Arcade.Body, 150);

      this.fx?.explodeBoss(x, y, tint, { power: 1.35 });
      this.scene.time.delayedCall(0, () => this.finish(true));
      return;
    }

    this.ui.drawBossHpBar(this.hp, this.maxHp, (this.pfLeft + this.pfRight) / 2);
  }

  update() {
    if (!this.boss) return;
    const b = this.boss;
    const body = b.body as Phaser.Physics.Arcade.Body;

    const capY = this.player.y - 110;
    if (b.y > capY) {
      b.y = capY;
      body.velocity.y = -Math.abs(body.velocity.y) || -100;
    }

    const half = b.displayWidth * 0.5;
    const left = this.pfLeft + half;
    const right = this.pfRight - half;

    if (b.x < left) {
      b.x = left;
      body.setVelocityX(Math.abs(body.velocity.x) || 100);
    } else if (b.x > right) {
      b.x = right;
      body.setVelocityX(-Math.abs(body.velocity.x) || -100);
    }

    if (Math.abs(body.velocity.x) < 10) {
      const kick = (Phaser.Math.Between(0, 1) ? 1 : -1) * (body.maxVelocity.x || 120);
      body.setVelocityX(kick);
    }
  }

  private fireBossBullet() {
    if (!this.boss) return;
    const b = this.enemyBullets.get(
      this.boss.x,
      this.boss.y + 28,
      'bullet',
    ) as Phaser.Physics.Arcade.Image | null;
    if (!b) return;
    b.setActive(true).setVisible(true);
    b.setTint(0xfff38a);
    const k = Math.min(this.kills, CFG.bossBulletSpeedCapKills);
    const speed = CFG.bossBulletSpeedBase + k * CFG.bossBulletSpeedPerKill;
    b.setVelocity(0, speed);
    b.setAngle(180);
    this.sfx?.bossFire.play();
  }

  setBounds(left: number, right: number) {
    this.pfLeft = left;
    this.pfRight = right;
  }

  get hpCurrent() {
    return this.hp;
  }
  get hpMax() {
    return this.maxHp;
  }

  public destroy() {
    this.fireToggleEvent?.remove(false);
    this.shootEvent?.remove(false);
    this.fireToggleEvent = undefined;
    this.shootEvent = undefined;

    safeDestroyGroup(this.bossGroup);
    this.boss = undefined;
    this.active = false;
  }

  public stopAll() {
    this.fireToggleEvent?.remove(false);
    this.shootEvent?.remove(false);
    this.fireToggleEvent = undefined;
    this.shootEvent = undefined;
  }
}
