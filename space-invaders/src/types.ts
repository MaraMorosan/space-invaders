export type EnemySpec = {
  key: string;
  hp: number;
  speed: [number, number];
  tint: number;
  score: number;
  scale?: number;
};

export type BossSpec = {
  key: string;
  hp: number;
  tint?: number;
  scale: number;
  speedX: number;
  speedY: number;
  fireDelay: number;
  fireWindowMs: number;
  firePauseMs: number;
};

export const ENEMY_TYPES: EnemySpec[] = [
  { key: 'enemy_small', hp: 1, speed: [90, 130], tint: 0xff3b3b, score: 10 },
  { key: 'enemy_fast', hp: 2, speed: [100, 140], tint: 0xffd93d, score: 20 },
  { key: 'enemy_tank', hp: 3, speed: [70, 110], tint: 0x7ae582, score: 30 },
];

export const BOSSES: BossSpec[] = [
  {
    key: 'boss_beetle',
    hp: 50,
    tint: 0x8a2be2,
    scale: 2.0,
    speedX: 110,
    speedY: 24,
    fireDelay: 320,
    fireWindowMs: 1100,
    firePauseMs: 900,
  },
  {
    key: 'boss_manta',
    hp: 70,
    tint: 0x00e5ff,
    scale: 2.2,
    speedX: 90,
    speedY: 20,
    fireDelay: 260,
    fireWindowMs: 900,
    firePauseMs: 1100,
  },
  {
    key: 'boss_brute',
    hp: 90,
    tint: 0xff6b6b,
    scale: 2.3,
    speedX: 130,
    speedY: 18,
    fireDelay: 360,
    fireWindowMs: 1300,
    firePauseMs: 1000,
  },
];

export interface Tickable {
  update(t: number, dt: number): void;
}
