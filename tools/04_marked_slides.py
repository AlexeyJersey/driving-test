"""Produce one complete slide image per page, for transcription.

Two sources are needed and neither is sufficient alone:

  * The page render (01_render.py) is sharp and carries every answer mark, but
    PowerPoint truncates the question raster at the slide boundary, so roughly
    the last text row of each slide is missing from it. Expanding the page box
    does not recover it, and neither does stripping clipping paths — the
    truncation is baked into how the picture is placed.
  * The raster embedded in the PDF has the complete text, but its checkboxes are
    empty: the marks are separate text objects drawn over it.

So: take the render as the base, and append the raster's missing rows beneath it,
upscaled to match and with an overlap so a row can still be paired with the mark
sitting above it. Nothing is aligned by guesswork, and nothing is lost.
"""
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "source"
RENDERS = ROOT / "build" / "pages"
OUT = ROOT / "build" / "marked"
TMP = ROOT / "build" / "embedded"
VOLUMES = ("I", "II", "III", "IV")

# Raster rows repeated above the seam, so the appended text can be matched to the
# mark that belongs to it.
OVERLAP = 30
# Below this many missing rows the render already shows everything worth reading.
MIN_MISSING = 8


def banner_bottom(img: Image.Image) -> int:
    """Last row of the solid title bar — where the question raster begins."""
    px = img.convert("RGB").load()
    step = max(1, img.width // 200)
    last = 0
    for y in range(img.height):
        blue = sum(
            1
            for x in range(0, img.width, step)
            for r, g, b in (px[x, y],)
            if b > 100 and b > r + 40 and b > g + 30
        )
        if blue > (img.width / step) * 0.6:
            last = y
    return last


def content_raster(pdf: Path, page: int, dest: Path) -> Image.Image | None:
    """The largest image on the page: the slide's question raster."""
    for old in dest.glob("emb-*"):
        old.unlink()
    subprocess.run(
        ["pdfimages", "-f", str(page), "-l", str(page), "-png", str(pdf), str(dest / "emb")],
        check=True,
        capture_output=True,
    )
    biggest = sorted(dest.glob("emb-*.png"), key=lambda p: p.stat().st_size, reverse=True)
    if not biggest:
        return None
    img = Image.open(biggest[0]).convert("RGB")
    return img if img.height > 200 else None


def compose(render: Image.Image, raster: Image.Image) -> tuple[Image.Image, int]:
    top = banner_bottom(render)
    scale = render.width / raster.width
    shown_rows = round((render.height - top) / scale)
    missing = raster.height - shown_rows
    if missing < MIN_MISSING:
        return render, 0

    # Cap the appended strip: without this, a page whose render already shows
    # almost everything gets its whole slide duplicated, doubling the image for
    # no added information.
    keep = min(missing + OVERLAP, round(raster.height * 0.30))
    start = max(0, raster.height - keep)
    strip = raster.crop((0, start, raster.width, raster.height))
    strip = strip.resize((render.width, max(1, round(strip.height * scale))), Image.LANCZOS)

    out = Image.new("RGB", (render.width, render.height + strip.height + 6), "white")
    out.paste(render, (0, 0))
    draw = ImageDraw.Draw(out)
    # A visible seam, so the repeated rows are never mistaken for extra questions.
    draw.line((0, render.height + 2, render.width, render.height + 2), fill=(200, 60, 60), width=2)
    out.paste(strip, (0, render.height + 6))
    return out, missing


def main(argv: list[str]) -> int:
    wanted = [v for v in (argv or VOLUMES) if v in VOLUMES]
    if not wanted:
        print(f"usage: 04_marked_slides.py [{' '.join(VOLUMES)}]", file=sys.stderr)
        return 2

    OUT.mkdir(parents=True, exist_ok=True)
    TMP.mkdir(parents=True, exist_ok=True)

    for vol in wanted:
        pdf = SRC / f"{vol} str. ispitnih testova.pdf"
        if not pdf.exists():
            print(f"!! missing {pdf.name}", file=sys.stderr)
            return 1
        renders = sorted(RENDERS.glob(f"{vol}-*.png"))
        if not renders:
            print(f"!! no renders for {vol}; run 01_render.py first", file=sys.stderr)
            return 1

        extended = 0
        for path in renders:
            page = int(path.stem.split("-")[1])
            render = Image.open(path).convert("RGB")
            raster = content_raster(pdf, page, TMP)
            if raster is None:
                render.save(OUT / path.name)
                continue
            composed, missing = compose(render, raster)
            composed.save(OUT / path.name)
            if missing:
                extended += 1
        print(f"{vol}: {len(renders)} slides, {extended} needed the appended strip -> {OUT}")

    shutil.rmtree(TMP, ignore_errors=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
