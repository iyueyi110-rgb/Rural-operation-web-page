from __future__ import annotations

import base64
import html
from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path("/Users/limyoon/Desktop/workspace/aigc")
REF2 = Path(
    "/Users/limyoon/Library/Containers/com.tencent.qq/Data/Library/Application Support/QQ/"
    "nt_qq_d4832cb6e0d5abb650bfca4964d44648/nt_data/Pic/2026-06/Thumb/"
    "5ca04d24dc5267abaeed159f1c820a76_720.png"
)
OUT = ROOT / "output" / "site_plan"
MX, MY = 70, 120
PLAN_W, PLAN_H = 1280, 829
PAGE_W, PAGE_H = 1600, 1060

FONT_STACK = '"PingFang SC","STHeiti","Microsoft YaHei","Noto Sans CJK SC",Arial,sans-serif'


def clean_topography() -> Path:
    """Recolor CAD screenshot linework to a light presentation underlay."""
    OUT.mkdir(parents=True, exist_ok=True)
    im = Image.open(REF2).convert("RGB")
    src = im.load()
    out = Image.new("RGBA", im.size, (255, 255, 255, 0))
    dst = out.load()
    width, height = im.size

    for y in range(height):
        for x in range(width):
            r, g, b = src[x, y]
            yellow = r > 150 and g > 145 and b < 80
            green = g > 120 and r < 80 and b < 90
            cyan = g > 130 and b > 140 and r < 80
            red = r > 170 and g < 90 and b < 90
            if yellow:
                dst[x, y] = (178, 178, 178, 132)
            elif green:
                dst[x, y] = (108, 164, 112, 132)
            elif cyan:
                dst[x, y] = (73, 163, 184, 170)
            elif red:
                dst[x, y] = (218, 67, 67, 175)

    # A tiny thickening keeps the topographic linework legible after printing.
    out = out.filter(ImageFilter.MaxFilter(3))
    path = OUT / "clean_topography_underlay.png"
    out.save(path)
    return path


def pts(points):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in points)


def p(points):
    return [(MX + x, MY + y) for x, y in points]


def centroid(points):
    return (
        sum(x for x, _ in points) / len(points),
        sum(y for _, y in points) / len(points),
    )


BUILDINGS = [
    {
        "id": "workshop_service",
        "name": "设备间",
        "zone": "研学工坊",
        "color": "#F5C99A",
        "poly": [(289, 287), (340, 288), (340, 376), (289, 374)],
    },
    {
        "id": "workshop_main",
        "name": "研学工坊",
        "zone": "研学工坊",
        "color": "#F5C99A",
        "poly": [(341, 260), (487, 260), (487, 380), (340, 380), (340, 288), (341, 288)],
    },
    {
        "id": "classroom_exhibit",
        "name": "农耕文化展览 / 多功能教室",
        "zone": "农耕文化展览",
        "color": "#E7EFC9",
        "poly": [(205, 370), (339, 377), (333, 482), (197, 478)],
    },
    {
        "id": "south_classroom",
        "name": "多功能教室",
        "zone": "农耕文化展览",
        "color": "#E7EFC9",
        "poly": [(198, 478), (332, 482), (330, 528), (194, 528)],
    },
    {
        "id": "rest_node",
        "name": "休息区",
        "zone": "公共休息",
        "color": "#F6E7A6",
        "poly": [(519, 246), (619, 245), (622, 316), (521, 320)],
    },
    {
        "id": "river_bridge",
        "name": "沿河廊桥",
        "zone": "沿河廊桥",
        "color": "#BFE3ED",
        "poly": [(681, 178), (781, 186), (775, 258), (675, 252)],
    },
    {
        "id": "night_gallery",
        "name": "夜游展示 / 灯光体验",
        "zone": "夜游体验",
        "color": "#DAC7F1",
        "poly": [(801, 169), (904, 196), (884, 286), (776, 258)],
    },
    {
        "id": "link_platform",
        "name": "连接平台",
        "zone": "公共休息",
        "color": "#F6E7A6",
        "poly": [(669, 319), (737, 321), (733, 367), (668, 365)],
    },
    {
        "id": "night_upper",
        "name": "夜游展示",
        "zone": "夜游体验",
        "color": "#DAC7F1",
        "poly": [(916, 238), (998, 249), (998, 325), (909, 323)],
    },
    {
        "id": "residential",
        "name": "居民生活区",
        "zone": "居民生活区",
        "color": "#CDE7C8",
        "poly": [(908, 324), (998, 325), (981, 420), (904, 417)],
    },
]

