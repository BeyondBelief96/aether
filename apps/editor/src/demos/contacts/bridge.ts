import {
    BoxGeometry,
    BufferAttribute,
    BufferGeometry,
    Color,
    DoubleSide,
    Group,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshStandardMaterial,
} from "three";
import { Vec3, type Particle } from "aether-physics";
import { defineDemo, type SeriesIndex } from "../../core/demo";
import { formatNumber } from "../../core/format";
import { number, toggle } from "../../core/params";
import type { ScenePalette } from "../../stage/palette";
import {
    applyResolver,
    iterationsFor,
    iterationsReadout,
    resolverParams,
} from "../helpers/resolver";
import { substepsFor } from "../helpers/substeps";
import { BridgeSim } from "./bridge-sim";

/**
 * A rope bridge made only of contact generators: `ParticleCable`s along each rail,
 * `ParticleRod`s across the deck and optional hanger cables, all resolved by the engine's
 * worst-first resolver. A load crosses the deck by adding its mass to the particles under it.
 * Cables light up when taut and grey out when slack. A hanging chain needs far more resolver
 * iterations than twice its contact count; with too few, the deck stretches.
 */

const SECTIONS = 8;
const SPAN = 10; // m
const WIDTH = 1.6; // m
const DECK_HEIGHT = 4; // m
const HANGER_HEIGHT = 2.5; // m
const HANGER_DROP = 0.6; // m
const NODE_MASS = 5; // kg
const DAMPING = 0.5;
const MAX_SUBSTEP = 1 / 60; // s; keeps a heavy load stable at low physics rates
const TAUT_TOLERANCE = 0.002; // m
const ERROR_WARNING = 0.01; // m
const ABUTMENT = 1.2; // m
const POST = 0.16; // m
const LOAD_SIZE = { x: 0.8, y: 0.5, z: 1.1 }; // m, at 60 kg

const _blended = new Vec3();
const _point = new Vec3();
const _corner = new Vec3();

const params = {
    load: number({ label: "Load", min: 0, max: 150, step: 5, default: 60, unit: " kg" }),
    speed: number({ label: "Load speed", min: 0, max: 3, step: 0.1, default: 1, unit: " m/s" }),
    slack: number({ label: "Cable slack", min: 0.01, max: 0.15, step: 0.01, default: 0.05 }),
    hangers: toggle({ label: "Hangers", default: false }),
    ...resolverParams({ auto: false, min: 50, max: 4000, step: 50, default: 2000 }),
};

/**
 * Positions of every particle the bridge draws, deck then anchors, blended between the last two
 * steps. Anchors never move, so only the deck is blended.
 */
class Points {
    readonly array: Float32Array;
    private readonly deck: readonly Particle[];
    private readonly previous: Float32Array;
    private readonly index = new Map<Particle, number>();

    constructor(deck: readonly Particle[], anchors: readonly Particle[]) {
        this.deck = deck;
        const all = [...deck, ...anchors];
        this.array = new Float32Array(all.length * 3);
        this.previous = new Float32Array(deck.length * 3);
        all.forEach((p, i) => {
            this.index.set(p, i);
            this.array[i * 3] = p.position.x;
            this.array[i * 3 + 1] = p.position.y;
            this.array[i * 3 + 2] = p.position.z;
        });
        this.remember();
    }

    indexOf(particle: Particle): number {
        return this.index.get(particle)!;
    }

    /** Records the deck's positions before a step. */
    remember(): void {
        this.deck.forEach((p, i) => {
            this.previous[i * 3] = p.position.x;
            this.previous[i * 3 + 1] = p.position.y;
            this.previous[i * 3 + 2] = p.position.z;
        });
    }

    blend(alpha: number): void {
        this.deck.forEach((p, i) => {
            const at = i * 3;
            _blended
                .set(this.previous[at]!, this.previous[at + 1]!, this.previous[at + 2]!)
                .lerp(p.position, alpha);
            this.array[at] = _blended.x;
            this.array[at + 1] = _blended.y;
            this.array[at + 2] = _blended.z;
        });
    }

    /** The blended position of point `i`, in a shared scratch vector. */
    at = (i: number): Vec3 =>
        _corner.set(this.array[i * 3]!, this.array[i * 3 + 1]!, this.array[i * 3 + 2]!);
}

