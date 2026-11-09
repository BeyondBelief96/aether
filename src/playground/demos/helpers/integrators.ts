/** Position and velocity of a one-dimensional system. */
export interface OscillatorState {
    /** Position. */
    x: number;
    /** Velocity. */
    v: number;
}

/**
 * Acceleration of a one-dimensional system.
 *
 * @param x Position.
 * @param v Velocity.
 * @returns Acceleration at that state.
 */
export type AccelFn = (x: number, v: number) => number;

/**
 * Advances `state` in place by one step.
 *
 * @param state State to update.
 * @param accel Acceleration function, evaluated one or more times.
 * @param dt Step length in seconds.
 */
export type Integrator = (
    state: OscillatorState,
    accel: AccelFn,
    dt: number,
) => void;

/**
 * First-order explicit Euler. Position and velocity both advance from the old state.
 *
 * Adds energy to an undamped oscillator at every step size.
 */
export const explicitEuler: Integrator = (state, accel, dt) => {
    const { x, v } = state;
    const a = accel(x, v);
    state.x = x + v * dt;
    state.v = v + a * dt;
};

/**
 * First-order semi-implicit (symplectic) Euler. The new velocity moves the position.
 *
 * Energy of an undamped oscillator stays bounded while `ω·dt < 2`.
 */
export const semiImplicitEuler: Integrator = (state, accel, dt) => {
    const v = state.v + accel(state.x, state.v) * dt;
    state.v = v;
    state.x += v * dt;
};

/**
 * Second-order velocity Verlet. Exact for constant acceleration.
 *
 * The second acceleration sample uses an Euler estimate of the new velocity, so the method
 * stays second order when `accel` depends on velocity. Energy of an undamped oscillator
 * stays bounded while `ω·dt < 2`.
 */
export const velocityVerlet: Integrator = (state, accel, dt) => {
    const { x, v } = state;
    const a0 = accel(x, v);
    const x1 = x + v * dt + 0.5 * a0 * dt * dt;
    const a1 = accel(x1, v + a0 * dt);
    state.x = x1;
    state.v = v + 0.5 * (a0 + a1) * dt;
};

/**
 * Classical fourth-order Runge–Kutta. Evaluates `accel` four times per step.
 *
 * Slowly removes energy from an undamped oscillator while `ω·dt < 2√2`.
 */
export const rk4: Integrator = (state, accel, dt) => {
    const { x, v } = state;
    const h = dt / 2;

    const k1x = v;
    const k1v = accel(x, v);
    const k2x = v + h * k1v;
    const k2v = accel(x + h * k1x, k2x);
    const k3x = v + h * k2v;
    const k3v = accel(x + h * k2x, k3x);
    const k4x = v + dt * k3v;
    const k4v = accel(x + dt * k3x, k4x);

    state.x = x + (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
    state.v = v + (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
};
