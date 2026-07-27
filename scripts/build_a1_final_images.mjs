import fs from "node:fs/promises";
import path from "node:path";
import sharp from "/Users/limyoon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js";

sharp.concurrency(2);

const ROOT = "/Users/limyoon/Desktop/workspace/aigc";
const OUT_DIR = path.join(ROOT, "outputs/a1_final_images");
const GENERATED_SECTION = "/Users/limyoon/.codex/generated_images/019f37e5-bb8b-7b41-b259-edddbac6e65c/ig_06ddaf513fad4cf8016a4bcb5963308191a4f6d343f46b4b7b.png";

const W = 4960;
const H = 7016;
const M = 110;
const C = {
  bg: "#F7F4EC",
  paper: "#FFFDF7",
  ink: "#153B2E",
  ink2: "#244C3E",
  muted: "#5F675F",
  line: "#AEB7A8",
  lightLine: "#D8D6C9",
  gold: "#B98D52",
  olive: "#7D915E",
  paleGreen: "#E9F0E4",
  paleWood: "#F3E7D3",
  paleBlue: "#E8F0EF",
  terracotta: "#C67655",
  gray: "#ECECE6",
  dark: "#0E3429",
};

const assets = {
  cloudHero: path.join(ROOT, "_aigc-archive/output/imagegen/zouma-cloud-brain-cover-new-resident-realistic.png"),
  sitePlan: path.join(ROOT, "_aigc-archive/output/site_plan/formal_site_plan.png"),
  topo: path.join(ROOT, "_aigc-archive/output/site_plan/clean_topography_underlay.png"),
  concept: path.join(ROOT, "_aigc-archive/output/concept-sketch/zouma-concept-sketch-actual-based.png"),
  system: path.join(ROOT, "_aigc-archive/outputs/a1_boards/generated/p0_02_system_architecture.png"),
  adoptionLoop: path.join(ROOT, "_aigc-archive/outputs/a1_boards/generated/p0_01_adoption_loop.png"),
  resources: path.join(ROOT, "_aigc-archive/outputs/a1_boards/generated/p0_03_four_resources.png"),
  realms: path.join(ROOT, "_aigc-archive/outputs/a1_boards/generated/p0_04_four_realms_framework.png"),
  fiveFlow: path.join(ROOT, "_aigc-archive/outputs/a1_boards/generated/p0_05_five_flow_engine.png"),
  pain: path.join(ROOT, "_aigc-archive/outputs/a1_boards/generated/p1_01_painpoint_response.png"),
  adoptionSpace: path.join(ROOT, "_aigc-archive/outputs/a1_boards/generated/p1_02_adoption_space_map.png"),
  landuse: path.join(ROOT, "_aigc-archive/outputs/a1_boards/generated/p1_03_landuse_industry.png"),
  principles: path.join(ROOT, "_aigc-archive/outputs/a1_boards/generated/p1_04_design_principles.png"),
  materials: path.join(ROOT, "_aigc-archive/outputs/a1_boards/generated/p1_06_material_palette.png"),
  stationBird: "/Users/limyoon/Desktop/走马驿站/本次生成_06_鸟瞰图.png",
  stationEntry: "/Users/limyoon/Desktop/走马驿站/本次生成_01_入口外观与主立面.png",
  stationCourt: "/Users/limyoon/Desktop/走马驿站/本次生成_02_中心庭院.png",
  stationEave: "/Users/limyoon/Desktop/走马驿站/本次生成_03_檐下休憩平台.png",
  lycheeAerial: "/Users/limyoon/Desktop/荔枝工坊/2896825a-442b-42fe-86e1-b668ebf34067.png",
  lycheeEntry: "/Users/limyoon/Desktop/荔枝工坊/02-entrance-plaza-exterior.png",
  lycheeDeck: "/Users/limyoon/Desktop/荔枝工坊/03-viewing-deck-exterior.png",
  lycheeInterior: "/Users/limyoon/Desktop/荔枝工坊/04-interior-workshop-experience.png",
  homestayEntry: "/Users/limyoon/Desktop/荔枝民宿/11_效果图_入口外院.png",
  homestayDeck: "/Users/limyoon/Desktop/荔枝民宿/12_效果图_木平台荔枝林.png",
  homestayPlan: "/Users/limyoon/Desktop/荔枝民宿/00_参考图_平面方案.png",
  ridgeAerial: "/Users/limyoon/Desktop/岭上民宿/效果图/06_新视角鸟瞰效果图.png",
  ridgeEntry: "/Users/limyoon/Desktop/岭上民宿/效果图/07_新视角室外效果图.png",
  researchAerial: "/Users/limyoon/Desktop/研学工坊/05_新旧结合_整体鸟瞰效果图.png",
  researchEntry: "/Users/limyoon/Desktop/研学工坊/06_新旧结合_农田侧入口效果图.png",
  researchPlan: path.join(ROOT, "_aigc-archive/outputs/architectural_scheme/architectural_floor_plan_color.svg.png"),
  researchSection: GENERATED_SECTION,
  field01: "/Users/limyoon/Desktop/走马岭实地照片/DSC09365.JPG",
  field02: "/Users/limyoon/Desktop/走马岭实地照片/DSC09373.JPG",
  field03: "/Users/limyoon/Desktop/走马岭实地照片/DSC09384.JPG",
  field04: "/Users/limyoon/Desktop/走马岭实地照片/DSC09402.JPG",
};

