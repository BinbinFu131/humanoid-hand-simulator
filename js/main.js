'use strict';

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');

// ---------------------------------------------------------------- config
const CFG = {
  TABLE_Y: 384,
  HOME: { x: 200, y: 250 },
  GRASP_OFFSET_X: -98,   // wrist x relative to the object when grasping
  GRASP_DY: 112,         // wrist sits this far above the object centre
  LIFT_Y: 142,
  GRAVITY: 1600,
  FRICTION: 0.5,         // effective grip friction coefficient
  GAUGE_MAX: 100,        // N — full scale of the grip-force gauge
};

// payload library — weight scales with material, so a fixed grip force holds
// the light ones but slips on the heavy ones (drives the success-rate demo)
const PAYLOADS = [
  { key: 'FOAM',   r: 38, weight: 6,  cols: ['#bdf0d4', '#5cc295', '#2f7d5e'] },
  { key: 'RUBBER', r: 44, weight: 14, cols: ['#ffb45e', '#e2702a', '#a8431a'] },
  { key: 'WOOD',   r: 42, weight: 20, cols: ['#e8c98f', '#b98a4a', '#7d5a2f'] },
  { key: 'STEEL',  r: 40, weight: 30, cols: ['#e6edf6', '#9aa6b8', '#5b6677'] },
];

const hand = new Hand(CFG.HOME);
const ball = { x: 488, r: 44, y: 0, vy: 0, held: false, offset: { x: 0, y: 0 }, key: 'RUBBER', weight: 14, cols: PAYLOADS[1].cols };
let payloadIdx = 1;

function restY() { return CFG.TABLE_Y - ball.r; }
function requiredForce() { return ball.weight / CFG.FRICTION; }

function loadPayload(idx) {
  payloadIdx = idx;
  const p = PAYLOADS[idx];
  ball.key = p.key; ball.r = p.r; ball.weight = p.weight; ball.cols = p.cols;
  ball.x = 488; ball.y = restY(); ball.vy = 0; ball.held = false;
}
function nextPayload() {
  if (ball.held) return;
  let i = payloadIdx;
  while (i === payloadIdx) i = Math.floor(Math.random() * PAYLOADS.length);
  loadPayload(i);
}
loadPayload(1);

// ---------------------------------------------------------------- ui refs
const ui = {
  status: document.getElementById('status'),
  contacts: document.getElementById('contacts'),
  gripforce: document.getElementById('gripforce'),
  gripbar: document.getElementById('gripbar'),
  hold: document.getElementById('hold'),
  successrate: document.getElementById('successrate'),
  payload: document.getElementById('payload'),
  objstate: document.getElementById('objstate'),
  curl: document.getElementById('curl'),
  speed: document.getElementById('speed'),
  fset: document.getElementById('fset'),
  fsetval: document.getElementById('fsetval'),
  langToggle: document.getElementById('lang-toggle'),
};

const flash = { key: '', kind: '', until: 0 };
function notify(key, kind) { flash.key = key; flash.kind = kind || ''; flash.until = performance.now() + 1400; }
function setStatus(key) { ui.status.dataset.key = key; }

// ---------------------------------------------------------------- stats
const stats = { attempts: 0, successes: 0, pending: false };
function beginAttempt() { stats.attempts++; stats.pending = true; }
function resolveAttempt(ok) {
  if (!stats.pending) return;
  stats.pending = false;
  if (ok) { stats.successes++; notify('flash.ok', 'ok'); }
  else { notify('flash.slip', 'warn'); }
}

function holdSecure() {
  return hand.thumb.contact && hand.totalForce() * CFG.FRICTION >= ball.weight;
}
function graspSecured() {
  return hand.thumb.contact && hand.contactCount() >= 2;
}

// ---------------------------------------------------------------- sequencer
const seq = { steps: [], i: -1, t: 0 };

function runSteps(steps) { seq.steps = steps; seq.i = -1; nextStep(); }
function nextStep() {
  seq.i++;
  seq.t = 0;
  if (seq.i >= seq.steps.length) {
    seq.steps = [];
    setStatus(ball.held ? 'st.HOLD' : 'st.IDLE');
    return;
  }
  const s = seq.steps[seq.i];
  if (s.label) setStatus(s.label);
  if (s.enter) s.enter();
}

