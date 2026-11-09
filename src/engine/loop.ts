/**
 * Fixed-timestep simulation clock with an accumulator.
 *
 * @see https://gafferongames.com/post/fix_your_timestep/
 */

export interface FrameResult {
    /** Number of steps run. */
    steps: number;
    /** Interpolation factor in [0, 1) between the previous and current state. 1 while paused. */
    alpha: number;
    /** Whether accumulated time was discarded after reaching `maxStepsPerFrame`. */
    droppedTime: boolean;
}

/** Maximum frame time in seconds accepted by `advance`. */
const MAX_FRAME_TIME = 0.25;

export class FixedStepLoop {
    /** Simulation speed relative to real time. */
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

    /** Simulated time in seconds since the last reset. */
    get simTime(): number {
        return this.#simTime;
    }

    /** Queues one step for the next `advance` call, regardless of `paused`. */
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
     * Advances the clock and runs `step` once per elapsed timestep.
     *
     * @param nowMs - Current timestamp in milliseconds.
     * @param step - Called with the fixed timestep in seconds.
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