function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrapText(text, maxChars) {
  const words = String(text).split(/(\s+)/).filter(Boolean);
  if (words.some((w) => /[A-Za-z0-9]/.test(w)) && words.length > 1) {
    const lines = [];
    let line = "";
    for (const w of words) {
      const next = line + w;
      if (next.trim().length > maxChars && line.trim()) {
        lines.push(line.trim());
        line = w.trimStart();
      } else {
        line = next;
      }
    }
    if (line.trim()) lines.push(line.trim());
    return lines;
  }
  const chars = Array.from(String(text));
  const lines = [];
  for (let i = 0; i < chars.length; i += maxChars) lines.push(chars.slice(i, i + maxChars).join(""));
  return lines;
}

function text(x, y, content, opt = {}) {
  const size = opt.size ?? 46;
  const color = opt.color ?? C.ink;
  const weight = opt.weight ?? 400;
  const family = opt.family ?? '"Hiragino Sans GB","STHeiti","PingFang SC","Arial Unicode MS",sans-serif';
  const anchor = opt.anchor ?? "start";
  const spacing = opt.spacing ?? 0;
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family='${family.replaceAll('"', "")}' font-size="${size}" font-weight="${weight}" fill="${color}" letter-spacing="${spacing}">${esc(content)}</text>`;
}

function multiline(x, y, content, width, opt = {}) {
  const size = opt.size ?? 38;
  const lh = opt.lh ?? Math.round(size * 1.45);
  const maxChars = opt.maxChars ?? Math.max(8, Math.floor(width / (size * 0.96)));
  const lines = wrapText(content, maxChars).slice(0, opt.maxLines ?? 99);
  return lines
    .map((line, i) => text(x, y + i * lh, line, { ...opt, size }))
    .join("");
}

function rect(x, y, w, h, fill = "none", stroke = C.line, sw = 3, rx = 10) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

function line(x1, y1, x2, y2, stroke = C.line, sw = 3, dash = "") {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
}

function arrow(x1, y1, x2, y2, stroke = C.ink2, sw = 4) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const len = 26;
  const a1 = angle + Math.PI * 0.82;
  const a2 = angle - Math.PI * 0.82;
  const p1 = `${x2 + Math.cos(a1) * len},${y2 + Math.sin(a1) * len}`;
  const p2 = `${x2 + Math.cos(a2) * len},${y2 + Math.sin(a2) * len}`;
  return `${line(x1, y1, x2, y2, stroke, sw)}<polygon points="${x2},${y2} ${p1} ${p2}" fill="${stroke}"/>`;
}

function circle(cx, cy, r, fill = C.paper, stroke = C.line, sw = 3) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

function sectionTag(x, y, n, title, w = 1080) {
  return `<g>
    <rect x="${x}" y="${y - 54}" width="82" height="72" rx="10" fill="${C.dark}"/>
    ${text(x + 41, y - 4, n, { size: 42, color: "#fff", weight: 700, anchor: "middle" })}
    ${text(x + 105, y, title, { size: 62, color: C.ink, weight: 800 })}
    ${line(x + 105, y + 24, x + w, y + 24, C.ink, 4)}
  </g>`;
}

function boardChrome(title, subtitle, number, footer) {
  const base = [
    `<rect width="${W}" height="${H}" fill="${C.bg}"/>`,
    `<rect x="0" y="0" width="${W}" height="455" fill="${C.paper}"/>`,
    `<rect x="0" y="${H - 250}" width="${W}" height="250" fill="${C.dark}"/>`,
    `<path d="M${M} 250 C520 210, 680 210, 980 250" fill="none" stroke="${C.gold}" stroke-width="7"/>`,
    `<path d="M${W - 980} 250 C${W - 680} 210, ${W - 520} 210, ${W - M} 250" fill="none" stroke="${C.gold}" stroke-width="7"/>`,
  ].join("");
  const top = [
    text(M, 175, title, { size: 148, color: C.ink, weight: 900, family: '"STHeiti","Hiragino Sans GB","PingFang SC",sans-serif' }),
    line(M, 230, M + 930, 230, C.ink, 8),
    text(M + 1000, 220, subtitle, { size: 58, color: C.ink2, weight: 600 }),
    text(W - M, 146, `A1-${number}`, { size: 68, color: C.gold, weight: 800, anchor: "end" }),
    text(W / 2, H - 105, footer, { size: 48, color: "#D8C091", weight: 700, anchor: "middle" }),
    `<circle cx="${W - 240}" cy="${H - 125}" r="105" fill="#F5EFE0" stroke="${C.gold}" stroke-width="8"/>`,
    `<path d="M${W - 310} ${H - 130} C${W - 270} ${H - 185}, ${W - 220} ${H - 182}, ${W - 174} ${H - 126}" fill="none" stroke="${C.ink}" stroke-width="8"/>`,
    `<path d="M${W - 315} ${H - 95} C${W - 250} ${H - 140}, ${W - 208} ${H - 130}, ${W - 168} ${H - 98}" fill="none" stroke="${C.olive}" stroke-width="7"/>`,
  ].join("");
  return { base, top };
}

