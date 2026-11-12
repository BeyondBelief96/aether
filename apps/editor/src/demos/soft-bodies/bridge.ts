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

const params = {
    load: number({ label: "Load", min: 0, max: 150, step: 5, default: 60, unit: " kg" }),
    speed: number({ label: "Load speed", min: 0, max: 3, step: 0.1, default: 1, unit: " m/s" }),
    slack: number({ label: "Cable slack", min: 0.01, max: 0.15, step: 0.01, default: 0.05 }),
    hangers: toggle({ label: "Hangers", default: false }),
    auto: toggle({ label: "Auto iterations", default: false }),
    iterations: number({
        label: "Iterations",
        min: 50,
        max: 4000,
        step: 50,
        default: 2000,
        hidden: (values) => values.auto === true,
    }),
};

export const bridgeDemo = defineDemo({
    id: "bridge",
    title: "Bridge",
    category: "soft-bodies",
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
    source: "apps/editor/src/demos/soft-bodies/bridge.ts",
    create({ root, palette, values, useWorld }) {
        let dt = 1 / 60;
        const iterationsFor = (v: typeof values) => (v.auto ? undefined : v.iterations);
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

        const { particles, rods, railCables, hangerCables } = sim;
        const count = particles.length;
        const previous = new Float32Array(count * 3);
        const blended = new Float32Array(count * 3);

        // Deck surface, one quad per section between the rails.
        const deckPositions = new BufferAttribute(new Float32Array(count * 3), 3);
        const deckGeometry = new BufferGeometry().setAttribute("position", deckPositions);
        const indices: number[] = [];
        for (let i = 0; i < SECTIONS; i++) {
            const a = i;
            const b = SECTIONS + 1 + i;
            indices.push(a, b, a + 1, a + 1, b, b + 1);
        }
        deckGeometry.setIndex(indices);
        const deck = new Mesh(
            deckGeometry,
            new MeshStandardMaterial({
                color: palette.muted,
                side: DoubleSide,
                transparent: true,
                opacity: 0.55,
            }),
        );
        deck.frustumCulled = false;

        // Every link as a line segment: rods, then rail cables, then hangers. Each end is a deck
        // particle's index, or -1 for a hanger anchor, which never moves.
        const links = [...rods, ...railCables, ...hangerCables].map((link) => ({
            a: link.particleA,
            b: link.particleB,
            ia: particles.indexOf(link.particleA),
            ib: particles.indexOf(link.particleB),
        }));
        const cables = [...railCables, ...hangerCables];
        const linkPositions = new BufferAttribute(new Float32Array(links.length * 6), 3);
        const linkColors = new BufferAttribute(new Float32Array(links.length * 6), 3);
        const linkGeometry = new BufferGeometry()
            .setAttribute("position", linkPositions)
            .setAttribute("color", linkColors);
        const lines = new LineSegments(linkGeometry, new LineBasicMaterial({ vertexColors: true }));
        lines.frustumCulled = false;
        const rodColor = new Color(palette.ink);
        const tautColor = new Color(palette.accent);
        const slackColor = new Color(palette.muted);
        const setColor = (link: number, color: Color): void => {
            linkColors.setXYZ(link * 2, color.r, color.g, color.b);
            linkColors.setXYZ(link * 2 + 1, color.r, color.g, color.b);
        };
        rods.forEach((_, i) => setColor(i, rodColor));
        root.add(deck, lines);

        // Abutments under the fixed ends.
        const fixtureMaterial = new MeshStandardMaterial({ color: palette.muted });
        const abutmentGeometry = new BoxGeometry(ABUTMENT, DECK_HEIGHT, WIDTH + 0.6);
        for (const sign of [-1, 1]) {
            const abutment = new Mesh(abutmentGeometry, fixtureMaterial);
            abutment.position.set(sign * (SPAN / 2 + ABUTMENT / 2), DECK_HEIGHT / 2, 0);
            abutment.receiveShadow = true;
            root.add(abutment);
        }

        // Gantry carrying the hanger anchors, shown while the hangers are on.
        const gantry = new Group();
        const top = DECK_HEIGHT + HANGER_HEIGHT;
        const postGeometry = new BoxGeometry(POST, top - DECK_HEIGHT, POST);
        const beamGeometry = new BoxGeometry(SPAN + POST, POST, POST);
        for (const z of [-WIDTH / 2, WIDTH / 2]) {
            for (const sign of [-1, 1]) {
                const post = new Mesh(postGeometry, fixtureMaterial);
                post.position.set(sign * (SPAN / 2), (top + DECK_HEIGHT) / 2, z);
                gantry.add(post);
            }
            const beam = new Mesh(beamGeometry, fixtureMaterial);
            beam.position.set(0, top + POST / 2, z);
            gantry.add(beam);
        }
        root.add(gantry);

        const loadMesh = new Mesh(
            new BoxGeometry(LOAD_SIZE.x, LOAD_SIZE.y, LOAD_SIZE.z),
            new MeshStandardMaterial({ color: palette.series[1] }),
        );
        loadMesh.castShadow = true;
        root.add(loadMesh);

        const remember = (): void => {
            particles.forEach((p, i) => {
                previous[i * 3] = p.position.x;
                previous[i * 3 + 1] = p.position.y;
                previous[i * 3 + 2] = p.position.z;
            });
        };

        /** Writes the blended position of deck particle `index`, or `particle`'s own if -1. */
        const placeEnd = (vertex: number, index: number, particle: Particle): void => {
            if (index === -1) {
                const { x, y, z } = particle.position;
                linkPositions.setXYZ(vertex, x, y, z);
            } else {
                linkPositions.setXYZ(
                    vertex,
                    blended[index * 3]!,
                    blended[index * 3 + 1]!,
                    blended[index * 3 + 2]!,
                );
            }
        };

        const placeLinks = (): void => {
            links.forEach(({ a, b, ia, ib }, i) => {
                placeEnd(i * 2, ia, a);
                placeEnd(i * 2 + 1, ib, b);
            });
            cables.forEach((cable, i) => {
                const taut = cable.currentLength() >= cable.maxLength - TAUT_TOLERANCE;
                setColor(rods.length + i, taut ? tautColor : slackColor);
            });
            linkPositions.needsUpdate = true;
            linkColors.needsUpdate = true;
            const shown = rods.length + railCables.length + (sim.hangers ? hangerCables.length : 0);
            linkGeometry.setDrawRange(0, shown * 2);
        };

        const placeLoad = (): void => {
            loadMesh.visible = sim.loadMass > 0;
            if (!loadMesh.visible) return;
            const section = sim.loadSection();
            const t = sim.loadFraction();
            let x = 0;
            let y = 0;
            for (let rail = 0; rail < 2; rail++) {
                const near = rail * (SECTIONS + 1) + section;
                x += (blended[near * 3]! * (1 - t) + blended[(near + 1) * 3]! * t) / 2;
                y += (blended[near * 3 + 1]! * (1 - t) + blended[(near + 1) * 3 + 1]! * t) / 2;
            }
            const scale = Math.cbrt(sim.loadMass / 60);
            loadMesh.scale.setScalar(scale);
            loadMesh.position.set(x, y + (LOAD_SIZE.y * scale) / 2, 0);
        };

        gantry.visible = values.hangers;
        remember();

        return {
            update(next, changed) {
                sim.loadMass = next.load;
                sim.loadSpeed = next.speed;
                if (changed.has("slack")) sim.setSlack(next.slack);
                if (changed.has("hangers")) {
                    sim.setHangers(next.hangers);
                    gantry.visible = next.hangers;
                }
                if (changed.has("auto") || changed.has("iterations")) {
                    useWorld(sim.setIterations(iterationsFor(next)));
                }
            },
            step(stepDt) {
                dt = stepDt;
                remember();
                const substeps = substepsFor(stepDt, MAX_SUBSTEP);
                for (let i = 0; i < substeps; i++) sim.step(stepDt / substeps);
            },
            sync(alpha) {
                particles.forEach((p, i) => {
                    _blended
                        .set(previous[i * 3]!, previous[i * 3 + 1]!, previous[i * 3 + 2]!)
                        .lerp(p.position, alpha);
                    blended[i * 3] = _blended.x;
                    blended[i * 3 + 1] = _blended.y;
                    blended[i * 3 + 2] = _blended.z;
                    deckPositions.setXYZ(i, _blended.x, _blended.y, _blended.z);
                });
                deckPositions.needsUpdate = true;
                deckGeometry.computeVertexNormals();
                placeLinks();
                placeLoad();
            },
            readouts: () => {
                const resolver = sim.world.contactResolver;
                const limit = resolver.iterations ?? 2 * sim.world.contactCount;
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
                            { label: "Rods", value: String(rods.length) },
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
                            {
                                label: "Iterations",
                                value: `${resolver.iterationsUsed} of ${limit}`,
                            },
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
                              at: loadMesh.position,
                              text: `${formatNumber(sim.loadMass, 0)} kg`,
                              color: 1 as SeriesIndex,
                          },
                      ]
                    : [],
        };
    },
});
