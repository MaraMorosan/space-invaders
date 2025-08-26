export const CFG = {
  playerDamage: 2,
  autoFireMs: 180,
  waveEveryMs: 3000,
  waveBurstDelay: 220,
  waveCountMin: 3,
  waveCountMax: 5,
  bossCountdownStart: 25,
  gutterX: 150,
  bossSpawnY: 60,
  bossEntryInvulnMs: 1200,
  bossHitCooldownMs: 180,
  bossMinHits: 20,
  bossMinHitsGrowth: 6,

  bossHpMultiplierBase: 0.7,
  bossHpGrowthPerKill: 0.20,
  bossHpCapMultiplier: 3.0, 
  bossFireDelayFloor: 140,
  bossBulletSpeedBase: 200,
  bossBulletSpeedPerKill: 20,
  bossBulletSpeedCapKills: 12,
  enemyBulletPenaltyBase: 40,
  enemyBulletPenaltyPerKill: 4,  
};

export type EnemySpec = {
  key: string;
  hp: number;
  speed: [number, number];
  tint: number;
  score: number;
  scale?: number;
};

export const ENEMY_TYPES: EnemySpec[] = [
  { key: "enemy", hp: 1, speed: [90, 130], tint: 0xff3b3b, score: 10 },
  { key: "enemy", hp: 2, speed: [100, 140], tint: 0xffd93d, score: 20 },
  { key: "enemy", hp: 3, speed: [70, 110], tint: 0x7ae582, score: 30 },
];

export type BossSpec = {
  hp: number;
  tint: number;
  scale: number;
  speedX: number;
  speedY: number;
  fireDelay: number;
  fireWindowMs: number;
  firePauseMs: number;
};

export const BOSSES: BossSpec[] = [
  { hp: 50, tint: 0x8a2be2, scale: 2.0, speedX: 110, speedY: 24, fireDelay: 320, fireWindowMs: 1100, firePauseMs: 900 },
  { hp: 70, tint: 0x00e5ff, scale: 2.2, speedX: 90, speedY: 20, fireDelay: 260, fireWindowMs: 900, firePauseMs: 1100 },
  { hp: 90, tint: 0xff6b6b, scale: 2.3, speedX: 130, speedY: 18, fireDelay: 360, fireWindowMs: 1300, firePauseMs: 1000 },
];
