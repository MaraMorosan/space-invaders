import Phaser from 'phaser';

type MaybeChildren = Partial<{ children: Phaser.Structs.Set<Phaser.GameObjects.GameObject> }>;

export const FX_TINT_KEY = 'fxTint' as const;

type WithData = Phaser.GameObjects.GameObject & {
  getData(key: string): unknown;
  setData(key: string, value: unknown): Phaser.GameObjects.GameObject;
};

function hasData(obj: Phaser.GameObjects.GameObject): obj is WithData {
  const o = obj as { getData?: unknown; setData?: unknown };
  return typeof o.getData === 'function' && typeof o.setData === 'function';
}

function getDataUnknown(o: WithData, key: string): unknown {
  return o.getData(key);
}

export function setFxTint(obj: Phaser.GameObjects.GameObject, tint: number): void {
  if (Number.isFinite(tint) && hasData(obj)) {
    obj.setData(FX_TINT_KEY, tint);
  }
}

export function getFxTint(obj: Phaser.GameObjects.GameObject, fallback: number = 0xffffff): number {
  if (!hasData(obj)) return fallback;
  const v = getDataUnknown(obj, FX_TINT_KEY);
  return typeof v === 'number' ? v : fallback;
}

export function freezeBodyFor(
  scene: Phaser.Scene,
  body: Phaser.Physics.Arcade.Body | null | undefined,
  ms = 220,
): void {
  if (!body) return;
  body.setVelocity(0, 0);
  const prev = body.moves;
  body.moves = false;
  scene.time.delayedCall(ms, () => {
    body.moves = prev;
    body.setVelocity(0, 0);
  });
}

export function emptyGroup(g?: Phaser.Physics.Arcade.Group): void {
  if (!g) return;
  for (const obj of g.getChildren()) {
    obj?.destroy?.();
  }
}

export function setGroupVisible(
  g?: Phaser.Physics.Arcade.Group | Phaser.GameObjects.Group,
  visible = true,
): void {
  if (!g) return;

  const gg = g as (Phaser.Physics.Arcade.Group | Phaser.GameObjects.Group) &
    Partial<{
      children: Phaser.Structs.Set<Phaser.GameObjects.GameObject>;
    }>;
  if (!gg.children) return;

  const children = g.getChildren() as Array<
    Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible
  >;

  for (const obj of children) {
    obj.setVisible(visible);
  }
}

export function safeDestroyGroup(g?: Phaser.Physics.Arcade.Group | Phaser.GameObjects.Group): void {
  if (!g) return;

  const gg = g as (Phaser.Physics.Arcade.Group | Phaser.GameObjects.Group) & MaybeChildren;

  if (gg.children) {
    try {
      g.clear(true, true);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[safeDestroyGroup] clear(true,true) failed (already destroyed?)', err, g);
      }
    }
  } else if (import.meta.env.DEV) {
    console.debug('[safeDestroyGroup] children is undefined; skipping clear()', g);
  }

  try {
    g.destroy(true);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[safeDestroyGroup] destroy(true) failed (already destroyed?)', err, g);
    }
  }
}

export function getDataBool(go: Phaser.GameObjects.GameObject, key: string): boolean {
  return Boolean(go.getData(key));
}
