// 四人局的协作顶栏：官方 prefab 只有两个座位（[my] / [you]），这里按同一套美术复制出 [mate2] / [mate3]。
//
// 为什么是复制而不是新画：仓库没有 prefab 制作工具链，官方也没有 4 人版的顶栏。复制官方节点能保证图标、
// 字号、间距、九宫格底图全部沿用原作，新增的两席只换 tint 与 x 位置；左右两席各自向内让 172px，正好落在
// 生命数字与中央 `icon_you_with_info` 之间的空档里（左空档 -297..-50.3，右空档 76.7..292.6）。
//
// 幂等：目标节点已存在时先删掉再插，重复跑不会叠加。
// 用法：node tools/seat4-topbar.mjs <in battle.json> <out battle.json>
import fs from 'node:fs';

const PANEL = 'panel_cooperate_normal_and_fortress_status';
/** 官方两席的 tint：我 = 蓝，队友 = 绿（`[my]/[you]icon_life_point` 的 text 与 group_icon）。 */
const MY_TINT = [0, 0.5961, 0.8627, 1];
const YOU_TINT = [0, 0.5725, 0.5137, 1];
/** 新增两席沿用同色系、只提亮度：左侧一席偏亮蓝，右侧一席偏亮青绿，蓝=左侧、绿=右侧的语义不变。 */
const MATE2_TINT = [0.3373, 0.7922, 0.9412, 1];
const MATE3_TINT = [0.3608, 0.8078, 0.7098, 1];
/** 新席位的 x：左右各一席，对称。 */
const MATE2_X = -227.5;
const MATE3_X = 227.5;

/** 把子树里等于 `from` 的颜色全换成 `to`（只比对 rgb，alpha 保持）。 */
function retint(node, from, to) {
  for (const c of Object.values(node.comps ?? {})) {
    if (Array.isArray(c?.color) && c.color.slice(0, 3).every((v, i) => Math.abs(v - from[i]) < 1e-4)) c.color = [...to];
  }
  for (const k of node.children ?? []) retint(k, from, to);
}

/**
 * 复制一个座位节点到新的 x、新前缀与新 tint。子树位置不动（都是相对父节点），只改根节点的 pos，
 * 这样图标与生命数字、复活计时的相对关系原封不动。
 * @param {any} src @param {string} tag @param {number} x @param {number[]} tint
 */
function seat(src, tag, x, tint) {
  const cp = structuredClone(src);
  cp.name = src.name.replace(/^\[(my|you)\]/, `[${tag}]`);
  cp.rt.pos = [x, cp.rt.pos[1]];
  retint(cp, src.name.startsWith('[my]') ? MY_TINT : YOU_TINT, tint);
  return cp;
}

const [, , inFile, outFile] = process.argv;
if (!inFile || !outFile) {
  console.error('usage: node tools/seat4-topbar.mjs <in battle.json> <out battle.json>');
  process.exit(2);
}

const pack = JSON.parse(fs.readFileSync(inFile, 'utf8'));
const panel = pack.screens?.['coop.topbar']?.children?.find((c) => c.name === PANEL);
if (!panel) {
  console.error(`no ${PANEL} under screens["coop.topbar"] in ${inFile}`);
  process.exit(1);
}

/** 每一席要复制哪几个节点：图标、带生命数字的节点、复活计时（`showSide` 靠名字后缀找它）。 */
const SEATS = [
  ['mate2', MATE2_X, MATE2_TINT, 'my'],
  ['mate3', MATE3_X, MATE3_TINT, 'you'],
];

/** 删掉上一次生成的节点，保证重跑幂等。 */
panel.children = panel.children.filter((c) => !/^\[mate[23]\]/.test(c.name));

for (const [tag, x, tint, like] of SEATS) {
  const src = (/** @type {string} */ n) => panel.children.find((c) => c.name === `[${like}]${n}`);
  // 复活计时的 x 不是图标 x，而是图标旁边那个位置；按原始两席的相对关系等比搬过去。
  const srcIcon = src('icon_life_point');
  const srcTimer = src('revive_timer');
  const timerX = x + (srcTimer.rt.pos[0] - srcIcon.rt.pos[0]);
  const added = [
    seat(src('img_icon_life_point'), tag, x, tint),
    seat(src('icon_life_point'), tag, x, tint),
    seat(srcTimer, tag, timerX, tint),
    // 复活计时默认隐藏，`showSide` 在倒地时才打开；这里补一条与图标同名的兄弟关系检查用的节点名即可。
  ];
  added[2].active = false;
  panel.children.push(...added);
}

fs.writeFileSync(outFile, JSON.stringify(pack));
console.log(`seat4-topbar: ${panel.children.length} children -> ${outFile}`);
