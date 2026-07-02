import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const OUT = "/Users/limyoon/Desktop/workspace/aigc/outputs/architectural_scheme/坡脚农田研学工坊_方案汇报.pptx";
const PREVIEW_DIR = "/var/folders/jf/1x_qy3ds22z73h9cg0022fv00000gn/T/codex-presentations/019f1748-5aa9-75b2-a4b7-51ec3acfe460/architectural-scheme-ppt/tmp/preview";
const QA_DIR = "/var/folders/jf/1x_qy3ds22z73h9cg0022fv00000gn/T/codex-presentations/019f1748-5aa9-75b2-a4b7-51ec3acfe460/architectural-scheme-ppt/tmp/qa";

const assets = {
  sitePlan: "/Users/limyoon/Library/Containers/com.tencent.qq/Data/Library/Application Support/QQ/nt_qq_d4832cb6e0d5abb650bfca4964d44648/nt_data/Pic/2026-06/Thumb/5ca04d24dc5267abaeed159f1c820a76_720.png",
  sketch: "/Users/limyoon/Library/Containers/com.tencent.qq/Data/Library/Application Support/QQ/nt_qq_d4832cb6e0d5abb650bfca4964d44648/nt_data/Pic/2026-06/Thumb/5858cd28495367280cd8ae301362101f_720.png",
  material: "/var/folders/jf/1x_qy3ds22z73h9cg0022fv00000gn/T/codex-clipboard-90b58c32-1713-4db3-8624-c68d32034551.png",
  plan: "/Users/limyoon/Desktop/workspace/aigc/outputs/architectural_scheme/floor_plan_design.svg.png",
  render: "/Users/limyoon/Desktop/workspace/aigc/outputs/architectural_scheme/site_aligned_overall_render.png",
  textile: "/Users/limyoon/.codex/generated_images/019f1748-5aa9-75b2-a4b7-51ec3acfe460/ig_06dc4c1adaa64e26016a436c2a472c81a39b0ec2239de2e92a.png",
  tea: "/Users/limyoon/.codex/generated_images/019f1748-5aa9-75b2-a4b7-51ec3acfe460/ig_03a8194337ad4010016a4368eaf9808196beeeccf8f2b19b85.png",
  exhibition: "/Users/limyoon/.codex/generated_images/019f1748-5aa9-75b2-a4b7-51ec3acfe460/ig_03a8194337ad4010016a43693b72d08196bf2bfcaacbc9bd4d.png",
};

const W = 1280;
const H = 720;
const ink = "#1F1D1A";
const muted = "#5C554B";
const panel = "#EFEAE0";
const rule = "#C5B9A5";
const accent = "#8A5B35";
const field = "#6F8F50";

async function bytes(file) {
  return new Uint8Array(await fs.readFile(file));
}

function addText(slide, text, left, top, width, height, opts = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left, top, width, height },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    fontSize: opts.fontSize ?? 20,
    bold: opts.bold ?? false,
    color: opts.color ?? ink,
    alignment: opts.alignment ?? "left",
  };
  return shape;
}

function addBox(slide, left, top, width, height, fill = panel, lineFill = rule) {
  return slide.shapes.add({
    geometry: "rect",
    position: { left, top, width, height },
    fill,
    line: { style: "solid", fill: lineFill, width: 1 },
  });
}

function addTop(slide, title, section = "坡脚农田研学工坊") {
  addText(slide, section, 56, 34, 360, 30, { fontSize: 16, bold: true, color: accent });
  addText(slide, title, 56, 68, 780, 54, { fontSize: 40, bold: true });
  slide.shapes.add({
    geometry: "rect",
    position: { left: 56, top: 136, width: 1168, height: 1 },
    fill: rule,
    line: { style: "solid", fill: rule, width: 0 },
  });
}

