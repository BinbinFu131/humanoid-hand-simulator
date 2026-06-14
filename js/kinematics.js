'use strict';

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

// Logical drawing coordinates. The canvas backing store is scaled by the
// device pixel ratio for crisp rendering, but all geometry uses these units.
const VIEW_W = 760;
const VIEW_H = 520;

/**
 * Planar forward kinematics for an open kinematic chain.
 *
 * base        {x, y}  world position of the root joint
 * baseAngle   number  orientation of the chain root (radians)
 * lengths     number[] segment lengths
 * jointAngles number[] relative joint rotations (radians)
 *
 * Returns the chain points [root, j1, ..., tip]. Each point carries the
 * absolute angle of the segment that leaves it.
 */
function forwardKinematics(base, baseAngle, lengths, jointAngles) {
  const pts = [{ x: base.x, y: base.y, angle: baseAngle }];
  let angle = baseAngle;
  let x = base.x;
  let y = base.y;
  for (let i = 0; i < lengths.length; i++) {
    angle += jointAngles[i];
    pts[i].angle = angle;
    x += Math.cos(angle) * lengths[i];
    y += Math.sin(angle) * lengths[i];
    pts.push({ x, y, angle });
  }
  return pts;
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

// Move `from` toward `to` by at most `maxStep`.
function approach(from, to, maxStep) {
  const d = to - from;
  if (Math.abs(d) <= maxStep) return to;
  return from + Math.sign(d) * maxStep;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
