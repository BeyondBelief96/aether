import { Line, Mesh, Points, type Object3D } from 'three';

/**
 * Frees the GPU resources of everything under `root`. Call after removing it from the scene.
 *
 * Disposes the geometry and material(s) of every Mesh, Line and Points, and calls each
 * object's own `dispose()` so helpers like ArrowHelper free what they own. Some resources
 * get disposed twice (an ArrowHelper's cone is also a Mesh child), which Three.js allows.
 */
export function disposeObject(root: Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof Mesh || obj instanceof Line || obj instanceof Points) {
      obj.geometry.dispose();
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const material of materials) material.dispose();
    }
    obj.dispose();
  });
}
