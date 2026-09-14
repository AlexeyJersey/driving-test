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

A band gives an icon's rows. Its columns are a separate question, and getting
them from the same narrow window truncated thirteen illustrations before
question_column() below started reading the layout instead — see the note
there. The two together mean this rebuilds every crop in the volume exactly:
running it is no longer something to be careful about, because there is nothing
left in data/images/III that it did not produce.
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
# This bounds the scan that finds an icon's *rows*, which is all it has to do:
# every icon starts inside this column even when it does not end there. The
# crop's right edge is found per icon by question_column() below.
COLUMN = 0.24
# How far right to look for the question column. Its bullet sits at 0.40w at
# the latest, so this reaches it on every slide while staying clear of the
# answer boxes down the right-hand edge.
SCAN = 0.45
WHITE = 253
BACKGROUND_TOLERANCE = 0.02
GAP = 4
MIN_HEIGHT = 0.03
# A question opens with a "-" bullet: never wider than BULLET, and always
# preceded by at least GUTTER blank columns. Measured across the volume, where
# the bullet runs 4 to 7 px and the tightest gutter is 12 px.
BULLET = 8
GUTTER = 8
# A caption printed under its figure sits this close beneath it. Volume III has
# exactly one — the 1-2-3-4 under the traffic lights on slide 25, without which
# that question cannot be answered — and it is 10 rows down. The nearest thing
# that is *not* a caption, a decorative bar under a photograph on slide 5, is 16
# rows down, so the threshold separates them with room to spare.
CAPTION_GAP = 12
# Two slides stack their figures too tightly for any row scan to divide, so
# their bands are given outright. Both were previously papered over with hand
# crops that the rebuild here would have destroyed — and both hand crops were
# themselves wrong.
#
# Slide 16 runs three signs down one column: the P sign, the sign for parking
# on a pavement, and an E-70 road-number plate. The last two do not merely sit
# close, they touch — row 344 carries ink from both — so nothing separates them
# but the number. The first question asks about "znaci", plural, and wants the
# P sign together with the pavement sign; the plate answers the question after.
#
# Slide 18 pairs a "no left turn" sign with an "od 17 - 05 h" plaque. The plaque
# stands 4 rows under its sign and 2 rows above the next one, so the scan bound
# it to the wrong neighbour: it belongs to the question about "znaci", plural,
# and has no business in the lane-guidance sign that follows it.
BANDS = {
    16: [(1, 94), (128, 211), (228, 343), (344, 381), (447, 509)],
    18: [(7, 43), (87, 180), (198, 316), (319, 389), (439, 532)],
}
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


def ink_segments(px, y0: int, y1: int, lim: int) -> list[tuple[int, int]]:
    """Runs of columns carrying ink between y0 and y1, left to right."""
    ink = [x for x in range(lim) if any(px[x, y] < WHITE for y in range(y0, y1 + 1))]
    if not ink:
        return []
    segs: list[tuple[int, int]] = []
    start = prev = ink[0]
    for x in ink[1:]:
        if x - prev > 1:
            segs.append((start, prev))
            start = x
        prev = x
    segs.append((start, prev))
    return segs


def question_column(segs: list[tuple[int, int]], lim: int) -> int:
    """
    Index of the first segment that belongs to the question rather than the icon.

    Cutting at a fixed fraction of the slide width is what truncated thirteen
    illustrations, fixed by hand in 7dafffd and after: the widest icons run well
    past any fraction narrow enough to keep the question text out, and one of
    them lost the fourth traffic light and the numbering its question asks the
    reader to order.

    Nor can the two be told apart by the size of the blank between them. The
    gutter to the question narrows to 12 px on slide 20, while an icon's own
    parts stand 20 px apart on slide 4 — so no rule of the form "stop after N
    blank columns" separates a gutter from a gap inside a figure.

    What does separate them is the layout. Every question opens with a "-"
    bullet: a mark a few pixels wide, standing alone across the gutter, with the
    text after it. Finding that mark finds the boundary whatever the icon's
    width. A slide whose bullet did not survive as its own segment falls back to
    the last segment, the one running off the edge of the scan — that is the
    text, so the icon ends before it.
    """
    for i in range(1, len(segs)):
        gap = segs[i][0] - segs[i - 1][1] - 1
        width = segs[i][1] - segs[i][0] + 1
        if gap >= GUTTER and width <= BULLET and i < len(segs) - 1:
            return i
    if len(segs) > 1 and segs[-1][1] >= lim - 1 and segs[-1][0] - segs[-2][1] - 1 >= GUTTER:
        return len(segs) - 1
    return len(segs)


def caption_end(px, box: tuple[int, int, int], stop: int, captions, h: int) -> int:
    """
    The icon's last row, extended over a caption printed beneath the figure.

    Only bands MIN_HEIGHT already threw away are eligible, so a neighbouring
    icon can never be swallowed however close it sits — and on slide 18 one sits
    4 rows away, closer than slide 25's caption does. The caption's own depth is
    remeasured inside the icon's width: the row scan saw only the part of it
    that falls in the narrow column, which for 1-2-3-4 is the digits 1 to 3.
    """
    x0, x1, y1 = box
    for c0, c1 in captions:
        if not (y1 < c0 <= y1 + CAPTION_GAP) or c1 >= stop:
            continue
        if not any(px[x, y] < WHITE for x in range(x0, x1) for y in range(c0, c1 + 1)):
            continue
        y = c1 + 1
        while y < min(stop, h) and any(px[x, y] < WHITE for x in range(x0, x1)):
            y += 1
        return y - 1
    return y1


def icon_boxes(img: Image.Image, page: int) -> list[tuple[int, int, int, int]]:
    grey = img.convert("L")
    px = grey.load()
    w, h = grey.size
    xmax = int(w * COLUMN)
    lim = int(w * SCAN)

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
    icons = BANDS.get(page) or [b for b in bands if b[1] - b[0] > h * MIN_HEIGHT]
    captions = [b for b in bands if b[1] - b[0] <= h * MIN_HEIGHT]

    boxes = []
    for i, (y0, y1) in enumerate(icons):
        segs = ink_segments(px, y0, y1, lim)
        if not segs:
            continue
        cut = question_column(segs, lim)
        x0, x1 = segs[0][0], segs[cut - 1][1] + 1
        stop = icons[i + 1][0] if i + 1 < len(icons) else h
        y1 = caption_end(px, (x0, x1, y1), stop, captions, h)
        boxes.append((x0, y0, x1, y1 + 1))
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
        boxes = icon_boxes(raster, page) if raster else []
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