const Steps = {
  open: () => ({
    label: 'st.OPEN',
    enter() { hand.contactStop = false; hand.setTargets(0); },
    done: () => hand.settled(),
  }),
  fist: () => ({
    label: 'st.FIST',
    enter() { hand.contactStop = false; hand.setTargets(1); },
    done: () => hand.settled(),
  }),
  pause: s => ({ done: t => t >= s }),
  reach: () => ({
    label: 'st.REACH',
    enter() { hand.contactStop = true; hand.moveTo(ball.x + CFG.GRASP_OFFSET_X, ball.y - CFG.GRASP_DY); },
    done: () => hand.atMoveTarget(),
  }),
  grasp: () => ({
    label: 'st.CLOSE',
    enter() { hand.contactStop = true; hand.setTargets(1); },
    done: t => (graspSecured() && holdSecure() && t > 0.3) || t > 3.2,
  }),
  attach: () => ({
    label: 'st.ADAPT',
    enter() {
      beginAttempt();
      if (graspSecured()) {
        ball.held = true;
        ball.offset.x = ball.x - hand.origin.x;
        ball.offset.y = ball.y - hand.origin.y;
      } else {
        resolveAttempt(false);
      }
    },
    done: t => t >= 0.35,
  }),
  lift: () => ({
    label: 'st.LIFT',
    enter() { if (ball.held) hand.moveTo(hand.origin.x, CFG.LIFT_Y); },
    done() {
      if (hand.atMoveTarget()) { resolveAttempt(ball.held); return true; }
      return false;
    },
  }),
  lower: () => ({
    label: 'st.LOWER',
    enter() { if (ball.held) hand.moveTo(hand.origin.x, restY() - CFG.GRASP_DY); },
    done: () => hand.atMoveTarget(),
  }),
  release: () => ({
    label: 'st.RELEASE',
    enter() { hand.contactStop = false; hand.setTargets(0); },
    done: () => hand.settled(),
  }),
  home: () => ({
    label: 'st.HOME',
    enter() { hand.moveTo(hand.home.x, hand.home.y); },
    done: () => hand.atMoveTarget(),
  }),
  swap: () => ({ enter() { nextPayload(); }, done: () => true }),
};

// ---------------------------------------------------------------- controls
document.getElementById('btn-open').addEventListener('click', () => {
  if (ball.held) runSteps([Steps.lower(), Steps.release(), Steps.home()]);
  else runSteps([Steps.open()]);
});
document.getElementById('btn-fist').addEventListener('click', () => {
  const pre = ball.held ? [Steps.lower(), Steps.release(), Steps.home()] : [];
  runSteps([...pre, Steps.fist()]);
});
document.getElementById('btn-grasp').addEventListener('click', () => {
  if (ball.held) return;
  runSteps([Steps.open(), Steps.reach(), Steps.grasp(), Steps.attach(), Steps.lift()]);
});
document.getElementById('btn-seq').addEventListener('click', () => {
  const pre = ball.held ? [Steps.lower(), Steps.release()] : [];
  runSteps([
    ...pre,
    Steps.home(), Steps.open(), Steps.pause(0.3),
    Steps.fist(), Steps.pause(0.6),
    Steps.open(), Steps.pause(0.3),
    Steps.reach(), Steps.grasp(), Steps.attach(),
    Steps.lift(), Steps.pause(0.9),
    Steps.lower(), Steps.release(), Steps.home(),
    Steps.swap(),
  ]);
});
document.getElementById('btn-next').addEventListener('click', () => {
  if (ball.held || seq.steps.length) return;
  nextPayload();
});

ui.curl.addEventListener('input', () => {
  seq.steps = [];
  setStatus('st.MANUAL');
  hand.contactStop = true;
  hand.setTargets(ui.curl.value / 100);
});
ui.speed.addEventListener('input', () => { hand.speed = ui.speed.value / 100; });
ui.fset.addEventListener('input', () => {
  hand.forceLimit = +ui.fset.value;
  ui.fsetval.textContent = ui.fset.value + ' N';
});
document.getElementById('reset-stats').addEventListener('click', () => {
  stats.attempts = 0; stats.successes = 0; stats.pending = false;
});
ui.langToggle.addEventListener('click', () => {
  setLang(LANG === 'en' ? 'zh' : 'en');
  ui.langToggle.textContent = LANG === 'en' ? '中文' : 'EN';
});

