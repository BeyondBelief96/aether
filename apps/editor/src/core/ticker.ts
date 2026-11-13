/** Counts fixed intervals as time advances. */
export class Ticker {
    /** Length of one interval, in seconds. */
    readonly interval: number;
    #elapsed = 0;

    constructor(interval: number) {
        if (!(interval > 0)) throw new RangeError(`interval must be positive, got ${interval}`);
        this.interval = interval;
    }

    /** Adds `dt` seconds and returns how many intervals completed. */
    advance(dt: number): number {
        this.#elapsed += dt;
        let ticks = 0;
        while (this.#elapsed >= this.interval) {
            this.#elapsed -= this.interval;
            ticks++;
        }
        return ticks;
    }

    reset(): void {
        this.#elapsed = 0;
    }
}
