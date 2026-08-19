"""Render every slide of the source PDFs to a full-bleed PNG.

The source decks were made in PowerPoint and the question blocks overflow the
slide, so a plain `pdftoppm` run clips text at the top/bottom. We widen each
page box first, render, then crop back to the ink.
"""
import shutil
import subprocess
import sys
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "source"
OUT = ROOT / "build" / "pages"
MARGIN = 150  # pt of breathing room added on every side before rendering
DPI = 150
VOLUMES = {"I": "I", "II": "II", "III": "III", "IV": "IV"}


def expand(pdf: Path, dest: Path) -> None:
    reader, writer = PdfReader(pdf), PdfWriter()
    for page in reader.pages:
        box = page.mediabox
        page.mediabox.lower_left = (float(box.left) - MARGIN, float(box.bottom) - MARGIN)
        page.mediabox.upper_right = (float(box.right) + MARGIN, float(box.top) + MARGIN)
        page.cropbox = page.mediabox
        writer.add_page(page)
    with dest.open("wb") as fh:
        writer.write(fh)


def crop_to_ink(png: Path) -> tuple[int, int]:
    img = Image.open(png).convert("RGB")
    ink = img.convert("L").point(lambda v: 0 if v > 247 else 255)
    box = ink.getbbox()
    if box:
        pad = 10
        box = (
            max(box[0] - pad, 0),
            max(box[1] - pad, 0),
            min(box[2] + pad, img.width),
            min(box[3] + pad, img.height),
        )
        img = img.crop(box)
    img.save(png)
    return img.size


def main(argv: list[str]) -> int:
    wanted = [v for v in (argv or VOLUMES) if v in VOLUMES]
    if not wanted:
        print(f"usage: 01_render.py [{' '.join(VOLUMES)}]", file=sys.stderr)
        return 2
    OUT.mkdir(parents=True, exist_ok=True)
    for vol in wanted:
        for stale in OUT.glob(f"{vol}-*.png"):
            stale.unlink()
    tmp = OUT.parent / "expanded"
    tmp.mkdir(exist_ok=True)

    for vol in wanted:
        pdf = SRC / f"{vol} str. ispitnih testova.pdf"
        if not pdf.exists():
            print(f"!! missing {pdf.name}", file=sys.stderr)
            return 1
        wide = tmp / f"{vol}.pdf"
        expand(pdf, wide)
        subprocess.run(
            ["pdftoppm", "-r", str(DPI), "-png", str(wide), str(OUT / vol)], check=True
        )
        pages = sorted(OUT.glob(f"{vol}-*.png"))
        sizes = [crop_to_ink(p) for p in pages]
        w = max(s[0] for s in sizes)
        h = max(s[1] for s in sizes)
        print(f"{vol}: {len(pages)} pages, max {w}x{h}px")
    shutil.rmtree(tmp)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