COURTYARD = [(675, 252), (775, 258), (786, 286), (906, 314), (905, 417), (734, 367), (668, 365), (669, 319)]
FARM = [(76, 636), (222, 608), (489, 641), (758, 669), (875, 640), (1006, 610), (1111, 608), (1214, 638), (1214, 822), (76, 822)]


def svg_text(x, y, text, size=22, weight=500, anchor="middle", klass="", fill="#17202A"):
    return (
        f'<text class="{klass}" x="{x:.1f}" y="{y:.1f}" text-anchor="{anchor}" '
        f'font-size="{size}" font-weight="{weight}" fill="{fill}">{html.escape(text)}</text>'
    )


def polygon_el(points, fill, stroke="#20252B", width=3.2, extra=""):
    return (
        f'<polygon points="{pts(points)}" fill="{fill}" stroke="{stroke}" '
        f'stroke-width="{width}" stroke-linejoin="round" {extra}/>'
    )


def line_el(x1, y1, x2, y2, klass="wall", extra=""):
    return f'<line class="{klass}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" {extra}/>'


def rect_el(x, y, w, h, fill="#FFFFFF", stroke="#40464D", extra=""):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke}" {extra}/>'


def add_furniture(elements):
    # Workshop: exhibition exchange, making tables and equipment room.
    elements += [
        line_el(MX + 396, MY + 263, MX + 396, MY + 378),
        line_el(MX + 437, MY + 263, MX + 437, MY + 378),
        svg_text(MX + 369, MY + 304, "展示交流区", 13),
        svg_text(MX + 430, MY + 346, "制作工坊", 13),
        svg_text(MX + 315, MY + 335, "设备间", 16),
    ]
    for x in [356, 410, 452]:
        for y in [286, 335]:
            elements.append(rect_el(MX + x, MY + y, 28, 14, "#FFF6E7", "#7A6750", 'rx="2"'))
            elements.append(rect_el(MX + x - 7, MY + y + 2, 5, 10, "#FFFFFF", "#7A6750"))
            elements.append(rect_el(MX + x + 30, MY + y + 2, 5, 10, "#FFFFFF", "#7A6750"))

    # Agricultural exhibition and multi-function classroom.
    elements += [
        line_el(MX + 263, MY + 373, MX + 259, MY + 480),
        svg_text(MX + 229, MY + 405, "农耕文化展览", 13),
        svg_text(MX + 306, MY + 452, "多功能教室", 13),
        svg_text(MX + 263, MY + 508, "多功能教室", 16),
    ]
    for x in [218, 232, 246]:
        elements.append(rect_el(MX + x, MY + 392, 10, 52, "#F8FAF1", "#78856C"))
    for x in [282, 304]:
        for y in [398, 430]:
            elements.append(rect_el(MX + x, MY + y, 22, 12, "#F8FAF1", "#78856C"))
    for x in [222, 260, 298]:
        elements.append(rect_el(MX + x, MY + 495, 28, 14, "#F8FAF1", "#78856C"))

    # Rest and transition nodes.
    elements += [
        svg_text(MX + 571, MY + 286, "休息区", 18),
        svg_text(MX + 703, MY + 350, "连接平台", 17),
    ]
    for x, y in [(546, 272), (584, 272), (558, 296)]:
        elements.append(f'<circle cx="{MX+x}" cy="{MY+y}" r="8" fill="#FFF9DD" stroke="#9B8E55"/>')
    elements.append(rect_el(MX + 692, MY + 333, 22, 14, "#FFF9DD", "#9B8E55"))

    # Bridge and night experience.
    elements += [
        svg_text(MX + 728, MY + 224, "沿河廊桥", 18),
        svg_text(MX + 838, MY + 235, "夜游展示", 18),
        svg_text(MX + 952, MY + 286, "灯光体验", 18),
    ]
    for x in [698, 726, 754]:
        elements.append(line_el(MX + x, MY + 186, MX + x - 5, MY + 254, "thin"))
    for x, y, rot in [(815, 205, 14), (848, 216, 14), (928, 269, 7), (958, 294, 7)]:
        elements.append(
            f'<rect x="{MX+x}" y="{MY+y}" width="28" height="12" fill="#F8F1FF" '
            f'stroke="#75608D" transform="rotate({rot} {MX+x+14} {MY+y+6})"/>'
        )

    # Residential layout.
    elements += [
        line_el(MX + 908, MY + 354, MX + 990, MY + 355),
        line_el(MX + 944, MY + 354, MX + 936, MY + 418),
        svg_text(MX + 938, MY + 344, "居民起居厅", 14),
        svg_text(MX + 968, MY + 386, "厨房 / 餐厅", 13),
        svg_text(MX + 924, MY + 388, "居民卧室", 13),
    ]
    elements.append(rect_el(MX + 916, MY + 370, 20, 34, "#F4FBF1", "#63815F"))
    elements.append(rect_el(MX + 950, MY + 370, 26, 16, "#F4FBF1", "#63815F"))
    elements.append(rect_el(MX + 956, MY + 393, 20, 10, "#F4FBF1", "#63815F"))