function cardBase(x, y, w, h, fill = C.paper) {
  return rect(x, y, w, h, fill, C.line, 3, 12);
}

function imageFrame(x, y, w, h) {
  return rect(x, y, w, h, "none", C.line, 4, 4);
}

function pill(x, y, label, fill = C.paleGreen, color = C.ink2, w = 260) {
  return `<g>${rect(x, y, w, 72, fill, C.line, 2, 36)}${text(x + w / 2, y + 50, label, { size: 35, color, weight: 700, anchor: "middle" })}</g>`;
}

function moduleTitle(x, y, label) {
  return text(x, y, label, { size: 42, color: C.ink, weight: 800 });
}

function nodeCircle(cx, cy, idx, title, sub, fill = C.paper) {
  return `<g>
    ${circle(cx, cy, 92, fill, C.olive, 6)}
    ${text(cx, cy - 8, idx, { size: 42, color: C.ink, weight: 800, anchor: "middle" })}
    ${text(cx, cy + 48, title, { size: 24, color: C.ink, weight: 700, anchor: "middle" })}
    ${text(cx, cy + 136, sub, { size: 28, color: C.muted, anchor: "middle" })}
  </g>`;
}

async function placeImage(file, x, y, w, h, fit = "cover") {
  const input = await sharp(file)
    .rotate()
    .resize({
      width: Math.round(w),
      height: Math.round(h),
      fit,
      background: C.paper,
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();
  return { input, left: Math.round(x), top: Math.round(y) };
}

async function renderBoard(filename, chrome, baseParts, topParts, imageSpecs) {
  const baseSvg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${chrome.base}${baseParts.join("")}</svg>`;
  const topSvg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${topParts.join("")}${chrome.top}</svg>`;
  const composites = [{ input: Buffer.from(baseSvg), left: 0, top: 0 }];
  for (const spec of imageSpecs) {
    composites.push(await placeImage(...spec));
  }
  composites.push({ input: Buffer.from(topSvg), left: 0, top: 0 });
  await sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: C.bg,
    },
  })
    .composite(composites)
    .png({ compressionLevel: 8, effort: 8 })
    .toFile(path.join(OUT_DIR, filename));
}

function flowRow(x, y, labels, opt = {}) {
  const w = opt.w ?? 520;
  const h = opt.h ?? 145;
  const gap = opt.gap ?? 62;
  let s = "";
  labels.forEach((l, i) => {
    const xx = x + i * (w + gap);
    s += rect(xx, y, w, h, i % 2 ? C.paleWood : C.paleGreen, C.line, 3, 18);
    s += text(xx + w / 2, y + 56, String(i + 1).padStart(2, "0"), { size: 35, color: C.gold, weight: 800, anchor: "middle" });
    s += multiline(xx + 38, y + 104, l, w - 76, { size: 32, color: C.ink, weight: 700, maxChars: 8, maxLines: 2 });
    if (i < labels.length - 1) s += arrow(xx + w + 10, y + h / 2, xx + w + gap - 12, y + h / 2, C.olive, 5);
  });
  return s;
}

function strategyIcons(x, y, labels, cols = 5) {
  const cellW = 880;
  const cellH = 250;
  let s = "";
  labels.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const xx = x + col * cellW;
    const yy = y + row * cellH;
    s += rect(xx, yy, cellW - 42, cellH - 34, i % 2 ? "#F5EFE2" : "#EEF4EA", C.lightLine, 3, 16);
    s += circle(xx + 95, yy + 94, 48, C.paper, C.olive, 4);
    s += `<path d="M${xx + 70} ${yy + 97} L${xx + 92} ${yy + 72} L${xx + 122} ${yy + 112}" fill="none" stroke="${C.ink2}" stroke-width="5"/>`;
    s += text(xx + 170, yy + 78, item[0], { size: 36, color: C.ink, weight: 800 });
    s += multiline(xx + 170, yy + 130, item[1], cellW - 245, { size: 26, color: C.muted, maxChars: 18, maxLines: 2 });
  });
  return s;
}