/** The deck surface: one quad per section between the rails, drawn straight from `points`. */
function buildDeck(sim: BridgeSim, points: Points, palette: ScenePalette) {
    const positions = new BufferAttribute(points.array, 3);
    const geometry = new BufferGeometry().setAttribute("position", positions);
    const indices: number[] = [];
    for (let i = 0; i < SECTIONS; i++) {
        const a = points.indexOf(sim.node(0, i));
        const b = points.indexOf(sim.node(1, i));
        const c = points.indexOf(sim.node(0, i + 1));
        const d = points.indexOf(sim.node(1, i + 1));
        indices.push(a, b, c, c, b, d);
    }
    geometry.setIndex(indices);
    const mesh = new Mesh(
        geometry,
        new MeshStandardMaterial({
            color: palette.muted,
            side: DoubleSide,
            transparent: true,
            opacity: 0.55,
        }),
    );
    mesh.frustumCulled = false;
    return {
        mesh,
        place(): void {
            positions.needsUpdate = true;
            geometry.computeVertexNormals();
        },
    };
}

/**
 * Every link as a line segment: rods in ink, then rail cables and hangers, each orange when
 * taut and grey when slack.
 */
function buildLinks(sim: BridgeSim, points: Points, palette: ScenePalette) {
    const { rods, railCables, hangerCables } = sim;
    const ends = [...rods, ...railCables, ...hangerCables].map((link) => [
        points.indexOf(link.particleA),
        points.indexOf(link.particleB),
    ]);
    const cables = [...railCables, ...hangerCables];
    const positions = new BufferAttribute(new Float32Array(ends.length * 6), 3);
    const colors = new BufferAttribute(new Float32Array(ends.length * 6), 3);
    const geometry = new BufferGeometry()
        .setAttribute("position", positions)
        .setAttribute("color", colors);
    const lines = new LineSegments(geometry, new LineBasicMaterial({ vertexColors: true }));
    lines.frustumCulled = false;

    const rodColor = new Color(palette.ink);
    const tautColor = new Color(palette.accent);
    const slackColor = new Color(palette.muted);
    const setColor = (link: number, color: Color): void => {
        colors.setXYZ(link * 2, color.r, color.g, color.b);
        colors.setXYZ(link * 2 + 1, color.r, color.g, color.b);
    };
    rods.forEach((_, i) => setColor(i, rodColor));

    return {
        lines,
        place(): void {
            ends.forEach(([a, b], i) => {
                const pa = points.at(a!);
                positions.setXYZ(i * 2, pa.x, pa.y, pa.z);
                const pb = points.at(b!);
                positions.setXYZ(i * 2 + 1, pb.x, pb.y, pb.z);
            });
            cables.forEach((cable, i) => {
                const taut = cable.currentLength() >= cable.maxLength - TAUT_TOLERANCE;
                setColor(rods.length + i, taut ? tautColor : slackColor);
            });
            positions.needsUpdate = true;
            colors.needsUpdate = true;
            const shown = rods.length + railCables.length + (sim.hangers ? hangerCables.length : 0);
            geometry.setDrawRange(0, shown * 2);
        },
    };
}

/** Abutments under the fixed ends, and the gantry that carries the hanger anchors. */
function buildFixtures(palette: ScenePalette) {
    const material = new MeshStandardMaterial({ color: palette.muted });
    const fixtures = new Group();
    const abutmentGeometry = new BoxGeometry(ABUTMENT, DECK_HEIGHT, WIDTH + 0.6);
    for (const sign of [-1, 1]) {
        const abutment = new Mesh(abutmentGeometry, material);
        abutment.position.set(sign * (SPAN / 2 + ABUTMENT / 2), DECK_HEIGHT / 2, 0);
        abutment.receiveShadow = true;
        fixtures.add(abutment);
    }

    const gantry = new Group();
    const top = DECK_HEIGHT + HANGER_HEIGHT;
    const postGeometry = new BoxGeometry(POST, HANGER_HEIGHT, POST);
    const beamGeometry = new BoxGeometry(SPAN + POST, POST, POST);
    for (const z of [-WIDTH / 2, WIDTH / 2]) {
        for (const sign of [-1, 1]) {
            const post = new Mesh(postGeometry, material);
            post.position.set(sign * (SPAN / 2), (top + DECK_HEIGHT) / 2, z);
            gantry.add(post);
        }
        const beam = new Mesh(beamGeometry, material);
        beam.position.set(0, top + POST / 2, z);
        gantry.add(beam);
    }
    fixtures.add(gantry);
    return { fixtures, gantry };
}

