import {
    BoxGeometry,
    Group,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    SphereGeometry,
    TorusGeometry,
    type Ray,
} from "three";
import { Mat3x3, Quaternion, Vec3, type Vec3Like } from "aether-physics";
import { defineDemo } from "../../core/demo";
import { DEG_TO_RAD, formatDegrees, formatNumber, RAD_TO_DEG } from "../../core/format";
import { choice, number, vec3 } from "../../core/params";
import { DragHandle } from "../helpers/drag-handle";
import { VectorArrow } from "../helpers/vector-arrow";

/**
 * One quaternion, set either from an axis and angle or from Euler XYZ angles, and everything
 * drawn and read out derived from it. In Euler mode three nested gimbals show the angles; at
 * Y = ±90° two of them line up and a degree of freedom disappears.
 */

const CENTER: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 1.4, z: 0 }); // m
const BODY_SIZE: Readonly<Vec3Like> = Object.freeze({ x: 1.6, y: 0.8, z: 0.4 }); // m
const ARROW_LENGTH = 1.8; // m
const AXIS_ARROW_LENGTH = 2.4; // m
const HANDLE_RADIUS = 0.14; // m
const RING_RADII = [1.6, 1.42, 1.24] as const; // m: outer (X), middle (Y), inner (Z)
const RING_TUBE = 0.025; // m
/** |cos y| below this counts as gimbal lock: within about 1.15° of ±90°. */
const GIMBAL_LOCK_COS = 0.02;

const ORIGIN: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 0, z: 0 });
const UNITS = [
    Object.freeze({ x: 1, y: 0, z: 0 }),
    Object.freeze({ x: 0, y: 1, z: 0 }),
    Object.freeze({ x: 0, y: 0, z: 1 }),
] as const;

const _basis = new Vec3();
const _axis = new Vec3();
const _euler = new Vec3();
const _matrix = new Mat3x3();
const _turn = new Quaternion();
const _rayOrigin = new Vec3();
const _tip = new Vec3();
const _near = new Vec3();
const _far = new Vec3();

const isEuler = (v: Readonly<Record<string, unknown>>) => v.mode === "euler";

const params = {
    mode: choice({
        label: "Input",
        options: [
            { value: "axis-angle", label: "Axis–angle" },
            { value: "euler", label: "Euler XYZ" },
        ],
        default: "axis-angle",
    }),
    axis: vec3({ label: "Axis", default: { x: 0, y: 1, z: 0 }, nonzero: true, hidden: isEuler }),
    angle: number({
        label: "Angle",
        min: -180,
        max: 180,
        step: 1,
        default: 35,
        unit: "°",
        hidden: isEuler,
    }),
    x: number({
        label: "X",
        min: -180,
        max: 180,
        step: 1,
        default: 0,
        unit: "°",
        color: "var(--axis-x)",
        hidden: (v) => !isEuler(v),
    }),
    y: number({
        label: "Y",
        min: -90,
        max: 90,
        step: 1,
        default: 0,
        unit: "°",
        color: "var(--axis-y)",
        hidden: (v) => !isEuler(v),
    }),
    z: number({
        label: "Z",
        min: -180,
        max: 180,
        step: 1,
        default: 0,
        unit: "°",
        color: "var(--axis-z)",
        hidden: (v) => !isEuler(v),
    }),
};

