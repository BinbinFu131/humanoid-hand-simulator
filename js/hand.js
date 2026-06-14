'use strict';

/**
 * One articulated finger: a planar chain rooted on the palm.
 *
 * Actuation is a *force-limited position controller*, like a tendon-driven
 * robotic finger:
 *   - `target` is the commanded joint curl ∈ [0,1].
 *   - `cmd` is the actuator position, ramped toward `target` but never pushed
 *     more than `forceLimit / stiffness` past the actual joint — so the
 *     contact force it can exert is capped by the commanded grip force.
 *   - `curl` is the real joint angle. It tracks `cmd` in free motion, but
 *     freezes the instant the finger contacts the object (in grasp mode), so
 *     the hand conforms to the object instead of crushing through it.
 *   - `force = stiffness · (cmd − curl)` while blocked: the actuator over-drive
 *     against the stalled joint is the contact normal force (N).
 */
class Finger {
  constructor(name, cfg) {
    this.name = name;
    this.baseOffset = cfg.baseOffset;            // relative to palm origin
    this.baseAngle = cfg.baseAngle * DEG;
    this.lengths = cfg.lengths;
    this.widths = cfg.widths;                    // visual link widths
    this.maxAngles = cfg.maxAngles.map(a => a * DEG);
    this.maxForce = cfg.maxForce || 34;          // saturation force (N)
    this.curl = 0;
    this.cmd = 0;
    this.target = 0;
    this.contact = false;
    this.force = 0;
    this.points = [];
  }

  jointAngles() {
    return this.maxAngles.map(a => a * this.curl);
  }

  step(origin, dt, speed, opts) {
    const { contactStop, forceLimit, stiffness } = opts;

    // Force ceiling: when closing, the actuator may lead the joint by at most
    // forceLimit/stiffness, which caps the deliverable contact force.
    const headroom = forceLimit / stiffness;
    const cmdCeil = this.target > this.curl
      ? Math.min(this.target, this.curl + headroom)
      : this.target;
    this.cmd = approach(this.cmd, cmdCeil, speed * dt);

    if (contactStop && this.contact && this.cmd > this.curl) {
      // Joint stalled against the object: hold position, build contact force.
      this.force = clamp(stiffness * (this.cmd - this.curl), 0, this.maxForce);
    } else {
      // Free motion: joint follows the actuator, no contact force.
      this.curl = clamp(this.cmd, 0, 1);
      this.force = 0;
    }

    const base = {
      x: origin.x + this.baseOffset.x,
      y: origin.y + this.baseOffset.y,
    };
    this.points = forwardKinematics(base, this.baseAngle, this.lengths, this.jointAngles());
  }

  tip() {
    return this.points[this.points.length - 1];
  }

  settled() {
    return Math.abs(this.target - this.curl) < 0.01 && Math.abs(this.cmd - this.curl) < 0.01;
  }
}

/**
 * Five-finger hand: 4 fingers × 3 joints + thumb × 2 joints = 14 DOF,
 * on a 2-DOF translational wrist carrier (reach / lift).
 */
class Hand {
  constructor(origin) {
    this.origin = { ...origin };
    this.home = { ...origin };
    this.moveTarget = { ...origin };
    this.speed = 1.4;          // curl units per second
    this.moveSpeed = 220;      // wrist translation, px per second
    this.contactStop = false;  // grasp mode: stop each finger on contact
    this.stiffness = 80;       // N per curl unit (tendon stiffness)
    this.forceLimit = 14;      // commanded grip force ceiling (N)

    this.fingers = [
      new Finger('INDEX',  { baseOffset: { x: 0, y: -62 }, baseAngle: -8, lengths: [56, 40, 28], widths: [21, 17, 13], maxAngles: [78, 86, 44] }),
      new Finger('MIDDLE', { baseOffset: { x: 0, y: -22 }, baseAngle: -2, lengths: [60, 45, 30], widths: [22, 18, 14], maxAngles: [78, 86, 44] }),
      new Finger('RING',   { baseOffset: { x: 0, y: 18 },  baseAngle: 3,  lengths: [56, 42, 28], widths: [21, 17, 13], maxAngles: [78, 86, 44] }),
      new Finger('PINKY',  { baseOffset: { x: 0, y: 56 },  baseAngle: 0,  lengths: [44, 33, 22], widths: [18, 15, 12], maxAngles: [78, 86, 44] }),
    ];
    this.thumb = new Finger('THUMB', {
      baseOffset: { x: -14, y: 80 }, baseAngle: 34,
      lengths: [50, 40], widths: [24, 19], maxAngles: [-34, -40], maxForce: 38,
    });
    this.all = [this.thumb, ...this.fingers];
  }

  setTargets(curl) {
    for (const f of this.all) f.target = curl;
  }

  moveTo(x, y) {
    this.moveTarget = { x, y };
  }

  step(dt) {
    const dx = this.moveTarget.x - this.origin.x;
    const dy = this.moveTarget.y - this.origin.y;
    const d = Math.hypot(dx, dy);
    const maxMove = this.moveSpeed * dt;
    if (d > 0 && d > maxMove) {
      this.origin.x += (dx / d) * maxMove;
      this.origin.y += (dy / d) * maxMove;
    } else {
      this.origin.x = this.moveTarget.x;
      this.origin.y = this.moveTarget.y;
    }
    const opts = { contactStop: this.contactStop, forceLimit: this.forceLimit, stiffness: this.stiffness };
    for (const f of this.all) f.step(this.origin, dt, this.speed, opts);
  }

  atMoveTarget() {
    return dist(this.origin.x, this.origin.y, this.moveTarget.x, this.moveTarget.y) < 0.5;
  }

  settled() {
    return this.all.every(f => f.settled() || (this.contactStop && f.contact));
  }

  contactCount() {
    return this.all.filter(f => f.contact).length;
  }

  totalForce() {
    let s = 0;
    for (const f of this.all) s += f.force;
    return s;
  }
}
