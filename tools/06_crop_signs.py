"""Crop the per-question sign/diagram illustrations out of volume III.

Unlike volume II, where two photographs sit at fixed positions on every slide,
volume III has one small illustration per question and the number of questions
per slide varies (4 to 8 seen so far). So instead of assuming a fixed count,
this finds every content band in the icon column and cross-checks the count
against the X marks in the PDF text layer for that slide — the same
cross-check that verified volumes I and II, just against a different quantity
(the answer marks predict question count, and question count equals icon count
here, since every question has exactly one icon).

A slide whose band count disagrees with its mark count is not silently
resolved: it is reported so the mismatch can be looked at directly, the same
policy as the merge step in 05_crop_images.py.
"""
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "source"
IMAGES = ROOT / "data" / "images"
TMP = ROOT / "build" / "raster"

# The icon sits in a narrow left column; questions and options fill the rest.
COLUMN = 0.24
WHITE = 253
BACKGROUND_TOLERANCE = 0.02
GAP = 4
MIN_HEIGHT = 0.03
SERVE_SCALE = 2
UNSHARP = dict(radius=1.2, percent=90, threshold=2)
WEBP_QUALITY = 85


def slide_raster(pdf: Path, page: int) -> Image.Image | None:
    for old in TMP.glob("r-*"):
        old.unlink()
    subprocess.run(
        ["pdfimages", "-f", str(page), "-l", str(page), "-png", str(pdf), str(TMP / "r")],
        check=True,
        capture_output=True,
    )
    biggest = sorted(TMP.glob("r-*.png"), key=lambda p: p.stat().st_size, reverse=True)
    if not biggest:
        return None
    img = Image.open(biggest[0]).convert("RGB")
    return img if img.height > 150 else None


def icon_boxes(img: Image.Image) -> list[tuple[int, int, int, int]]:
    grey = img.convert("L")
    px = grey.load()
    w, h = grey.size
    xmax = int(w * COLUMN)

    def has_content(y: int) -> bool:
        painted = sum(1 for x in range(xmax) if px[x, y] < WHITE)
        return painted / xmax > BACKGROUND_TOLERANCE

    rows = [y for y in range(h) if has_content(y)]
    if not rows:
        return []

    bands: list[tuple[int, int]] = []
    start = prev = rows[0]
    for y in rows[1:]:
        if y - prev > GAP:
            bands.append((start, prev))
            start = y
        prev = y
    bands.append((start, prev))
    bands = [b for b in bands if b[1] - b[0] > h * MIN_HEIGHT]

    boxes = []
    for y0, y1 in bands:
        cols = [x for x in range(xmax) if any(px[x, y] < WHITE for y in range(y0, y1 + 1))]
        if not cols:
            continue
        boxes.append((min(cols), y0, max(cols) + 1, y1 + 1))
    return boxes


def mark_count(pdf: Path, page: int) -> int:
    out = subprocess.run(
        ["pdftotext", "-f", str(page), "-l", str(page), "-bbox", str(pdf), "-"],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    import re

    return len(re.findall(r">[Xx]</word>", out))


def main() -> int:
    vol = "III"
    pdf = SRC / f"{vol} str. ispitnih testova.pdf"
    pages = int(
        subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True, check=True)
        .stdout.split("Pages:")[1]
        .split()[0]
    )
    # Marks come from the un-clipped page box, same lesson as 01_render.py:
    # reading against the plain PDF silently drops marks past the slide edge.
    wide = TMP / "wide.pdf"
    TMP.mkdir(parents=True, exist_ok=True)
    from pypdf import PdfReader, PdfWriter

    reader, writer = PdfReader(pdf), PdfWriter()
    for page in reader.pages:
        box = page.mediabox
        page.mediabox.lower_left = (float(box.left) - 150, float(box.bottom) - 150)
        page.mediabox.upper_right = (float(box.right) + 150, float(box.top) + 150)
        page.cropbox = page.mediabox
        writer.add_page(page)
    with wide.open("wb") as fh:
        writer.write(fh)

    out = IMAGES / vol
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    total = 0
    mismatches = []
    for page in range(1, pages + 1):
        raster = slide_raster(pdf, page)
        boxes = icon_boxes(raster) if raster else []
        marks = mark_count(wide, page)
        if len(boxes) != marks:
            mismatches.append((page, marks, len(boxes)))
        for i, box in enumerate(boxes, start=1):
            crop = raster.crop(box)
            served = crop.resize(
                (crop.width * SERVE_SCALE, crop.height * SERVE_SCALE), Image.LANCZOS
            ).filter(ImageFilter.UnsharpMask(**UNSHARP))
            served.save(out / f"{vol}-{page}-{i}.webp", "WEBP", quality=WEBP_QUALITY, method=6)
            total += 1
        print(f"  {vol}-{page:>2}: {marks} marks, {len(boxes)} icon(s) found" +
              ("  <-- MISMATCH" if len(boxes) != marks else ""))

    print(f"\n{vol}: {total} crops written to {out}")
    if mismatches:
        print(f"!! {len(mismatches)} slide(s) need a look: {mismatches}", file=sys.stderr)
    shutil.rmtree(TMP, ignore_errors=True)
    return 1 if mismatches else 0


if __name__ == "__main__":
    raise SystemExit(main())
