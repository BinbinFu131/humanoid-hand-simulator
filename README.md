# Humanoid Robotic Hand Simulator

An interactive, browser-based simulation of a five-finger humanoid robotic hand,
built from scratch with **vanilla JavaScript and Canvas2D — zero dependencies**.

The hand is modeled as a planar kinematic system with **14 actuated degrees of
freedom** (4 fingers × 3 revolute joints + thumb × 2 revolute joints) on a
2-DOF translational wrist carrier, and demonstrates the canonical manipulation
sequence: **open palm → fist → grasp object → lift**.

## Demo

Open `index.html` in any modern browser — no build step, no server required.
Add `?lang=zh` for Chinese, or use the in-page language toggle.

```bash
# or serve it locally
npx serve .

# build single-file, no-dependency bundles (English + Chinese):
python3 build.py   # -> HandSimulator.html, HandSimulator.zh.html
```

## Features

- **Forward kinematics** — each finger is an open kinematic chain; joint
  positions are computed analytically every frame (`js/kinematics.js`).
- **Force-limited actuation** — each finger is a tendon-style position
  controller with a commanded grip-force ceiling: the actuator only leads the
  joint by `force / stiffness`, so contact force is regulated, not unbounded.
- **Grip force sensing + regulation** — per-finger contact normal force is
  reported live (N), summed into a total grip force with an on-canvas gauge;
  the **Grip force** slider sets the commanded force the controller closes to.
- **Contact-aware grasping** — fingertip/distal-joint contact is detected
  geometrically each frame; in grasp mode every finger stops closing on
  contact, so the hand **conforms to the object** instead of crushing through.
- **Friction-based hold & grasp success rate** — the object is held only while
  `friction × grip force ≥ weight` (plus thumb opposition). Too little grip
  force and it **slips and falls** mid-lift. Each pick is scored, and a running
  **success rate** (successes / attempts) is tracked — set the grip force too
  low and watch the rate drop.
- **Variable payloads** — a payload library (foam / rubber / wood / steel) with
  weights from 6 N to 30 N. At a fixed grip force the light ones hold and the
  heavy ones slip, so the success rate reflects a real payload mix. **Next
  Payload** cycles them; **Full Sequence** auto-swaps after each cycle.
- **Bilingual (English / 中文)** — full i18n with a live language toggle; the
  build also emits a Chinese-default mirror (`?lang=zh` works too).
- **Motion sequencer** — a small state machine chains primitives
  (open / fist / reach / close / lift / lower / release) into full
  pick-and-place cycles.
- **Live telemetry** — per-finger curl %, contact force (N), contact LEDs,
  total grip force, hold status (SECURE / SLIP RISK), and controller state.
- **HiDPI canvas + responsive** — backing store scaled to the device pixel
  ratio for crisp rendering; the layout reflows to a single column on phones.
- **Manual control** — grip-force, master-curl and joint-speed sliders for
  direct teleoperation-style control.

## Architecture

| File | Responsibility |
| --- | --- |
| `js/kinematics.js` | Planar forward kinematics + math utilities |
| `js/hand.js` | `Finger` / `Hand` models: joint limits, curl dynamics, contact-stop |
| `js/renderer.js` | Canvas2D rendering: links, joints, object, scene |
| `js/main.js` | Simulation loop, contact detection, sequencer, gravity, UI |

The simulation runs a fixed pipeline per animation frame:

```
sequencer → joint integration (FK) → object dynamics → contact detection → render
```

## Roadmap

- Inverse kinematics for fingertip target placement
- Object library (cylinders, boxes) and force-closure analysis
- 3D version (WebGL / Three.js) with a full hand mesh
- ROS bridge to replay real joint trajectories

## License

MIT
