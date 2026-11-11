import {
    BoxGeometry,
    BufferGeometry,
    EdgesGeometry,
    Group,
    LineDashedMaterial,
    LineSegments,
    Vector3,
    type Material,
} from "three";
import type { ScenePalette } from "@aether/editor/palette";
import type { SceneTag } from "@aether/editor/scene";

/**
 * The roadmap's bodies, drawn as dashed outlines around the live cloth: a block pyramid and a
 * row of dominoes (contacts and stacking) and a ragdoll (joints). Nothing here is simulated.
 */

const PYRAMID_X = 7; // m
const DOMINO_START_X = -11; // m
const RAGDOLL_X = -0.6; // m

function outline(geometry: BufferGeometry, material: Material): LineSegments {
    const lines = new LineSegments(new EdgesGeometry(geometry), material);
    lines.computeLineDistances();
    geometry.dispose();
    return lines;
}

function box(
    size: [number, number, number],
    position: [number, number, number],
    material: Material,
    rotation: [number, number, number] = [0, 0, 0],
): LineSegments {
    const lines = outline(new BoxGeometry(...size), material);
    lines.position.set(...position);
    lines.rotation.set(...rotation);
    return lines;
}

/** Four rows of 1 m blocks, 4 → 1. */
function pyramid(material: Material): Group {
    const group = new Group();
    for (let row = 0; row < 4; row++) {
        const count = 4 - row;
        for (let i = 0; i < count; i++) {
            const x = PYRAMID_X + (i - (count - 1) / 2) * 1.05;
            group.add(box([1, 1, 1], [x, 0.5 + row, -0.5], material));
        }
    }
    return group;
}

/** A curving row of dominoes, the last few mid-fall. */
function dominoes(material: Material): Group {
    const group = new Group();
    for (let i = 0; i < 9; i++) {
        const t = i / 8;
        const x = DOMINO_START_X + t * 7;
        const z = 4 + Math.sin(t * Math.PI) * 1.4;
        const tip = i >= 6 ? (i - 5) * 0.32 : 0;
        const angle = Math.atan2(Math.cos(t * Math.PI) * 1.4 * Math.PI, 7);
        group.add(box([0.22, 1.6, 0.8], [x, 0.8 - tip * 0.25, z], material, [0, -angle, -tip]));
    }
    return group;
}

/** A ragdoll sitting against nothing in particular: boxes for every limb. */
function ragdoll(material: Material): Group {
    const g = new Group();
    const part = (
        size: [number, number, number],
        at: [number, number, number],
        rot: [number, number, number] = [0, 0, 0],
    ) => g.add(box(size, at, material, rot));
    part([0.7, 0.9, 0.4], [0, 1.15, 0], [0, 0, -0.15]); // torso
    part([0.42, 0.42, 0.42], [-0.1, 1.9, 0], [0, 0.3, -0.2]); // head
    part([0.22, 0.6, 0.22], [-0.55, 1.1, 0.1], [0, 0, 0.6]); // upper arm
    part([0.2, 0.55, 0.2], [-0.85, 0.65, 0.25], [0.3, 0, 0.2]); // forearm
    part([0.22, 0.6, 0.22], [0.5, 1.15, 0], [0, 0, -0.9]); // upper arm
    part([0.2, 0.55, 0.2], [0.9, 0.9, 0.1], [0, 0, -0.3]); // forearm
    part([0.26, 0.8, 0.26], [-0.2, 0.42, 0.45], [1.35, 0, 0.1]); // thigh
    part([0.22, 0.75, 0.22], [-0.25, 0.25, 1.15], [0.2, 0, 0]); // shin
    part([0.26, 0.8, 0.26], [0.25, 0.42, 0.4], [1.2, 0, -0.2]); // thigh
    part([0.22, 0.75, 0.22], [0.45, 0.3, 1.1], [-0.25, 0, 0]); // shin
    g.position.set(RAGDOLL_X, 0, 6);
    g.rotation.y = 0.5;
    return g;
}

export function buildDestination(palette: ScenePalette): Group {
    const material = new LineDashedMaterial({
        color: palette.muted,
        dashSize: 0.14,
        gapSize: 0.09,
    });
    const group = new Group();
    group.add(pyramid(material), dominoes(material), ragdoll(material));
    return group;
}

export const destinationTags: readonly SceneTag[] = [
    { at: new Vector3(2.6, 6.8, 0), text: "cloth · runs today" },
    { at: new Vector3(PYRAMID_X + 0.6, 4.3, -0.5), text: "stacking · phase 6", ghost: true },
    { at: new Vector3(DOMINO_START_X + 0.2, 1.9, 4), text: "dominoes · phase 6", ghost: true },
    { at: new Vector3(RAGDOLL_X + 0.6, 2.3, 6), text: "ragdoll · phase 7", ghost: true },
];
