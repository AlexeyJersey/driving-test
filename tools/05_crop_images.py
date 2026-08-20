"""Crop the photographs out of the illustrated slides.

The illustrations cannot be pulled from the PDF as files — each slide is one
flattened raster holding text and pictures together — so they have to be cut out
of the render by position. What makes that tractable for volume II is that its
photographs are dense blocks sitting in a left column that is otherwise empty:
scanning that column for rows of heavy ink finds them, where scanning for colour
does not (the theme's decoration is colourful and the photographs are not
especially saturated).

Writes data/images/<VOLUME>/<VOLUME>-<page>-<a|b|...>.png and prints a manifest
so the crops can be checked against the slides before anything is transcribed.
"""
import shutil
import sys
from pathlib import Path

from PIL import Image

from slidelib import banner_bottom

ROOT = Path(__file__).resolve().parent.parent
RENDERS = ROOT / "build" / "pages"
IMAGES = ROOT / "data" / "images"

# Photographs live in the left part of the slide; questions sit to their right.
COLUMN = 0.45
# A column of a photograph is nearly all non-white; a column of text is not.
DENSITY = 0.60
# Ignore anything too short to be a photograph (the banner, stray rules).
MIN_HEIGHT = 0.08
# Rows of white this tall separate one photograph from the next.
GAP = 12
LETTERS = "abcdefgh"
# WebP at this quality is visually indistinguishable from the PNG crop on these
# photographs — signs, vehicle numbers and road markings all survive — at about
# a twelfth of the size. Sizing images belongs in the pipeline, not in a caching
# policy, and 80 crops as PNG would be 17 MB against 1.5 MB here.
WEBP_QUALITY = 82
# Photographs per slide in volume II. Used only to rejoin a split photograph,
# never to invent one that was not found.
EXPECTED = 2


def photo_boxes(img: Image.Image) -> list[tuple[int, int, int, int]]:
    grey = img.convert("L")
    px = grey.load()
    w, h = grey.size
    top = banner_bottom(img)
    xmax = int(w * COLUMN)

    def row_density(y: int) -> float:
        dark = sum(1 for x in range(0, xmax, 2) if px[x, y] < 240)
        return dark / (xmax / 2)

    dense = [y for y in range(top, h) if row_density(y) > DENSITY]
    if not dense:
        return []

    bands: list[tuple[int, int]] = []
    start = prev = dense[0]
    for y in dense[1:]:
        if y - prev > GAP:
            bands.append((start, prev))
            start = y
        prev = y
    bands.append((start, prev))
    bands = [b for b in bands if b[1] - b[0] > h * MIN_HEIGHT]

    # A bright strip inside a photograph — a stretch of road, an overcast sky —
    # can fall below the density threshold and split one picture in two. Volume II
    # is laid out two photographs to a slide, so where more bands than that turn
    # up, the closest pair is the split one: merge until two remain.
    while len(bands) > EXPECTED:
        gaps = [(bands[i + 1][0] - bands[i][1], i) for i in range(len(bands) - 1)]
        _, i = min(gaps)
        bands[i : i + 2] = [(bands[i][0], bands[i + 1][1])]

    boxes = []
    for y0, y1 in bands:
        def col_density(x: int) -> float:
            dark = sum(1 for y in range(y0, y1, 2) if px[x, y] < 240)
            return dark / ((y1 - y0) / 2)

        cols = [x for x in range(xmax) if col_density(x) > DENSITY]
        if not cols:
            continue
        boxes.append((min(cols), y0, max(cols) + 1, y1 + 1))
    return boxes


def main(argv: list[str]) -> int:
    volumes = argv or ["II"]
    for vol in volumes:
        renders = sorted(RENDERS.glob(f"{vol}-*.png"))
        if not renders:
            print(f"!! no renders for {vol}; run 01_render.py first", file=sys.stderr)
            return 1
        out = IMAGES / vol
        # Rebuilt from scratch: a crop left over from an earlier run would keep
        # satisfying the build-time check for an image that no longer exists.
        if out.exists():
            shutil.rmtree(out)
        out.mkdir(parents=True)

        total = 0
        odd = []
        for path in renders:
            page = int(path.stem.split("-")[1])
            img = Image.open(path).convert("RGB")
            boxes = photo_boxes(img)
            if len(boxes) != EXPECTED:
                # Volume II is laid out two photographs to a slide; anything else
                # is worth a human look rather than silent acceptance.
                odd.append((page, len(boxes)))
            for i, box in enumerate(boxes):
                name = f"{vol}-{page}-{LETTERS[i]}.webp"
                img.crop(box).save(out / name, "WEBP", quality=WEBP_QUALITY, method=6)
                total += 1
            print(f"  {vol}-{page:>2}: {len(boxes)} photo(s) " +
                  " ".join(f"{b[2]-b[0]}x{b[3]-b[1]}" for b in boxes))
        print(f"{vol}: {total} crops written to {out}")
        if odd:
            print(f"!! slides not showing two photographs: {odd}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
