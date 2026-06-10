# Generates runmarket brand assets (app icon + splash) from the Claude Design
# "Route Pin" mark. Source of truth: brand.jsx (RoutePin) / mobile.jsx (Splash).
# Run once with: python .eas/gen_brand_assets.py
import io, shutil, os
import cairosvg
from PIL import Image

ASSETS = os.path.join(os.path.dirname(__file__), "..", "assets")
ASSETS = os.path.abspath(ASSETS)
BUNDLE = r"C:\Users\pepe\.claude\projects\C--repository-runmarket-runmarket-app\31eba982-6a7d-4836-933f-728735cdb55d\tool-results\design_extract\runmarket-icon\project\assets"

INK  = "#131A22"   # header navy (squid-ink)
INK2 = "#232F3E"   # secondary nav
INK3 = "#0B1016"   # deepest
ORANGE = "#FF8A00"

# ── RoutePin mark in its native 0 0 120 120 viewBox ───────────────────────
def route_pin(route=ORANGE, pin=ORANGE, dot="#ffffff", dash=True):
    g = ""
    if dash:
        g += (
            f'<g stroke="{route}" stroke-width="11" stroke-linecap="round" opacity="0.45">'
            '<line x1="13" y1="100" x2="27" y2="100"/>'
            '<line x1="20" y1="84" x2="31" y2="84"/></g>'
        )
    g += f'<path d="M26 98 C 44 86, 56 76, 86 60" stroke="{route}" stroke-width="13" stroke-linecap="round" fill="none"/>'
    g += f'<path d="M86 60 C 77 47 64 43 64 30 C 64 18 74 9 86 9 C 98 9 108 18 108 30 C 108 43 95 47 86 60 Z" fill="{pin}"/>'
    g += f'<circle cx="86" cy="29" r="9.5" fill="{dot}"/>'
    return g

def svg_to_png(svg, out, w, h=None):
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=w, output_height=h or w)
    Image.open(io.BytesIO(png)).save(out)
    print("wrote", out)

# Wrap the 120-unit mark, centered+scaled into a square canvas.
def mark_canvas(size, scale, mono=False):
    # mark bbox center ~ (57.75, 57.25), max dim ~100.5
    cx, cy = 57.75, 57.25
    tx, ty = 60 - cx * scale, 60 - cy * scale  # center within 120 canvas
    if mono:
        body = (
            '<g fill="#ffffff" stroke="#ffffff">'
            f'<g stroke-width="11" stroke-linecap="round"><line x1="13" y1="100" x2="27" y2="100"/>'
            '<line x1="20" y1="84" x2="31" y2="84"/></g>'
            '<path d="M26 98 C 44 86, 56 76, 86 60" stroke-width="13" stroke-linecap="round" fill="none"/>'
            '<path d="M86 60 C 77 47 64 43 64 30 C 64 18 74 9 86 9 C 98 9 108 18 108 30 C 108 43 95 47 86 60 Z" stroke="none"/>'
            '</g>'
            # punch the dot out so the pin reads as themed silhouette
            '<circle cx="86" cy="29" r="9.5" fill="#000000"/>'
        )
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">'
            f'<mask id="m"><rect width="120" height="120" fill="black"/>'
            f'<g transform="translate({tx},{ty}) scale({scale})">{body.replace("#000000","#000000")}</g></mask>'
            f'<rect width="120" height="120" fill="#ffffff" mask="url(#m)"/></svg>'
        )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">'
        f'<g transform="translate({tx},{ty}) scale({scale})">{route_pin()}</g></svg>'
    )