async function addImg(slide, file, left, top, width, height, alt, fit = "cover", crop) {
  const opts = {
    blob: await bytes(file),
    contentType: "image/png",
    alt,
    fit,
    position: { left, top, width, height },
  };
  if (crop) opts.crop = crop;
  return slide.images.add(opts);
}

function addBullets(slide, items, left, top, width, fontSize = 20, lineGap = 38) {
  items.forEach((item, i) => {
    addText(slide, "•", left, top + i * lineGap + 1, 20, 28, { fontSize, bold: true, color: accent });
    addText(slide, item, left + 28, top + i * lineGap, width - 28, lineGap, { fontSize, color: muted });
  });
}

async function main() {
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.mkdir(PREVIEW_DIR, { recursive: true });
  await fs.mkdir(QA_DIR, { recursive: true });

  const presentation = Presentation.create({
    slideSize: { width: W, height: H },
  });

  // 1. Cover
  {
    const slide = presentation.slides.add();
    slide.background.fill = "#FFFFFF";
    await addImg(slide, assets.render, 0, 0, W, H, "农田场地建筑总览效果图", "cover");
    addBox(slide, 56, 430, 560, 210, "rgba(255,255,255,0.88)", "#FFFFFF");
    addText(slide, "坡脚农田研学工坊", 86, 462, 500, 68, { fontSize: 54, bold: true });
    addText(slide, "建筑平面与效果图方案汇报", 88, 542, 480, 34, { fontSize: 26, color: muted });
    addText(slide, "场地校正：下方为农田台地，不按河岸处理", 88, 592, 480, 30, { fontSize: 18, bold: true, color: accent });
  }

  // 2. Site confirmation
  {
    const slide = presentation.slides.add();
    slide.background.fill = "#FFFFFF";
    addTop(slide, "场地关系确认");
    await addImg(slide, assets.sitePlan, 56, 168, 750, 486, "实际建筑分布与等高线图", "contain");
    addBox(slide, 846, 168, 378, 486, "#F7F3EC", rule);
    addText(slide, "确认结论", 878, 206, 310, 36, { fontSize: 30, bold: true });
    addBullets(slide, [
      "上方为山体等高线与坡地植被",
      "建筑位于坡脚平台，沿地形横向展开",
      "下方为农田台地，不是河流或水岸",
      "紫色建筑轮廓为后续效果图硬约束",
      "材质按毛石墙、小青瓦、深木檐口统一"
    ], 878, 270, 310, 20, 54);
  }

  // 3. Sketch + distribution
  {
    const slide = presentation.slides.add();
    slide.background.fill = "#FFFFFF";
    addTop(slide, "草图功能关系与实际轮廓对照");
    await addImg(slide, assets.sketch, 56, 178, 548, 364, "手绘建筑平面草图", "contain");
    await addImg(slide, assets.sitePlan, 676, 178, 548, 364, "实际建筑分布图", "contain");
    addText(slide, "手绘草图：功能关系", 56, 568, 548, 36, { fontSize: 26, bold: true });
    addText(slide, "保留左侧工坊、中部接待/庭院、右侧茶饮与展陈的串联逻辑。", 56, 610, 548, 48, { fontSize: 18, color: muted });
    addText(slide, "实地分布：位置轮廓", 676, 568, 548, 36, { fontSize: 26, bold: true });
    addText(slide, "以紫色现状轮廓控制建筑位置、角度和相对关系，不重排体量。", 676, 610, 548, 48, { fontSize: 18, color: muted });
  }

  // 4. Plan control
  {
    const slide = presentation.slides.add();
    slide.background.fill = "#FFFFFF";
    addTop(slide, "平面控制图");
    await addImg(slide, assets.plan, 56, 154, 686, 502, "按实际场地校正后的平面控制图", "contain");
    addBox(slide, 782, 154, 442, 502, "#F7F3EC", rule);
    addText(slide, "设计控制", 816, 198, 360, 36, { fontSize: 30, bold: true });
    addBullets(slide, [
      "入口 / 服务：左侧坡脚到达",
      "纺织工坊：左侧长向矩形体量",
      "研发土墙：中部小体量衔接",
      "接待讲解：中部平台核心",
      "茶饮体验：右上斜置体量",
      "展陈区：右下近农田体量",
      "树庭：中右部保留庭院树"
    ], 816, 260, 360, 19, 44);
  }

  // 5. Material
  {
    const slide = presentation.slides.add();
    slide.background.fill = "#FFFFFF";
    addTop(slide, "建筑材质与屋顶语言");
    await addImg(slide, assets.material, 56, 160, 646, 472, "毛石墙与小青瓦屋顶参考", "cover");
    addBox(slide, 744, 160, 480, 472, "#F7F3EC", rule);
    addText(slide, "统一风格", 778, 198, 360, 36, { fontSize: 30, bold: true });
    addBullets(slide, [
      "外墙：灰褐粗砌毛石，白灰勾缝",
      "屋顶：深灰小青瓦双坡屋面",
      "檐口：深木色椽子与低檐",
      "环境：山地植被、青苔、石铺地",
      "室内：石墙、木梁、暖光、浅木家具"
    ], 778, 270, 390, 20, 54);
  }

  // 6. Overall render
  {
    const slide = presentation.slides.add();
    slide.background.fill = "#FFFFFF";
    addTop(slide, "农田场地总览效果图");
    await addImg(slide, assets.render, 56, 154, 1168, 492, "按农田场地生成的建筑总览效果图", "cover");
    addText(slide, "画面已修正为山坡 + 建筑平台 + 下方农田；不再表现河流、水面或亲水平台。", 56, 660, 1168, 30, { fontSize: 19, bold: true, color: accent });
  }

  // 7. Interior renders
  {
    const slide = presentation.slides.add();
    slide.background.fill = "#FFFFFF";
    addTop(slide, "室内效果图汇总");
    await addImg(slide, assets.textile, 56, 172, 360, 292, "纺织工坊室内效果图", "cover");
    await addImg(slide, assets.tea, 460, 172, 360, 292, "茶饮体验室内效果图", "cover");
    await addImg(slide, assets.exhibition, 864, 172, 360, 292, "展陈厅室内效果图", "cover");
    addText(slide, "纺织工坊", 56, 492, 360, 34, { fontSize: 26, bold: true });
    addText(slide, "石墙、木梁、织机与手作长桌。", 56, 532, 360, 40, { fontSize: 18, color: muted });
    addText(slide, "茶饮体验", 460, 492, 360, 34, { fontSize: 26, bold: true });
    addText(slide, "低茶席、木构屋面、暖光氛围。", 460, 532, 360, 40, { fontSize: 18, color: muted });
    addText(slide, "展陈厅", 864, 492, 360, 34, { fontSize: 26, bold: true });
    addText(slide, "工艺样本、模块展台、安静展陈光。", 864, 532, 360, 40, { fontSize: 18, color: muted });
    addText(slide, "注：室内效果图按已确认版本放入，本次不再修改。", 56, 638, 720, 30, { fontSize: 18, bold: true, color: accent });
  }

  for (const [index, slide] of presentation.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    const png = await presentation.export({ slide, format: "png", scale: 1 });
    await fs.writeFile(path.join(PREVIEW_DIR, `${stem}.png`), new Uint8Array(await png.arrayBuffer()));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(QA_DIR, `${stem}.layout.json`), await layout.text());
  }

  const montage = await presentation.export({ format: "webp", montage: true, scale: 1 });
  await fs.writeFile(path.join(PREVIEW_DIR, "deck-montage.webp"), new Uint8Array(await montage.arrayBuffer()));

  const inspect = await presentation.inspect({
    kind: "slide,textbox,shape,image,layout",
    maxChars: 18000,
  });
  await fs.writeFile(path.join(QA_DIR, "inspect.ndjson"), inspect.ndjson);

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(OUT);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