async function board01() {
  const chrome = boardChrome("运营系统与乡村可持续更新路径", "从一次性建设到可持续生长的村落运营机制", "01", "让日常运营产生数据，让数据反哺空间，让走马村成为可持续生长的乡村样板。");
  const base = [
    cardBase(110, 520, 2220, 1580),
    cardBase(2410, 520, 2440, 1580),
    cardBase(110, 2210, 4740, 1220),
    cardBase(110, 3540, 2980, 1560),
    cardBase(3180, 3540, 1670, 1560),
    cardBase(110, 5210, 4740, 1260),
  ];
  const top = [
    sectionTag(130, 620, "1", "AIGC 云脑协同", 2070),
    sectionTag(2430, 620, "2", "资源被组织成服务", 2230),
    sectionTag(130, 2310, "3", "运营闭环", 4400),
    sectionTag(130, 3640, "4", "游客体验故事板", 2700),
    sectionTag(3200, 3640, "5", "可持续收益机制", 1500),
    sectionTag(130, 5310, "6", "分期实施路径", 4400),
    moduleTitle(170, 760, "三端服务 + 一个云脑"),
    multiline(170, 835, "游客端、村民端、运营端共同接入云脑。系统将资源档案、路线推荐、活动生成、认养管理和数据反馈串成可执行的乡村运营网络。", 1960, { size: 34, color: C.muted, maxChars: 34, maxLines: 3 }),
    moduleTitle(2470, 760, "四类资源成为运营对象"),
    multiline(2470, 835, "古道讲述故事，荔枝形成认养，水系承载生态研学，院落容纳停留与共居。空间不是孤立改造，而是运营动作的承载点。", 2200, { size: 34, color: C.muted, maxChars: 36, maxLines: 3 }),
    flowRow(220, 2455, ["资源建档", "内容生成", "游客预约", "到村体验", "认养研学消费", "村民参与"], { w: 610, h: 150, gap: 80 }),
    flowRow(560, 2825, ["收益回流", "数据反馈", "空间维护", "活动优化", "长期生长"], { w: 660, h: 150, gap: 110 }),
    arrow(2470, 2610, 2470, 2790, C.olive, 6),
    arrow(3930, 2790, 3930, 2610, C.olive, 6),
    multiline(360, 3180, "乡村资源不是静态展示，而是被持续转化为活动、服务、收益和维护任务。云脑把每一次到访沉淀为下一轮运营依据。", 4100, { size: 42, color: C.ink2, weight: 700, maxChars: 48, maxLines: 2 }),
    ...["线上认养", "云驿签到", "古道导览", "林下研学", "院落消费", "成长推送"].map((label, i) => {
      const x = 220 + i * 470;
      return `${rect(x, 4840, 380, 120, i % 2 ? C.paleWood : C.paleGreen, C.line, 3, 16)}${text(x + 190, 4918, label, { size: 35, color: C.ink, weight: 800, anchor: "middle" })}${i < 5 ? arrow(x + 390, 4900, x + 455, 4900, C.olive, 4) : ""}`;
    }).join(""),
    multiline(3270, 3810, "游客消费、研学报名、荔枝认养和农产品销售进入收益池，反向支持村民分工、建筑维护、公共空间更新和生态修复。", 1400, { size: 36, color: C.muted, maxChars: 21, maxLines: 5 }),
    nodeCircle(3540, 4320, "收", "村民收益", "任务结算", C.paleGreen),
    nodeCircle(4170, 4320, "维", "维护基金", "建筑修补", C.paleWood),
    nodeCircle(3540, 4750, "生", "生态修复", "水渠林下", C.paleBlue),
    nodeCircle(4170, 4750, "传", "品牌传播", "复访认养", C.paper),
    arrow(3635, 4320, 4075, 4320, C.gold, 5),
    arrow(4170, 4415, 4170, 4655, C.gold, 5),
    arrow(4075, 4750, 3635, 4750, C.gold, 5),
    arrow(3540, 4655, 3540, 4415, C.gold, 5),
    ...[
      ["一期", "资源建档与基础修复", "古道、荔枝树、水渠、院落、闲置建筑入库"],
      ["二期", "入口节点与云驿上线", "村口服务、预约入口、导览入口、认养入口"],
      ["三期", "四类场景试点", "古道研学、荔枝认养、水岸休闲、院落活动"],
      ["四期", "建筑节能与公共空间改造", "屋面墙体门窗更新，檐下与院落修复"],
      ["五期", "运营系统完善", "数据看板、活动排期、村民分工、维护提醒"],
      ["六期", "品牌扩展与长期生长", "研学品牌、农产品品牌、节庆与长期认养"],
    ].map((p, i) => {
      const x = 260 + i * 740;
      return `${circle(x, 5835, 78, C.dark, C.dark, 4)}${text(x, 5855, String(i + 1), { size: 56, color: "#fff", weight: 900, anchor: "middle" })}${line(x + 78, 5835, x + 650, 5835, C.olive, 5)}${text(x - 95, 6015, p[0], { size: 35, color: C.gold, weight: 900 })}${multiline(x - 95, 6080, p[1], 560, { size: 32, color: C.ink, weight: 800, maxChars: 10, maxLines: 2 })}${multiline(x - 95, 6195, p[2], 570, { size: 25, color: C.muted, maxChars: 18, maxLines: 3 })}`;
    }).join(""),
  ];
  const images = [
    [assets.system, 240, 1010, 1840, 900, "contain"],
    [assets.resources, 2570, 1010, 2000, 900, "contain"],
    [assets.cloudHero, 160, 3810, 550, 870, "cover"],
    [assets.stationEntry, 730, 3810, 550, 870, "cover"],
    [assets.stationEave, 1300, 3810, 550, 870, "cover"],
    [assets.lycheeInterior, 1870, 3810, 550, 870, "cover"],
    [assets.homestayDeck, 2440, 3810, 550, 870, "cover"],
  ];
  await renderBoard("A1_01_运营系统与实施路径.png", chrome, base, top, images);
}

