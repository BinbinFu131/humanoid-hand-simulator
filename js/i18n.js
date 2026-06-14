'use strict';

// Tiny i18n layer. Dynamic strings are looked up by key via t(key); static
// HTML carries data-i18n="key" and is filled by applyStaticI18n().
const I18N = {
  en: {
    'ui.title': 'Humanoid Robotic Hand Simulator',
    'ui.subtitle': '14-DOF five-finger robotic hand — force-controlled grasping with contact sensing, grip-force regulation, variable payloads, and grasp success tracking',
    'ui.ctrlstate': 'CONTROLLER STATE',
    'ui.contacts': 'Contacts',
    'ui.gripforce': 'Grip force',
    'ui.hold': 'Hold',
    'ui.successrate': 'Success rate',
    'ui.payload': 'Payload',
    'ui.object': 'Object',

    'btn.open': 'Open Palm',
    'btn.fist': 'Make Fist',
    'btn.grasp': 'Grasp Object',
    'btn.seq': '▶ Full Sequence',
    'btn.next': '↻ Next Payload',

    'ctl.gripforce': 'Grip force',
    'ctl.curl': 'Manual curl',
    'ctl.speed': 'Joint speed',

    'tel.title': 'JOINT TELEMETRY',
    'tel.reset': 'RESET',
    'th.finger': 'FINGER',
    'th.curl': 'CURL',
    'th.force': 'FORCE',
    'th.ct': 'CT',
    'footer': 'Vanilla JS + Canvas2D · forward kinematics · force-limited actuation · friction-based hold · no dependencies',

    'finger.THUMB': 'THUMB',
    'finger.INDEX': 'INDEX',
    'finger.MIDDLE': 'MIDDLE',
    'finger.RING': 'RING',
    'finger.PINKY': 'PINKY',

    'st.IDLE': 'IDLE',
    'st.MANUAL': 'MANUAL CONTROL',
    'st.OPEN': 'OPENING PALM',
    'st.FIST': 'MAKING FIST',
    'st.REACH': 'PLANNING APPROACH',
    'st.CLOSE': 'CLOSING GRIP',
    'st.ADAPT': 'ADAPTIVE GRIP',
    'st.LIFT': 'LIFTING OBJECT',
    'st.LOWER': 'LOWERING',
    'st.RELEASE': 'RELEASING',
    'st.HOME': 'RETURNING HOME',
    'st.HOLD': 'HOLDING OBJECT',

    'hold.secure': 'SECURE',
    'hold.slip': 'SLIP RISK',
    'hold.none': '—',

    'obj.ON_TABLE': 'ON TABLE',
    'obj.IN_GRIP': 'IN GRIP',
    'obj.FALLING': 'FALLING',

    'flash.ok': 'GRASP OK ✓',
    'flash.slip': 'SLIP — DROPPED',

    'canvas.overlay': 'HRH-01 · 14 DOF · FORCE-CONTROLLED GRASP · SIDE VIEW',
    'gauge.grip': 'GRIP',
    'gauge.min': 'min',

    'mat.FOAM': 'FOAM',
    'mat.RUBBER': 'RUBBER',
    'mat.WOOD': 'WOOD',
    'mat.STEEL': 'STEEL',
  },
  zh: {
    'ui.title': '仿人机械手模拟器',
    'ui.subtitle': '14 自由度五指机械手 —— 力控抓取，含接触感知、抓握力调节、可变负载与抓取成功率统计',
    'ui.ctrlstate': '控制器状态',
    'ui.contacts': '接触点',
    'ui.gripforce': '抓握力',
    'ui.hold': '保持',
    'ui.successrate': '成功率',
    'ui.payload': '负载',
    'ui.object': '物体',

    'btn.open': '张开手掌',
    'btn.fist': '握拳',
    'btn.grasp': '抓取物体',
    'btn.seq': '▶ 完整流程',
    'btn.next': '↻ 更换负载',

    'ctl.gripforce': '抓握力',
    'ctl.curl': '手动卷曲',
    'ctl.speed': '关节速度',

    'tel.title': '关节遥测',
    'tel.reset': '重置',
    'th.finger': '手指',
    'th.curl': '卷曲',
    'th.force': '接触力',
    'th.ct': '接触',
    'footer': '原生 JS + Canvas2D · 正向运动学 · 力限驱动 · 摩擦保持 · 零依赖',

    'finger.THUMB': '拇指',
    'finger.INDEX': '食指',
    'finger.MIDDLE': '中指',
    'finger.RING': '无名指',
    'finger.PINKY': '小指',

    'st.IDLE': '空闲',
    'st.MANUAL': '手动控制',
    'st.OPEN': '张开手掌',
    'st.FIST': '握拳中',
    'st.REACH': '规划接近路径',
    'st.CLOSE': '闭合抓取',
    'st.ADAPT': '自适应抓握',
    'st.LIFT': '举起物体',
    'st.LOWER': '放下中',
    'st.RELEASE': '释放中',
    'st.HOME': '返回原位',
    'st.HOLD': '保持物体',

    'hold.secure': '牢固',
    'hold.slip': '打滑风险',
    'hold.none': '—',

    'obj.ON_TABLE': '在台面',
    'obj.IN_GRIP': '已抓取',
    'obj.FALLING': '下落中',

    'flash.ok': '抓取成功 ✓',
    'flash.slip': '打滑 — 掉落',

    'canvas.overlay': 'HRH-01 · 14 自由度 · 力控抓取 · 侧视图',
    'gauge.grip': '抓握力',
    'gauge.min': '下限',

    'mat.FOAM': '泡沫',
    'mat.RUBBER': '橡胶',
    'mat.WOOD': '木质',
    'mat.STEEL': '钢质',
  },
};

let LANG = window.__FORCE_LANG__
  || new URLSearchParams(location.search).get('lang')
  || 'en';

function t(k) {
  const d = I18N[LANG] || I18N.en;
  if (k in d) return d[k];
  if (k in I18N.en) return I18N.en[k];
  return k;
}

function applyStaticI18n() {
  document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : 'en';
  document.title = t('ui.title');
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
}

function setLang(l) {
  LANG = l;
  applyStaticI18n();
}
