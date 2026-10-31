import assert from "node:assert/strict";
import test from "node:test";
import {
  computeExplodedAssemblyLayout,
  layoutArchifyCalloutRails,
} from "../kit/exploded-callout-layout.mjs";

const projection = { origin: [400, 300], scale: 2, azimuth: 45, elevation: 30 };

test("computeExplodedAssemblyLayout projects 3D explosion vectors and orders back-to-front", () => {
  const parts = [
    {
      id: "rear-housing",
      label: "Rear Housing",
      anchor3d: [-20, -20, 0],
      explodeVector3d: [-30, -30, 0],
    },
    {
      id: "core-stator",
      label: "Core Stator",
      anchor3d: [0, 0, 10],
      explodeVector3d: [0, 0, 0],
    },
    {
      id: "front-impeller",
      label: "Front Impeller",
      anchor3d: [20, 20, 20],
      explodeVector3d: [30, 30, 15],
    },
  ];

  const layout = computeExplodedAssemblyLayout(parts, projection, 1.0);
  assert.equal(layout.parts.length, 3);
  assert.deepEqual(layout.backToFrontOrder, [
    "rear-housing",
    "core-stator",
    "front-impeller",
  ]);
  assert.ok(layout.parts[0].explosionTracePath.startsWith("M"));
});

test("layoutArchifyCalloutRails resolves tightly clustered callout anchors without vertical overlap", () => {
  const parts = [
    { id: "p1", label: "Valve A", anchor3d: [15, -5, 10], explodeVector3d: [10, 0, 0] },
    { id: "p2", label: "Valve B", anchor3d: [16, -4, 9], explodeVector3d: [10, 0, 0] },
    { id: "p3", label: "Valve C", anchor3d: [17, -3, 8], explodeVector3d: [10, 0, 0] },
    { id: "p4", label: "Left Frame", anchor3d: [-25, 15, 5], explodeVector3d: [-15, 0, 0] },
  ];

  const exploded = computeExplodedAssemblyLayout(parts, projection, 1.0);
  const rails = layoutArchifyCalloutRails(exploded, { minGapPx: 30 });

  assert.equal(rails.callouts.length, 4);
  assert.ok(rails.minVerticalSpacingOnRight >= 30 - 1e-6);
  for (const callout of rails.callouts) {
    assert.ok(callout.leaderPath.startsWith("M"));
  }
});