def add_doors_windows(elements):
    door_style = 'stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"'
    elements += [
        line_el(MX + 339, MY + 348, MX + 339, MY + 370, "door", door_style),
        line_el(MX + 487, MY + 331, MX + 487, MY + 356, "door", door_style),
        line_el(MX + 520, MY + 306, MX + 520, MY + 318, "door", door_style),
        line_el(MX + 668, MY + 340, MX + 668, MY + 360, "door", door_style),
        line_el(MX + 905, MY + 366, MX + 905, MY + 392, "door", door_style),
        line_el(MX + 197, MY + 446, MX + 197, MY + 470, "door", door_style),
    ]
    for x1, y1, x2, y2 in [
        (352, 260, 390, 260),
        (443, 260, 480, 260),
        (218, 370, 253, 372),
        (279, 374, 318, 376),
        (691, 179, 736, 183),
        (820, 176, 864, 187),
        (922, 239, 969, 245),
        (914, 416, 964, 419),
    ]:
        elements.append(line_el(MX + x1, MY + y1, MX + x2, MY + y2, "window"))


def build_svg():
    topo = clean_topography()
    topo_b64 = base64.b64encode(topo.read_bytes()).decode("ascii")

    elements = []
    elements.append(
        f"""<svg xmlns="http://www.w3.org/2000/svg" width="{PAGE_W}" height="{PAGE_H}" viewBox="0 0 {PAGE_W} {PAGE_H}">
<defs>
  <marker id="arrow-red" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="strokeWidth">
    <path d="M1,1 L11,6 L1,11 Z" fill="#D94444"/>
  </marker>
  <pattern id="farmRows" width="36" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
    <path d="M0 11 H36" stroke="#8CB88C" stroke-width="1.2" opacity="0.65"/>
  </pattern>
  <style>
    svg {{ background:#FFFFFF; font-family:{FONT_STACK}; }}
    text {{ paint-order:stroke; stroke:#FFFFFF; stroke-width:4px; stroke-linejoin:round; }}
    .small {{ font-size:15px; }}
    .wall {{ stroke:#20252B; stroke-width:2.2; stroke-linecap:round; }}
    .thin {{ stroke:#626971; stroke-width:1.4; stroke-linecap:round; }}
    .window {{ stroke:#4E5A63; stroke-width:1.5; stroke-linecap:round; }}
    .flow {{ fill:none; stroke:#D94444; stroke-width:3.2; stroke-dasharray:11 8; stroke-linecap:round; stroke-linejoin:round; marker-end:url(#arrow-red); }}
    .siteLine {{ fill:none; stroke:#708A78; stroke-width:1.6; stroke-dasharray:5 5; opacity:.75; }}
  </style>
</defs>"""
    )
    elements.append('<rect x="0" y="0" width="1600" height="1060" fill="#FFFFFF"/>')
    elements.append(svg_text(72, 58, "场地总平面图", 38, 700, "start", fill="#111820"))
    elements.append(svg_text(72, 91, "基于原有 CAD/地形图轮廓整理 · 功能平面深化", 17, 400, "start", fill="#5A626A"))
    elements.append(f'<image x="{MX}" y="{MY}" width="{PLAN_W}" height="{PLAN_H}" href="data:image/png;base64,{topo_b64}" opacity="0.88"/>')
    elements.append(f'<rect x="{MX}" y="{MY}" width="{PLAN_W}" height="{PLAN_H}" fill="none" stroke="#D3D8DD" stroke-width="1"/>')

    # South agricultural open space and rural road.
    elements.append(polygon_el(p(FARM), "#DCE9D5", "#94AE91", 1.5, 'opacity="0.82"'))
    elements.append(f'<polygon points="{pts(p(FARM))}" fill="url(#farmRows)" opacity=".75"/>')
    elements.append(svg_text(MX + 548, MY + 707, "农事活动区", 24, 700))
    elements.append(svg_text(MX + 548, MY + 736, "农田 / 菜园 / 劳作场地", 19, 500, fill="#3E5B40"))
    elements.append(
        f'<path d="M {MX+35} {MY+573} C {MX+183} {MY+548}, {MX+289} {MY+521}, {MX+407} {MY+545} '
        f'S {MX+658} {MY+611}, {MX+826} {MY+576} S {MX+1056} {MY+518}, {MX+1214} {MY+545}" '
        f'fill="none" stroke="#8B8F91" stroke-width="10" opacity=".18" stroke-linecap="round"/>'
    )
    elements.append(svg_text(MX + 118, MY + 587, "村路 / 乡道", 17, 500, "start", fill="#576064"))

    # River/edge platform relationship.
    elements.append(
        f'<path d="M {MX+299} {MY+415} C {MX+443} {MY+329}, {MX+560} {MY+356}, {MX+698} {MY+374} '
        f'S {MX+968} {MY+419}, {MX+1135} {MY+555}" fill="none" stroke="#63B9C9" stroke-width="5" opacity=".82"/>'
    )
    elements.append(svg_text(MX + 820, MY + 132, "步行至对岸 / 高处观景台", 16, 500, "start", fill="#316878"))
    elements.append(f'<path class="flow" d="M {MX+790} {MY+176} C {MX+780} {MY+130}, {MX+805} {MY+95}, {MX+848} {MY+74}"/>')

    # Courtyard before buildings, so buildings sit over it.
    elements.append(polygon_el(p(COURTYARD), "#EFE6F7", "#8F7EA4", 1.8, 'stroke-dasharray="8 6" opacity="0.72"'))
    elements.append(svg_text(MX + 822, MY + 343, "夜游活动庭院", 20, 700, fill="#5A4772"))
    elements.append(f'<circle cx="{MX+848}" cy="{MY+349}" r="20" fill="#F6F2FA" stroke="#8F7EA4" stroke-width="1.4"/>')
    elements.append(f'<circle cx="{MX+848}" cy="{MY+349}" r="7" fill="#A98BC5" opacity=".45"/>')
    elements.append(f'<circle cx="{MX+611}" cy="{MY+367}" r="15" fill="#F1E6BF" stroke="#9B8E55" opacity=".78"/>')

    for b in BUILDINGS:
        elements.append(polygon_el(p(b["poly"]), b["color"]))

    add_doors_windows(elements)
    add_furniture(elements)

    # Main zone labels on top of the plan.
    label_data = [
        (413, 246, "研学工坊", 21, "#7A4E20"),
        (267, 362, "农耕文化展览", 17, "#52623E"),
        (571, 236, "中部过渡空间", 16, "#7D6E2E"),
        (836, 157, "夜游展示 / 灯光体验", 20, "#5A4772"),
        (946, 462, "居民生活区", 19, "#416743"),
    ]
    for x, y, text, size, fill in label_data:
        elements.append(svg_text(MX + x, MY + y, text, size, 700, fill=fill))

    # Entrances and pedestrian flows.
    elements += [
        svg_text(MX + 153, MY + 574, "主入口", 19, 700, "start", fill="#B73333"),
        svg_text(MX + 776, MY + 432, "夜游体验入口", 16, 700, "start", fill="#B73333"),
        svg_text(MX + 1020, MY + 448, "居民区入口", 16, 700, "start", fill="#B73333"),
        f'<path class="flow" d="M {MX+150} {MY+560} C {MX+202} {MY+505}, {MX+250} {MY+476}, {MX+333} {MY+430} '
        f'S {MX+495} {MY+349}, {MX+564} {MY+322}"/>',
        f'<path class="flow" d="M {MX+564} {MY+322} C {MX+612} {MY+316}, {MX+645} {MY+335}, {MX+694} {MY+343} '
        f'S {MX+765} {MY+377}, {MX+830} {MY+365}"/>',
        f'<path class="flow" d="M {MX+824} {MY+362} C {MX+850} {MY+325}, {MX+881} {MY+304}, {MX+932} {MY+303}"/>',
        f'<path class="flow" d="M {MX+1034} {MY+474} C {MX+1015} {MY+445}, {MX+994} {MY+426}, {MX+953} {MY+416}"/>',
    ]

    # North arrow and scale.
    nx, ny = 1456, 138
    elements.append(f'<path d="M {nx} {ny-70} L {nx-18} {ny-8} L {nx} {ny-20} L {nx+18} {ny-8} Z" fill="#14191E"/>')
    elements.append(svg_text(nx, ny + 18, "N", 22, 700))
    sx, sy = 1368, 910
    elements.append(svg_text(sx, sy - 25, "比例尺", 16, 600, "start", fill="#333A40"))
    for i in range(4):
        elements.append(f'<rect x="{sx + i*38}" y="{sy}" width="38" height="10" fill="{"#222" if i%2==0 else "#FFF"}" stroke="#222"/>')
    for i, label in enumerate(["0", "10", "20", "30m"]):
        elements.append(svg_text(sx + i * 38, sy + 30, label, 13, 400, "middle", fill="#333A40"))

    # Legend.
    lx, ly = 1368, 238
    elements.append(svg_text(lx, ly - 24, "图例", 20, 700, "start"))
    legend = [
        ("#F5C99A", "研学工坊"),
        ("#E7EFC9", "农耕文化展览 / 教室"),
        ("#F6E7A6", "休息 / 过渡空间"),
        ("#BFE3ED", "沿河廊桥 / 平台"),
        ("#DAC7F1", "夜游体验 / 展示"),
        ("#CDE7C8", "居民生活区"),
        ("#DCE9D5", "农事活动区"),
    ]
    for i, (color, text) in enumerate(legend):
        y = ly + i * 42
        elements.append(f'<rect x="{lx}" y="{y}" width="30" height="20" fill="{color}" stroke="#454B52"/>')
        elements.append(svg_text(lx + 42, y + 15, text, 15, 500, "start", fill="#333A40"))
    elements.append(f'<line x1="{lx}" y1="{ly+310}" x2="{lx+55}" y2="{ly+310}" class="flow"/>')
    elements.append(svg_text(lx + 70, ly + 316, "主要入口与流线", 15, 500, "start", fill="#333A40"))
    elements.append(f'<line x1="{lx}" y1="{ly+350}" x2="{lx+58}" y2="{ly+350}" stroke="#B9BFC5" stroke-width="2"/>')
    elements.append(svg_text(lx + 70, ly + 356, "等高线 / 地形", 15, 500, "start", fill="#333A40"))

    elements.append(svg_text(72, 1018, "注：建筑外轮廓、相对位置与朝向依据图二 CAD/地形图整理；内部功能依据手绘草图转译深化。", 15, 400, "start", fill="#697078"))
    elements.append("</svg>")

    svg_path = OUT / "formal_site_plan.svg"
    svg_path.write_text("\n".join(elements), encoding="utf-8")

    html_path = OUT / "formal_site_plan_print.html"
    html_path.write_text(
        f"""<!doctype html>
<html><head><meta charset="utf-8">
<style>
@page {{ size: {PAGE_W}px {PAGE_H}px; margin: 0; }}
html, body {{ margin:0; width:{PAGE_W}px; height:{PAGE_H}px; background:white; }}
img {{ display:block; width:{PAGE_W}px; height:{PAGE_H}px; }}
</style></head><body><img src="formal_site_plan.svg" alt="formal site plan"></body></html>""",
        encoding="utf-8",
    )
    return svg_path, html_path