// ---------------------------------------------------------------- physics
function updateContacts() {
  for (const f of hand.all) {
    f.contact = false;
    const pts = f.points;
    for (let i = Math.max(1, pts.length - 2); i < pts.length; i++) {
      const w = f.widths[Math.min(i - 1, f.widths.length - 1)];
      if (dist(pts[i].x, pts[i].y, ball.x, ball.y) <= ball.r + w / 2 + 2) {
        f.contact = true;
        break;
      }
    }
  }
}

function updateBall(dt) {
  if (ball.held && (!graspSecured() || !holdSecure())) {
    ball.held = false;
    resolveAttempt(false);
  }

  if (ball.held) {
    ball.x = hand.origin.x + ball.offset.x;
    ball.y = hand.origin.y + ball.offset.y;
    ball.vy = 0;
  } else if (ball.y < restY() || ball.vy !== 0) {
    ball.vy += CFG.GRAVITY * dt;
    ball.y += ball.vy * dt;
    if (ball.y >= restY()) {
      ball.y = restY();
      ball.vy = Math.abs(ball.vy) > 120 ? -ball.vy * 0.32 : 0;
    }
  }
}

// ---------------------------------------------------------------- telemetry
const telemetryRows = hand.all.map(f => {
  const tr = document.createElement('tr');
  const name = document.createElement('td');
  const curl = document.createElement('td');
  const force = document.createElement('td');
  const ct = document.createElement('td');
  const led = document.createElement('span');
  led.className = 'led';
  ct.appendChild(led);
  tr.append(name, curl, force, ct);
  document.getElementById('telemetry-body').appendChild(tr);
  return { f, name, curl, force, led };
});

function updateTelemetry() {
  for (const row of telemetryRows) {
    row.name.textContent = t('finger.' + row.f.name);
    row.curl.textContent = Math.round(row.f.curl * 100) + '%';
    row.force.textContent = row.f.force.toFixed(1) + ' N';
    row.led.classList.toggle('on', row.f.contact);
  }
  const total = hand.totalForce();
  ui.contacts.textContent = `${hand.contactCount()} / 5`;
  ui.gripforce.textContent = total.toFixed(1) + ' N';
  ui.gripbar.style.width = clamp((total / CFG.GAUGE_MAX) * 100, 0, 100) + '%';

  const secure = holdSecure();
  ui.gripbar.classList.toggle('secure', secure);
  if (total < 0.5) { ui.hold.textContent = t('hold.none'); ui.hold.className = ''; }
  else if (secure) { ui.hold.textContent = t('hold.secure'); ui.hold.className = 'ok'; }
  else { ui.hold.textContent = t('hold.slip'); ui.hold.className = 'warn'; }

  const rate = stats.attempts ? Math.round((stats.successes / stats.attempts) * 100) : 0;
  ui.successrate.textContent = stats.attempts
    ? `${rate}% (${stats.successes}/${stats.attempts})`
    : '— (0/0)';

  ui.payload.textContent = `${t('mat.' + ball.key)} · ${ball.weight} N`;
  ui.objstate.textContent = ball.held
    ? t('obj.IN_GRIP')
    : (ball.y >= restY() - 0.5 ? t('obj.ON_TABLE') : t('obj.FALLING'));

  const now = performance.now();
  if (now < flash.until) {
    ui.status.textContent = t(flash.key);
    ui.status.className = 'status-value ' + flash.kind;
  } else {
    ui.status.textContent = t(ui.status.dataset.key || 'st.IDLE');
    ui.status.className = 'status-value';
  }
}

// ---------------------------------------------------------------- canvas / loop
function fitCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = VIEW_W * dpr;
  canvas.height = VIEW_H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

let last = performance.now();
let frameCount = 0;

function frame(now) {
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = now;

  if (seq.steps.length) {
    seq.t += dt;
    if (seq.steps[seq.i].done(seq.t)) nextStep();
  }

  hand.step(dt);
  updateBall(dt);
  updateContacts();

  drawScene(ctx, hand, ball, {
    tableY: CFG.TABLE_Y,
    gripForce: hand.totalForce(),
    requiredForce: requiredForce(),
    gaugeMax: CFG.GAUGE_MAX,
    holdSecure: holdSecure(),
  });

  if ((frameCount++ & 3) === 0) updateTelemetry();
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- boot
applyStaticI18n();
ui.langToggle.textContent = LANG === 'en' ? '中文' : 'EN';
setStatus('st.IDLE');
ui.fsetval.textContent = ui.fset.value + ' N';
hand.forceLimit = +ui.fset.value;
hand.step(0);
updateContacts();
updateTelemetry();
requestAnimationFrame(frame);
