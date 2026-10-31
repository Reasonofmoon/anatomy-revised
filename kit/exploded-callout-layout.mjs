/**
 * REA Track 7 — Anatomy Revised (Isometric Exploded-View & Archify Callout Rail Solver)
 *
 * Applies:
 *   - MagicaVoxel (#007) & Marmoset Toolbag (#008) 3D exploded-view displacement & painter depth sorting
 *   - Paper-rs (#002) & Archify collision-free margin callout rail relaxation + dogleg SVG leader generation
 */

import { iso, depthOf, pathOf } from "./iso-kit.mjs";

/**
 * Computes assembled and exploded 3D/2D coordinates, explosion axis leader paths,
 * and back-to-front painter's depth order for an isometric assembly.
 */
export function computeExplodedAssemblyLayout(parts, projection, explodeFactor = 1.0) {
  if (!Array.isArray(parts)) {
    throw new Error("parts must be an array");
  }
  const factor = Number(explodeFactor ?? 1.0);

  const computed = parts.map((part) => {
    const [ax, ay, az] = part.anchor3d || [0, 0, 0];
    const [dx, dy, dz] = part.explodeVector3d || [0, 0, 0];
    const exploded3d = [
      ax + dx * factor,
      ay + dy * factor,
      az + dz * factor,
    ];
    const assembled2d = iso([ax, ay, az], projection);
    const exploded2d = iso(exploded3d, projection);
    const cameraDepth = depthOf(exploded3d, projection);
    const explosionTracePath = pathOf([assembled2d, exploded2d], false);

    return {
      id: part.id,
      label: part.label || part.id,
      assembled3d: [ax, ay, az],
      exploded3d,
      assembled2d,
      exploded2d,
      cameraDepth,
      explosionTracePath,
    };
  });

  // Painter's algorithm order: lowest depth (furthest from viewer) to highest depth (nearest)
  const backToFrontOrder = [...computed]
    .sort((a, b) => a.cameraDepth - b.cameraDepth || String(a.id).localeCompare(String(b.id)))
    .map((p) => p.id);

  return {
    explodeFactor: factor,
    parts: computed,
    backToFrontOrder,
  };
}

/**
 * Solves 1D vertical badge positions along a margin rail so no two callout badges
 * come closer than `minGapPx`.
 */
function relaxVerticalRail(items, minGapPx, minY, maxY) {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => a.anchorY - b.anchorY);
  const ys = sorted.map((item) => Math.max(minY, Math.min(maxY, item.anchorY)));

  // Forward pass: push down overlapping items
  for (let i = 1; i < ys.length; i++) {
    if (ys[i] < ys[i - 1] + minGapPx) {
      ys[i] = ys[i - 1] + minGapPx;
    }
  }

  // Clamp last to maxY and backward pass if needed
  if (ys[ys.length - 1] > maxY) {
    ys[ys.length - 1] = maxY;
    for (let i = ys.length - 2; i >= 0; i--) {
      if (ys[i] > ys[i + 1] - minGapPx) {
        ys[i] = Math.max(minY, ys[i + 1] - minGapPx);
      }
    }
  }

  return sorted.map((item, idx) => ({
    ...item,
    badgeY: ys[idx],
  }));
}

/**
 * Partitions exploded parts into left and right Archify margin callout rails,
 * resolves vertical label collisions, and emits SVG dogleg leader paths.
 */
export function layoutArchifyCalloutRails(explodedLayout, options = {}) {
  const {
    leftRailX = 80,
    rightRailX = 720,
    elbowOffsetPx = 28,
    minGapPx = 28,
    minY = 40,
    maxY = 560,
  } = options;

  const parts = explodedLayout?.parts || [];
  if (parts.length === 0) {
    return { callouts: [], minVerticalSpacingOnLeft: Infinity, minVerticalSpacingOnRight: Infinity };
  }

  const centerX =
    parts.reduce((acc, p) => acc + p.exploded2d[0], 0) / parts.length;

  const leftItems = [];
  const rightItems = [];

  for (const part of parts) {
    const [anchorX, anchorY] = part.exploded2d;
    const side = anchorX < centerX ? "left" : "right";
    const entry = {
      id: part.id,
      label: part.label,
      side,
      anchorX,
      anchorY,
    };
    if (side === "left") leftItems.push(entry);
    else rightItems.push(entry);
  }

  const solvedLeft = relaxVerticalRail(leftItems, minGapPx, minY, maxY).map((item) => {
    const railX = leftRailX;
    const elbowX = railX + elbowOffsetPx;
    return {
      ...item,
      railX,
      elbowX,
      leaderPath: pathOf(
        [
          [item.anchorX, item.anchorY],
          [elbowX, item.anchorY],
          [railX, item.badgeY],
        ],
        false
      ),
    };
  });

  const solvedRight = relaxVerticalRail(rightItems, minGapPx, minY, maxY).map((item) => {
    const railX = rightRailX;
    const elbowX = railX - elbowOffsetPx;
    return {
      ...item,
      railX,
      elbowX,
      leaderPath: pathOf(
        [
          [item.anchorX, item.anchorY],
          [elbowX, item.anchorY],
          [railX, item.badgeY],
        ],
        false
      ),
    };
  });

  const minSpacing = (arr) => {
    if (arr.length < 2) return Infinity;
    let m = Infinity;
    for (let i = 1; i < arr.length; i++) {
      m = Math.min(m, arr[i].badgeY - arr[i - 1].badgeY);
    }
    return m;
  };

  return {
    callouts: [...solvedLeft, ...solvedRight],
    minVerticalSpacingOnLeft: minSpacing(solvedLeft),
    minVerticalSpacingOnRight: minSpacing(solvedRight),
  };
}