export const bridgeDemo = defineDemo({
    id: "bridge",
    title: "Bridge",
    category: "contacts",
    summary: "A rope bridge of cables and rods, with a load crossing it.",
    hint: "Try Starved. Twice the contact count is too few iterations for a chain, and the deck stretches.",
    params,
    presets: [
        {
            label: "Rope bridge",
            note: "60 kg crossing",
            values: { load: 60, speed: 1, hangers: false, auto: false, iterations: 2000 },
        },
        {
            label: "Hung deck",
            note: "Hanger cables",
            values: { load: 60, speed: 1, hangers: true, auto: false, iterations: 2000 },
        },
        {
            label: "Heavy",
            note: "150 kg",
            values: { load: 150, speed: 0.5, hangers: false, auto: false, iterations: 2000 },
        },
        {
            label: "Starved",
            note: "2× contacts",
            values: { load: 60, speed: 1, hangers: false, auto: true },
        },
    ],
    camera: { position: { x: 4, y: 6.5, z: 11 }, target: { x: 0, y: 3, z: 0 } },
    source: "apps/editor/src/demos/contacts/bridge.ts",
    create({ root, palette, values, useWorld }) {
        let dt = 1 / 60;
        const sim = new BridgeSim({
            sections: SECTIONS,
            span: SPAN,
            width: WIDTH,
            deckHeight: DECK_HEIGHT,
            hangerHeight: HANGER_HEIGHT,
            hangerDrop: HANGER_DROP,
            nodeMass: NODE_MASS,
            damping: DAMPING,
            slack: values.slack,
            hangers: values.hangers,
            iterations: iterationsFor(values),
        });
        sim.loadMass = values.load;
        sim.loadSpeed = values.speed;
        useWorld(sim.world);

        const points = new Points(sim.particles, sim.anchors);
        const deck = buildDeck(sim, points, palette);
        const links = buildLinks(sim, points, palette);
        const { fixtures, gantry } = buildFixtures(palette);
        gantry.visible = values.hangers;
        const load = new Mesh(
            new BoxGeometry(LOAD_SIZE.x, LOAD_SIZE.y, LOAD_SIZE.z),
            new MeshStandardMaterial({ color: palette.series[1] }),
        );
        load.castShadow = true;
        root.add(deck.mesh, links.lines, fixtures, load);

        const placeLoad = (): void => {
            load.visible = sim.loadMass > 0;
            if (!load.visible) return;
            const scale = Math.cbrt(sim.loadMass / 60);
            sim.loadPoint(_point, points.at);
            load.scale.setScalar(scale);
            load.position.set(_point.x, _point.y + (LOAD_SIZE.y * scale) / 2, _point.z);
        };

        return {
            update(next, changed) {
                sim.loadMass = next.load;
                sim.loadSpeed = next.speed;
                if (changed.has("slack")) sim.setSlack(next.slack);
                if (changed.has("hangers")) {
                    sim.setHangers(next.hangers);
                    gantry.visible = next.hangers;
                }
                applyResolver(sim.world, next, changed);
            },
            step(stepDt) {
                dt = stepDt;
                points.remember();
                const substeps = substepsFor(stepDt, MAX_SUBSTEP);
                for (let i = 0; i < substeps; i++) sim.step(stepDt / substeps);
            },
            sync(alpha) {
                points.blend(alpha);
                deck.place();
                links.place();
                placeLoad();
            },
            readouts: () => {
                const rodError = sim.rodError();
                const stretch = Math.max(sim.cableStretch(), 0);
                return [
                    {
                        title: "Bridge",
                        color: 0,
                        rows: [
                            {
                                label: "Taut cables",
                                value: `${sim.tautCount(TAUT_TOLERANCE)} of ${sim.cableCount()}`,
                            },
                            { label: "Rods", value: String(sim.rods.length) },
                            { label: "Lowest point", value: `${formatNumber(sim.sag(), 2)} m` },
                            {
                                label: "Under the load",
                                value: `${formatNumber(sim.dropUnderLoad(), 2)} m`,
                            },
                        ],
                    },
                    {
                        title: "Resolver",
                        color: 1,
                        rows: [
                            { label: "Contacts", value: String(sim.world.contactCount) },
                            iterationsReadout(sim.world, false),
                            {
                                label: "Worst rod error",
                                value: `${formatNumber(rodError * 1000, 1)} mm`,
                                warn: rodError > ERROR_WARNING,
                            },
                            {
                                label: "Worst cable stretch",
                                value: `${formatNumber(stretch * 1000, 1)} mm`,
                                warn: stretch > ERROR_WARNING,
                            },
                            {
                                label: "Substeps per step",
                                value: String(substepsFor(dt, MAX_SUBSTEP)),
                            },
                        ],
                    },
                ];
            },
            callouts: () =>
                sim.loadMass > 0
                    ? [
                          {
                              at: load.position,
                              text: `${formatNumber(sim.loadMass, 0)} kg`,
                              color: 1 as SeriesIndex,
                          },
                      ]
                    : [],
        };
    },
});