async function board02() {
  const chrome = boardChrome("空间更新与公共节点营造", "以最小介入激活山地村落公共生活", "02", "从资源识别到节点植入，以轻介入把游客、村民、活动和维护任务落到真实空间。");
  const base = [
    cardBase(110, 520, 4740, 660),
    cardBase(110, 1290, 1530, 2160),
    cardBase(1740, 1290, 3110, 2160),
    cardBase(110, 3570, 4740, 1660),
    cardBase(110, 5350, 4740, 1120),
  ];
  const nodeLabels = [
    ["村口云驿", "到达 / 签到 / 咨询 / 预约"],
    ["古道驿站", "导览 / 休息 / 打卡 / 展示"],
    ["荔枝研学", "认养 / 自然教育 / 农事体验"],
    ["院落活动", "议事 / 手作 / 展销 / 停留"],
    ["亲水平台", "生态教育 / 休闲 / 水渠展示"],
  ];
  const top = [
    sectionTag(130, 620, "1", "空间更新策略", 4350),
    flowRow(250, 800, ["资源识别", "节点植入", "活动组织", "游线串联", "日常维护", "持续运营"], { w: 610, h: 145, gap: 76 }),
    multiline(250, 1060, "保留古道、水渠、荔枝林、院落和闲置建筑，以可进入、可识别、可维护的小节点建立公共生活网络。", 4200, { size: 38, color: C.ink2, weight: 700, maxChars: 50, maxLines: 2 }),
    sectionTag(130, 1390, "2", "五类公共节点", 1400),
    ...nodeLabels.map((n, i) => {
      const y = 1530 + i * 360;
      return `${rect(230, y, 1280, 260, i % 2 ? C.paleWood : C.paleGreen, C.line, 3, 18)}${circle(345, y + 95, 62, C.paper, C.olive, 5)}${text(345, y + 115, String(i + 1), { size: 50, color: C.ink, weight: 900, anchor: "middle" })}${text(450, y + 82, n[0], { size: 44, color: C.ink, weight: 900 })}${multiline(450, y + 146, n[1], 920, { size: 30, color: C.muted, maxChars: 22, maxLines: 2 })}`;
    }).join(""),
    sectionTag(1760, 1390, "3", "重点节点放大", 2850),
    imageFrame(1840, 1505, 930, 720),
    imageFrame(2805, 1505, 930, 720),
    imageFrame(3770, 1505, 930, 720),
    text(1840, 2290, "村口云驿服务节点", { size: 38, color: C.ink, weight: 800 }),
    text(2805, 2290, "荔枝林研学节点", { size: 38, color: C.ink, weight: 800 }),
    text(3770, 2290, "院落共居节点", { size: 38, color: C.ink, weight: 800 }),
    multiline(1840, 2355, "与停车、入口广场、签到和导览入口结合，成为数字系统的线下入口。", 850, { size: 27, color: C.muted, maxChars: 18, maxLines: 3 }),
    multiline(2805, 2355, "林下平台、移动桌椅和讲解空间承接认养、采摘和自然教育。", 850, { size: 27, color: C.muted, maxChars: 18, maxLines: 3 }),
    multiline(3770, 2355, "利用原有院落和檐下空间，叠加手作、展销、休息和村民议事。", 850, { size: 27, color: C.muted, maxChars: 18, maxLines: 3 }),
    imageFrame(1840, 2640, 1365, 620),
    imageFrame(3335, 2640, 1365, 620),
    text(1840, 3320, "平面/场地关系：节点跟随道路、林地和农田边界布置", { size: 34, color: C.ink2, weight: 800 }),
    text(3335, 3320, "剖面/活动关系：檐下、平台、坡地与院落形成复合停留", { size: 34, color: C.ink2, weight: 800 }),
    sectionTag(130, 3670, "4", "场景效果图", 4400),
    ...[
      [190, 3810, 890, 820, "古道驿站与休息廊"],
      [1125, 3810, 890, 820, "荔枝林下研学空间"],
      [2060, 3810, 890, 820, "水渠边亲水节点"],
      [2995, 3810, 890, 820, "院落公共活动室"],
      [3930, 3810, 840, 820, "岭上共居空间"],
    ].map(([x, y, w, h, label]) => `${imageFrame(x, y, w, h)}${rect(x, y + h - 82, w, 82, "rgba(14,52,41,0.82)", "none", 0, 0)}${text(x + 30, y + h - 27, label, { size: 33, color: "#F8E9C7", weight: 800 })}`).join(""),
    sectionTag(130, 5450, "5", "设计导则", 4400),
    strategyIcons(230, 5600, [
      ["轻介入", "保留原有肌理，少拆少建"],
      ["低干预", "顺应林田水系和高差"],
      ["少拆少建", "旧建筑修复优先"],
      ["顺应地形", "沿坡、沿路、沿院落展开"],
      ["运营导向", "让节点可预约、可维护、可复访"],
    ], 5),
  ];
  const images = [
    [assets.stationEntry, 1840, 1505, 930, 720, "cover"],
    [assets.lycheeDeck, 2805, 1505, 930, 720, "cover"],
    [assets.homestayEntry, 3770, 1505, 930, 720, "cover"],
    [assets.homestayPlan, 1840, 2640, 1365, 620, "contain"],
    [assets.researchPlan, 3335, 2640, 1365, 620, "contain"],
    [assets.stationEave, 190, 3810, 890, 820, "cover"],
    [assets.lycheeInterior, 1125, 3810, 890, 820, "cover"],
    [assets.researchEntry, 2060, 3810, 890, 820, "cover"],
    [assets.stationCourt, 2995, 3810, 890, 820, "cover"],
    [assets.ridgeEntry, 3930, 3810, 840, 820, "cover"],
  ];
  await renderBoard("A1_02_空间更新与公共节点.png", chrome, base, top, images);
}

