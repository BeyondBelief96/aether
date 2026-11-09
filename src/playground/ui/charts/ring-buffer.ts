/** A fixed-capacity queue of numbers. Pushing to a full buffer overwrites the oldest value. */
export class RingBuffer {
    readonly capacity: number;
    #values: Float64Array;
    #next = 0;
    #length = 0;

    constructor(capacity: number) {
        if (!Number.isInteger(capacity) || capacity <= 0)
            throw new RangeError(`capacity must be a positive integer, got ${capacity}`);
        this.capacity = capacity;
        this.#values = new Float64Array(capacity);
    }

    /** Number of values held. */
    get length(): number {
        return this.#length;
    }

    push(value: number): void {
        this.#values[this.#next] = value;
        this.#next = (this.#next + 1) % this.capacity;
        if (this.#length < this.capacity) this.#length++;
    }

    /** The value `index` places after the oldest. `undefined` when out of range. */
    at(index: number): number | undefined {
        if (!Number.isInteger(index) || index < 0 || index >= this.#length) return undefined;
        const oldest = (this.#next - this.#length + this.capacity) % this.capacity;
        return this.#values[(oldest + index) % this.capacity];
    }

    clear(): void {
        this.#next = 0;
        this.#length = 0;
    }
}
