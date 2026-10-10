import type { Scene } from 'three';

/**
 * A self-contained scene that exercises one phase of the engine.
 *
 * Demos are the only code that touches both the engine and Three.js: they own
 * the meshes and copy simulation state onto them in `sync`.
 */
export interface Demo {
  /** Add meshes, lights and helpers to the scene. */
  mount(scene: Scene): void;
  /** Advance the simulation by one fixed step of `dt` seconds. */
  step(dt: number): void;
  /** Copy simulation state onto meshes, blending previous and current state by `alpha`. */
  sync(alpha: number): void;
  /** Remove everything `mount` added and free GPU resources. */
  unmount(scene: Scene): void;
}

export interface DemoInfo {
  id: string;
  title: string;
  phase: number;
  summary: string;
  create(): Demo;
}