export const rotationDemo = defineDemo({
    id: "rotation",
    title: "Rotation",
    category: "foundations",
    summary:
        "A body turned by one quaternion, set from an axis and angle or from Euler angles. " +
        "Drag the grey tip to aim the axis.",
    hint: "Choose Gimbal lock, then move X and Z: both turn the body about the same axis.",
    params,
    presets: [
        {
            label: "Quarter turn",
            note: "About Y",
            values: { mode: "axis-angle", axis: { x: 0, y: 1, z: 0 }, angle: 90 },
        },
        {
            label: "Diagonal",
            note: "120° about XYZ",
            values: { mode: "axis-angle", axis: { x: 1, y: 1, z: 1 }, angle: 120 },
        },
        { label: "Tilted", note: "Euler 30 20 45", values: { mode: "euler", x: 30, y: 20, z: 45 } },
        { label: "Gimbal lock", note: "Y at 90°", values: { mode: "euler", x: 30, y: 90, z: 45 } },
    ],
    camera: { position: { x: 4.5, y: 4, z: 6 }, target: { x: 0, y: 1.2, z: 0 } },
    source: "apps/editor/src/demos/foundations/rotation.ts",
    create({ root, view, palette, values, set }) {
        let current = values;
        const q = new Quaternion();

        const group = new Group();
        group.position.copy(CENTER);
        const body = new Mesh(
            new BoxGeometry(BODY_SIZE.x, BODY_SIZE.y, BODY_SIZE.z),
            new MeshStandardMaterial({ color: palette.ink }),
        );
        const axisColors = [palette.axis.x, palette.axis.y, palette.axis.z] as const;
        const bodyArrows = axisColors.map((color) => new VectorArrow(color));
        const rotationArrow = new VectorArrow(palette.muted);
        const handle = new Mesh(
            new SphereGeometry(HANDLE_RADIUS, 16, 12),
            new MeshBasicMaterial({ color: palette.accent, depthTest: false }),
        );
        handle.renderOrder = 1;

        // Outer (X) → middle (Y) → inner (Z), each nested in the one before.
        const gimbals = [new Group(), new Group(), new Group()] as const;
        gimbals[0].add(gimbals[1]);
        gimbals[1].add(gimbals[2]);
        const rings = RING_RADII.map(
            (radius, i) =>
                new Mesh(
                    new TorusGeometry(radius, RING_TUBE, 12, 96),
                    new MeshBasicMaterial({ color: axisColors[i] }),
                ),
        );
        // A torus faces +Z; turn the X and Y rings to face their own axes.
        rings[0]!.quaternion.copy(_turn.setFromAxisAngle(UNITS[1], Math.PI / 2));
        rings[1]!.quaternion.copy(_turn.setFromAxisAngle(UNITS[0], -Math.PI / 2));
        rings.forEach((ring, i) => gimbals[i]!.add(ring));

        group.add(body, ...bodyArrows, rotationArrow, handle, gimbals[0]);
        root.add(group);

        const euler = () => current.mode === "euler";
        const locked = () =>
            euler() && Math.abs(Math.cos(current.y * DEG_TO_RAD)) < GIMBAL_LOCK_COS;

        const updateQuaternion = (): void => {
            if (euler()) {
                q.setFromEulerXYZ(
                    current.x * DEG_TO_RAD,
                    current.y * DEG_TO_RAD,
                    current.z * DEG_TO_RAD,
                );
            } else {
                q.setFromAxisAngle(current.axis, current.angle * DEG_TO_RAD);
            }
        };

        const draw = (): void => {
            updateQuaternion();
            body.quaternion.copy(q);
            bodyArrows.forEach((arrow, i) => {
                q.rotateVec3(UNITS[i]!, _basis);
                arrow.update(ORIGIN, _basis, ARROW_LENGTH);
            });

            handle.visible = !euler();
            rotationArrow.visible = !euler();
            gimbals[0].visible = euler();
            if (!euler()) {
                _axis.copy(current.axis).normalize();
                rotationArrow.update(ORIGIN, _axis, AXIS_ARROW_LENGTH);
                handle.position.set(_axis.x, _axis.y, _axis.z).multiplyScalar(AXIS_ARROW_LENGTH);
                return;
            }
            gimbals[0].quaternion.copy(_turn.setFromAxisAngle(UNITS[0], current.x * DEG_TO_RAD));
            gimbals[1].quaternion.copy(_turn.setFromAxisAngle(UNITS[1], current.y * DEG_TO_RAD));
            gimbals[2].quaternion.copy(_turn.setFromAxisAngle(UNITS[2], current.z * DEG_TO_RAD));
            const isLocked = locked();
            rings.forEach((ring, i) =>
                ring.material.color.setHex(isLocked ? palette.warn : axisColors[i]!),
            );
        };

        /**
         * Aims the axis where the pointer's ray meets the sphere the handle moves on. Of the two
         * crossings, the one nearer the current tip wins; a ray that misses uses its closest
         * approach, so the tip follows the sphere's outline.
         */
        const dragAxis = (ray: Ray): void => {
            const r = AXIS_ARROW_LENGTH;
            const o = _rayOrigin.copy(ray.origin).subtract(CENTER);
            const d = ray.direction;
            const b = o.dot(d);
            const discriminant = b * b - (o.magnitudeSquared() - r * r);
            let hit: Vec3;
            if (discriminant < 0) {
                hit = _near.copy(o).addScaled(d, -b);
            } else {
                const s = Math.sqrt(discriminant);
                _near.copy(o).addScaled(d, -b - s);
                _far.copy(o).addScaled(d, -b + s);
                _tip.copy(current.axis).normalize().scale(r);
                hit = _near.distanceToSquared(_tip) <= _far.distanceToSquared(_tip) ? _near : _far;
            }
            if (hit.magnitudeSquared() < 1e-12) return;
            hit.normalize();
            const round = (v: number) => Math.round(v * 1000) / 1000;
            set({ axis: { x: round(hit.x), y: round(hit.y), z: round(hit.z) } });
        };
        const drag = new DragHandle(view, handle, dragAxis);

        draw();

        return {
            update(next, changed) {
                const previous = current;
                current = next;
                // Seed the new mode from the current orientation so the body doesn't jump.
                if (changed.has("mode") && changed.size === 1) {
                    const was =
                        previous.mode === "euler"
                            ? q.setFromEulerXYZ(
                                  previous.x * DEG_TO_RAD,
                                  previous.y * DEG_TO_RAD,
                                  previous.z * DEG_TO_RAD,
                              )
                            : q.setFromAxisAngle(previous.axis, previous.angle * DEG_TO_RAD);
                    if (next.mode === "euler") {
                        was.getEulerXYZ(_euler);
                        set({
                            x: _euler.x * RAD_TO_DEG,
                            y: _euler.y * RAD_TO_DEG,
                            z: _euler.z * RAD_TO_DEG,
                        });
                    } else {
                        const angle = was.getAxisAngle(_axis);
                        set({
                            axis: { x: _axis.x, y: _axis.y, z: _axis.z },
                            angle: angle * RAD_TO_DEG,
                        });
                    }
                }
                draw();
            },
            step() {},
            sync() {},
            readouts() {
                const angle = q.getAxisAngle(_axis);
                const e = q.getEulerXYZ(_euler);
                const m = _matrix.setFromQuaternion(q).elements;
                const row = (i: number) =>
                    [m[i * 3]!, m[i * 3 + 1]!, m[i * 3 + 2]!]
                        .map((v) => formatNumber(v, 3))
                        .join(" ");
                return [
                    {
                        title: "Quaternion",
                        rows: [
                            { label: "w", value: formatNumber(q.w) },
                            { label: "x", value: formatNumber(q.x) },
                            { label: "y", value: formatNumber(q.y) },
                            { label: "z", value: formatNumber(q.z) },
                            { label: "|q|", value: formatNumber(Math.hypot(q.w, q.x, q.y, q.z)) },
                        ],
                    },
                    {
                        title: "Axis–angle",
                        rows: [
                            {
                                label: "Axis",
                                value: [_axis.x, _axis.y, _axis.z]
                                    .map((v) => formatNumber(v, 2))
                                    .join(" "),
                            },
                            { label: "Angle", value: formatDegrees(angle) },
                        ],
                    },
                    {
                        title: "Euler XYZ",
                        rows: [
                            { label: "X", value: formatDegrees(e.x) },
                            { label: "Y", value: formatDegrees(e.y) },
                            { label: "Z", value: formatDegrees(e.z) },
                            ...(locked()
                                ? [
                                      {
                                          label: "Gimbal lock",
                                          value: "X and Z share an axis",
                                          warn: true,
                                      },
                                  ]
                                : []),
                        ],
                    },
                    {
                        title: "Rotation matrix",
                        rows: [
                            { label: "Row 1", value: row(0) },
                            { label: "Row 2", value: row(1) },
                            { label: "Row 3", value: row(2) },
                        ],
                    },
                ];
            },
            callouts: () => [
                {
                    at: CENTER,
                    text: locked()
                        ? "gimbal lock"
                        : `q ${[q.w, q.x, q.y, q.z].map((v) => formatNumber(v, 2).trim()).join(" ")}`,
                    ...(locked() ? { color: 0 as const } : {}),
                },
            ],
            dispose() {
                drag.dispose();
            },
        };
    },
});