def write_dxf():
    def dxf_poly(layer, points, closed=True):
        s = [
            "0", "LWPOLYLINE", "8", layer, "90", str(len(points)), "70", "1" if closed else "0"
        ]
        for x, y in points:
            s += ["10", f"{x:.3f}", "20", f"{-y:.3f}"]
        return s

    def dxf_text(layer, x, y, text, h=16):
        return [
            "0", "TEXT", "8", layer, "10", f"{x:.3f}", "20", f"{-y:.3f}",
            "40", f"{h:.3f}", "1", text,
        ]

    lines = ["0", "SECTION", "2", "ENTITIES"]
    for b in BUILDINGS:
        lines += dxf_poly(b["zone"], b["poly"])
        cx, cy = centroid(b["poly"])
        lines += dxf_text("功能标注", cx, cy, b["name"], 14)
    lines += dxf_poly("夜游活动庭院", COURTYARD)
    lines += dxf_text("功能标注", 822, 343, "夜游活动庭院", 16)
    lines += dxf_poly("农事活动区", FARM)
    lines += dxf_text("功能标注", 548, 707, "农事活动区 / 农田 / 菜园 / 劳作场地", 18)
    lines += ["0", "ENDSEC", "0", "EOF"]
    (OUT / "formal_site_plan_editable.dxf").write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    build_svg()
    write_dxf()
    print(OUT)
