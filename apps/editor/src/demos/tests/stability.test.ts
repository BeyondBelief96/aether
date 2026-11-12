import { describe, expect, it } from "vitest";
import { Group, Line, Mesh, PerspectiveCamera, Vector3 } from "three";
import type { ParticleWorld } from "aether-physics";
import type { DemoDefinition, DemoInstance } from "../../core/demo";
import { defaults, type ParamSchema, type ParamValues } from "../../core/params";
import { PHYSICS_RATES } from "../../core/session";
import { LIGHT } from "../../stage/palette";
import { INTEGRATORS, makeIntegrator, type IntegratorChoice } from "../../core/integrators";
import { demos } from "../registry";

const SECONDS = 4;
const _world = new Vector3();

function start(
    demo: DemoDefinition,
    values: ParamValues<ParamSchema>,
    integrator: IntegratorChoice = "semi-implicit",
) {
    const root = new Group();
    const worlds: ParticleWorld[] = [];
    const element = { addEventListener() {}, removeEventListener() {}, style: {} };
    const instance = demo.create({
        root,
        view: {
            camera: new PerspectiveCamera(),
            element: element as unknown as HTMLElement,
            setOrbitEnabled() {},
        },
        palette: LIGHT,
        values,
        set() {},
        plot() {},
        clearCharts() {},
        useWorld(world) {
            world.integrator = makeIntegrator(integrator);
            worlds.push(world);
            return world;
        },
    }) as DemoInstance<ParamSchema>;
    return { root, instance, worlds };
}

function run(instance: DemoInstance<ParamSchema>, hz: number, seconds: number): void {
    for (let i = 0; i < seconds * hz; i++) instance.step(1 / hz);
    instance.sync(1);
}

/** Whether everything drawn under `root` is finite: object positions and every vertex. */
function finite(root: Group): boolean {
    let ok = true;
    root.updateMatrixWorld(true);
    root.traverse((object) => {
        if (!Number.isFinite(object.getWorldPosition(_world).lengthSq())) ok = false;
        if (object instanceof Mesh || object instanceof Line) {
            const position = object.geometry.getAttribute("position");
            if (position && !position.array.every(Number.isFinite)) ok = false;
        }
    });
    return ok;
}

describe("every demo stays finite at every physics rate", () => {
    for (const demo of demos) {
        const instances = [
            { label: "defaults", values: {} },
            ...(demo.presets ?? []).map((p) => ({ label: p.label, values: p.values })),
        ];
        for (const hz of PHYSICS_RATES) {
            it(`${demo.id} at ${hz} Hz`, () => {
                for (const { label, values } of instances) {
                    const { root, instance } = start(demo, {
                        ...defaults(demo.params),
                        ...values,
                    } as ParamValues<ParamSchema>);
                    for (const action of demo.actions ?? []) instance.action?.(action.id);
                    run(instance, hz, SECONDS);
                    expect(finite(root), label).toBe(true);
                    instance.dispose?.();
                }
            });
        }
    }
});

describe("raft", () => {
    const raft = demos.find((d) => d.id === "raft")!;
    for (const hz of PHYSICS_RATES) {
        it(`carries a full load of the heaviest crates on balsa at ${hz} Hz`, () => {
            const { root, instance } = start(raft, {
                ...defaults(raft.params),
                wood: 150,
                crate: 1500,
            } as ParamValues<ParamSchema>);
            for (let i = 0; i < 20; i++) {
                instance.action?.("load");
                run(instance, hz, 0.25);
            }
            run(instance, hz, 4);
            expect(finite(root)).toBe(true);
        });
    }
});

/** Demos with no world the app's integrator setting applies to. */
const OWN_INTEGRATORS = new Set(["rotation", "integrators"]);

describe("the integrator setting", () => {
    for (const demo of demos) {
        if (OWN_INTEGRATORS.has(demo.id)) continue;
        it(`${demo.id} registers its worlds`, () => {
            const { worlds, instance } = start(
                demo,
                defaults(demo.params) as ParamValues<ParamSchema>,
                "rk4",
            );
            expect(worlds.length).toBeGreaterThan(0);
            for (const world of worlds) expect(world.integrator.name).toBe("RK4");
            instance.dispose?.();
        });
    }

    for (const demo of demos) {
        it(`${demo.id} runs under every integrator without throwing`, () => {
            for (const { value } of INTEGRATORS) {
                const { instance } = start(
                    demo,
                    defaults(demo.params) as ParamValues<ParamSchema>,
                    value,
                );
                expect(() => run(instance, 60, 2)).not.toThrow();
                instance.dispose?.();
            }
        });
    }
});