async function board03() {
  const chrome = boardChrome("总体规划与乡村空间结构", "以山水资源为底盘的村落更新网络", "03", "古道、水系、荔枝林、院落和公共节点被重新编织成可游、可居、可运营的空间系统。");
  const base = [
    cardBase(110, 520, 1220, 1690),
    cardBase(1430, 520, 3420, 2890),
    cardBase(110, 2310, 1220, 1100),
    cardBase(110, 3540, 2380, 1710),
    cardBase(2590, 3540, 2260, 1710),
    cardBase(110, 5370, 4740, 1100),
  ];
  const top = [
    sectionTag(130, 620, "1", "现状资源底盘", 1120),
    multiline(190, 760, "走马村的价值不在单一景点，而在古道、荔枝、水系、院落、农田与山地地形共同形成的复合资源。", 1050, { size: 34, color: C.muted, maxChars: 20, maxLines: 5 }),
    imageFrame(190, 1020, 490, 410),
    imageFrame(720, 1020, 490, 410),
    imageFrame(190, 1490, 490, 410),
    imageFrame(720, 1490, 490, 410),
    text(190, 1980, "真实场地照片作为更新依据", { size: 32, color: C.ink2, weight: 800 }),
    sectionTag(1450, 620, "2", "总体规划图", 3180),
    imageFrame(1510, 760, 3240, 2250),
    rect(1600, 3100, 3050, 210, "#F9F7EF", C.line, 3, 10),
    ...[
      ["古道文化轴", C.ink],
      ["水系生态带", "#5F8E91"],
      ["荔枝认养片区", C.olive],
      ["院落更新片区", C.gold],
      ["研学活动片区", C.terracotta],
      ["生态修复片区", "#89A98A"],
    ].map((l, i) => {
      const x = 1650 + i * 480;
      return `${rect(x, 3160, 52, 26, l[1], "none", 0, 2)}${text(x + 70, 3187, l[0], { size: 26, color: C.ink2, weight: 700 })}`;
    }).join(""),
    sectionTag(130, 2410, "3", "规划结构", 1120),
    multiline(190, 2555, "一轴一带多节点：古道串联叙事，水系组织生态，公共节点承接运营，荔枝林、院落和农田提供持续体验。", 1030, { size: 33, color: C.muted, maxChars: 20, maxLines: 5 }),
    ...[
      ["古道文化轴", "慢行 / 导览 / 研学"],
      ["水系生态带", "修复 / 安全 / 停留"],
      ["公共节点网", "云驿 / 驿站 / 院落"],
      ["荔枝认养区", "树档案 / 采摘 / 收益"],
    ].map((l, i) => {
      const y = 2810 + i * 130;
      return `${pill(210, y, l[0], i % 2 ? C.paleWood : C.paleGreen, C.ink, 340)}${text(590, y + 49, l[1], { size: 30, color: C.muted })}`;
    }).join(""),
    sectionTag(130, 3640, "4", "功能分区", 2200),
    imageFrame(190, 3780, 2180, 1000),
    multiline(230, 4885, "村口服务区、荔枝认养区、古道研学区、院落活动区、亲水休闲区、生态修复区与村民生活保留区共同构成低干预的用地更新网络。", 2050, { size: 32, color: C.ink2, weight: 700, maxChars: 33, maxLines: 3 }),
    sectionTag(2610, 3640, "5", "交通与游线", 2100),
    imageFrame(2670, 3780, 2060, 1000),
    ...[
      ["外部到达", C.dark],
      ["游客游线", C.gold],
      ["村民日常", C.olive],
      ["运营维护", C.terracotta],
      ["古道体验", "#5F8E91"],
    ].map((l, i) => {
      const x = 2720 + i * 390;
      return `${line(x, 4888, x + 110, 4888, l[1], 8, i % 2 ? "18 14" : "")}${text(x + 125, 4900, l[0], { size: 28, color: C.ink2, weight: 700 })}`;
    }).join(""),
    sectionTag(130, 5470, "6", "山地剖面与空间关系", 4400),
    `<path d="M250 6290 C820 5880, 1200 6120, 1650 5740 C2180 5320, 2750 6020, 3300 5700 C3850 5400, 4260 5890, 4700 5530 L4700 6370 L250 6370 Z" fill="#E3E9DE" stroke="${C.olive}" stroke-width="5"/>`,
    `<path d="M380 6250 L980 6130 L1560 6030 L2360 5960 L3300 6040 L4240 5910" fill="none" stroke="${C.dark}" stroke-width="8" stroke-dasharray="22 18"/>`,
    ...[
      ["山体林地", 730, 5990],
      ["村落院落", 1470, 5900],
      ["荔枝林", 2220, 5840],
      ["古道节点", 3000, 5935],
      ["农田水渠", 3860, 5810],
    ].map(([label, x, y]) => `${circle(x, y, 36, C.gold, C.paper, 5)}${text(x, y - 58, label, { size: 34, color: C.ink, weight: 800, anchor: "middle" })}`).join(""),
  ];
  const images = [
    [assets.field01, 190, 1020, 490, 410, "cover"],
    [assets.field02, 720, 1020, 490, 410, "cover"],
    [assets.field03, 190, 1490, 490, 410, "cover"],
    [assets.field04, 720, 1490, 490, 410, "cover"],
    [assets.sitePlan, 1510, 760, 3240, 2250, "contain"],
    [assets.adoptionSpace, 190, 3780, 2180, 1000, "contain"],
    [assets.landuse, 2670, 3780, 2060, 1000, "contain"],
  ];
  await renderBoard("A1_03_总体规划与空间结构.png", chrome, base, top, images);
}

