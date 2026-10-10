/**
 * Fixed-timestep simulation clock.
 *
 * Physics always advances in equal `dt` slices, however irregular the display's
 * frame rate is. Leftover time is carried in an accumulator, and the fraction of
 * a step it represents (`alpha`) is handed to the renderer so it can blend the
 * previous and current physics states instead of stuttering.
 *
 * Glenn Fiedler, "Fix Your Timestep!"
 * https://gafferongames.com/post/fix_your_timestep/
 *
 * Pure TypeScript: no DOM, no Three.js. Time is passed in, so it is easy to test.
 */

export interface FrameResult {
  /** Physics steps taken this frame. */
  steps: number;
  /** Blend factor in [0, 1) between the previous and current state (1 while paused). */
  alpha: number;
  /** True when the frame hit `maxStepsPerFrame` and simulated time was thrown away. */
  droppedTime: boolean;
}

/**
 * Longest real frame we will try to catch up on, in seconds. Without a cap, a
 * backgrounded tab returns with seconds of backlog and the simulation falls
 * into the "spiral of death".
 */
const MAX_FRAME_TIME = 0.25;

export class FixedStepLoop {
  /** Multiplier on real time: 0.5 is slow motion, 2 is fast forward. */
  timeScale = 1;
  paused = false;
  maxStepsPerFrame = 8;

  #dt: number;
  #accumulator = 0;
  #lastTimeMs: number | null = null;
  #simTime = 0;
  #queuedSteps = 0;

  constructor(hz = 60) {
    this.#dt = 1 / hz;
  }

  /** Seconds per physics step. */
  get dt(): number {
    return this.#dt;
  }

  get hz(): number {
    return 1 / this.#dt;
  }

  set hz(value: number) {
    if (!(value > 0)) throw new RangeError(`hz must be positive, got ${value}`);
    this.#dt = 1 / value;
  }

  /** Total simulated seconds since the last reset. */
  get simTime(): number {
    return this.#simTime;
  }

  /** Queue exactly one step for the next `advance`, even while paused. */
  stepOnce(): void {
    this.#queuedSteps++;
  }

  reset(): void {
    this.#accumulator = 0;
    this.#lastTimeMs = null;
    this.#simTime = 0;
    this.#queuedSteps = 0;
  }

  /**
   * Call once per animation frame with a timestamp in milliseconds (the value
   * `requestAnimationFrame` passes). Runs `step(dt)` zero or more times.
   */
  advance(nowMs: number, step: (dt: number) => void): FrameResult {
    const last = this.#lastTimeMs;
    this.#lastTimeMs = nowMs;
    const frameTime = last === null ? 0 : Math.min((nowMs - last) / 1000, MAX_FRAME_TIME);

    let steps = 0;
    const run = (): void => {
      step(this.#dt);
      this.#simTime += this.#dt;
      steps++;
    };

    for (; this.#queuedSteps > 0; this.#queuedSteps--) run();

    if (this.paused) return { steps, alpha: 1, droppedTime: false };

    this.#accumulator += frameTime * this.timeScale;
    while (this.#accumulator >= this.#dt && steps < this.maxStepsPerFrame) {
      run();
      this.#accumulator -= this.#dt;
    }

    let droppedTime = false;
    if (this.#accumulator >= this.#dt) {
      this.#accumulator %= this.#dt;
      droppedTime = true;
    }

    return { steps, alpha: this.#accumulator / this.#dt, droppedTime };
  }
}