# For the mono mask we need white-where-visible. Rebuild properly:
def mono_canvas(size, scale):
    # Solid white silhouette; dot punched out via an even-odd compound path
    # (cairosvg does not honor <mask> reliably).
    cx, cy = 57.75, 57.25
    tx, ty = 60 - cx * scale, 60 - cy * scale
    pin_with_hole = (
        'M86 60 C 77 47 64 43 64 30 C 64 18 74 9 86 9 C 98 9 108 18 108 30 C 108 43 95 47 86 60 Z '
        'M95.5 29 a9.5 9.5 0 1 1 -19 0 a9.5 9.5 0 1 1 19 0 Z'
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">'
        f'<g transform="translate({tx},{ty}) scale({scale})" fill="white">'
        '<g stroke="white" stroke-width="11" stroke-linecap="round">'
        '<line x1="13" y1="100" x2="27" y2="100"/><line x1="20" y1="84" x2="31" y2="84"/></g>'
        '<path d="M26 98 C 44 86, 56 76, 86 60" stroke="white" stroke-width="13" stroke-linecap="round" fill="none"/>'
        f'<path d="{pin_with_hole}" fill-rule="evenodd"/>'
        '</g></svg>'
    )

# ── Android adaptive background: navy gradient + faint orange contours ─────
def adaptive_bg():
    contours = "".join(
        f'<path d="M-20 {70+i*34} C 40 {40+i*34}, 90 {110+i*34}, 150 {70+i*34} '
        f'S 250 {40+i*34}, 260 {80+i*34}" stroke="rgba(255,138,0,0.10)" stroke-width="2.5" fill="none"/>'
        for i in range(4)
    )
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220">'
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0.577" gradientUnits="objectBoundingBox">'
        f'<stop offset="0" stop-color="{INK2}"/><stop offset="1" stop-color="{INK3}"/></linearGradient></defs>'
        '<rect width="220" height="220" fill="url(#g)"/>'
        f'{contours}</svg>'
    )

# ── In-app splash background: radial navy + faint orange contour field ─────
def splash_bg(w=1284, h=2778):
    vw, vh = 402, 600
    contours = "".join(
        f'<path d="M-20 {120+i*80} C 90 {70+i*80}, 200 {190+i*80}, 300 {110+i*80} '
        f'S 460 {60+i*80}, 470 {140+i*80}" stroke="rgba(255,138,0,0.06)" stroke-width="2" fill="none"/>'
        for i in range(6)
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vw} {vh}" preserveAspectRatio="xMidYMid slice">'
        '<defs><radialGradient id="g" cx="0.5" cy="0.08" r="1.1">'
        f'<stop offset="0" stop-color="{INK2}"/><stop offset="0.48" stop-color="{INK}"/>'
        f'<stop offset="1" stop-color="{INK3}"/></radialGradient></defs>'
        f'<rect width="{vw}" height="{vh}" fill="url(#g)"/>'
        f'<g opacity="0.5">{contours}</g></svg>', w, h
    )

# 1) iOS / general app icon — full-bleed exported tile
shutil.copyfile(os.path.join(BUNDLE, "app-icon", "runmarket-icon-routepin-square-1024.png"),
                os.path.join(ASSETS, "icon.png"))
print("copied icon.png")

# 2) Web favicon — small navy tile
Image.open(os.path.join(BUNDLE, "favicon", "runmarket-favicon-192.png")).save(
    os.path.join(ASSETS, "favicon.png"))
print("wrote favicon.png")

# 3) Android adaptive icon layers
# Mark native bbox ~100.5 units in a 120 viewBox; scale 0.70 -> ~70 units so it
# sits inside the adaptive center safe zone (~66%) with breathing room.
svg_to_png(adaptive_bg(), os.path.join(ASSETS, "android-icon-background.png"), 1024)
svg_to_png(mark_canvas(1024, 0.70), os.path.join(ASSETS, "android-icon-foreground.png"), 1024)
svg_to_png(mono_canvas(1024, 0.70), os.path.join(ASSETS, "android-icon-monochrome.png"), 1024)

# 4) Native + in-app splash mark (transparent, colored, with dash)
svg_to_png(mark_canvas(1024, 0.90), os.path.join(ASSETS, "splash-icon.png"), 1024)

# 5) In-app splash background (gradient + contour field)
svg, sw, sh = splash_bg()
svg_to_png(svg, os.path.join(ASSETS, "splash-background.png"), sw, sh)

print("DONE")