async function board04() {
  const chrome = boardChrome("建筑节能与存量建筑改造", "从建筑修补到低碳可维护的乡村空间更新", "04", "保留乡土肌理，以被动式节能、材料再利用和可维护构造支撑长期运营。");
  const base = [
    cardBase(110, 520, 1500, 1780),
    cardBase(1710, 520, 3140, 3160),
    cardBase(110, 2420, 1500, 1260),
    cardBase(110, 3810, 2350, 1660),
    cardBase(2560, 3810, 2290, 1660),
    cardBase(110, 5580, 4740, 890),
  ];
  const retrofit = [
    ["屋面节能", "青灰瓦修复、保温层、通风屋脊、雨水导流"],
    ["墙体节能", "保留石墙夯土肌理，内侧增设保温层"],
    ["门窗更新", "高气密木框或深灰金属框，可开启通风"],
    ["檐下遮阳", "延续深檐，增加廊下休息与交流空间"],
    ["自然通风", "利用山地风向、院落开口与屋脊排热"],
    ["雨水生态", "雨水收集、透水铺装、边沟与水渠修复"],
    ["低碳材料", "旧石、旧木、青瓦、竹木构件再利用"],
  ];
  const top = [
    sectionTag(130, 620, "1", "改造逻辑", 1400),
    flowRow(210, 810, ["问题识别", "体量保留", "围护节能"], { w: 355, h: 132, gap: 48 }),
    flowRow(210, 1090, ["屋顶檐下", "材料再用", "运营维护"], { w: 355, h: 132, gap: 48 }),
    multiline(210, 1370, "不把乡村建筑推倒重来，而是在屋面、墙体、门窗、檐下和排水系统中植入低碳可维护策略。", 1260, { size: 34, color: C.muted, maxChars: 24, maxLines: 4 }),
    sectionTag(1730, 620, "2", "建筑节能改造剖面", 2900),
    imageFrame(1810, 760, 2960, 2600),
    sectionTag(130, 2520, "3", "节能重点", 1400),
    ...retrofit.map((r, i) => {
      const y = 2660 + i * 138;
      return `${rect(210, y, 1280, 104, i % 2 ? C.paleWood : C.paleGreen, C.lightLine, 3, 14)}${text(250, y + 66, r[0], { size: 34, color: C.ink, weight: 900 })}${multiline(520, y + 47, r[1], 880, { size: 25, color: C.muted, maxChars: 22, maxLines: 2 })}`;
    }).join(""),
    sectionTag(130, 3910, "4", "改造前后对比", 2200),
    ...[
      ["屋面破损", "屋面保温"],
      ["采光不足", "自然采光"],
      ["夏季过热", "通风降温"],
      ["雨水无组织", "雨水回收"],
      ["空间闲置", "檐下活动"],
      ["材料老旧", "材料再利用"],
    ].map((p, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 210 + col * 735;
      const y = 4070 + row * 560;
      return `${rect(x, y, 660, 420, C.paper, C.line, 3, 16)}${rect(x, y, 660, 110, "#F3E7D3", "none", 0, 16)}${text(x + 40, y + 70, "改造前", { size: 28, color: C.terracotta, weight: 900 })}${text(x + 235, y + 70, p[0], { size: 34, color: C.ink, weight: 900 })}${arrow(x + 120, y + 215, x + 540, y + 215, C.olive, 5)}${text(x + 40, y + 335, "改造后", { size: 28, color: C.olive, weight: 900 })}${text(x + 235, y + 335, p[1], { size: 34, color: C.ink, weight: 900 })}`;
    }).join(""),
    sectionTag(2580, 3910, "5", "存量建筑更新场景", 2100),
    imageFrame(2640, 4045, 1040, 560),
    imageFrame(3730, 4045, 1040, 560),
    imageFrame(2640, 4700, 1040, 560),
    imageFrame(3730, 4700, 1040, 560),
    text(2640, 4660, "农田侧入口", { size: 30, color: C.ink, weight: 800 }),
    text(3730, 4660, "庭院连廊", { size: 30, color: C.ink, weight: 800 }),
    text(2640, 5315, "古道驿站", { size: 30, color: C.ink, weight: 800 }),
    text(3730, 5315, "岭上民宿", { size: 30, color: C.ink, weight: 800 }),
    sectionTag(130, 5680, "6", "材料与构造图解", 4400),
    strategyIcons(230, 5825, [
      ["青灰瓦", "修复原有屋面并叠加保温"],
      ["旧石墙", "保留肌理，局部补强"],
      ["木构檐廊", "遮阳、避雨、停留复合"],
      ["竹木格栅", "低碳遮阳与界面更新"],
      ["透水铺装", "减少径流，连接水渠系统"],
    ], 5),
  ];
  const images = [
    [assets.researchSection, 1810, 760, 2960, 2600, "contain"],
    [assets.researchEntry, 2640, 4045, 1040, 560, "cover"],
    [assets.researchAerial, 3730, 4045, 1040, 560, "cover"],
    [assets.stationEntry, 2640, 4700, 1040, 560, "cover"],
    [assets.ridgeAerial, 3730, 4700, 1040, 560, "cover"],
  ];
  await renderBoard("A1_04_建筑节能与改造.png", chrome, base, top, images);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.copyFile(GENERATED_SECTION, path.join(OUT_DIR, "AI生成_建筑节能改造剖面.png"));
  await board01();
  await board02();
  await board03();
  await board04();

  const tw = 1120;
  const th = Math.round(tw * H / W);
  const gap = 80;
  const montage = await sharp({
    create: { width: tw * 2 + gap, height: th * 2 + gap, channels: 4, background: C.bg },
  })
    .composite([
      await placeImage(path.join(OUT_DIR, "A1_01_运营系统与实施路径.png"), 0, 0, tw, th, "contain"),
      await placeImage(path.join(OUT_DIR, "A1_02_空间更新与公共节点.png"), tw + gap, 0, tw, th, "contain"),
      await placeImage(path.join(OUT_DIR, "A1_03_总体规划与空间结构.png"), 0, th + gap, tw, th, "contain"),
      await placeImage(path.join(OUT_DIR, "A1_04_建筑节能与改造.png"), tw + gap, th + gap, tw, th, "contain"),
    ])
    .png({ compressionLevel: 8 })
    .toBuffer();
  await fs.writeFile(path.join(OUT_DIR, "A1_四张展板总览.png"), montage);

  const note = [
    "# A1 展板图片输出说明",
    "",
    "- 输出类型：四张 A1 竖版 PNG 图片",
    "- 合成方式：项目既有图纸/效果图/实地照片 + AI 生成建筑节能剖面 + 本地矢量信息图排版",
    "- AI 生成补图：`AI生成_建筑节能改造剖面.png`，用于第四张展板主剖面",
    "- 输出目录：`/Users/limyoon/Desktop/workspace/aigc/outputs/a1_final_images`",
  ].join("\n");
  await fs.writeFile(path.join(OUT_DIR, "输出说明.md"), note);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
