"""Crop the photographs out of the illustrated slides.

The illustrations cannot be pulled from the PDF as files — each slide is one
flattened raster holding text and pictures together — so they have to be cut out
by position. What makes that tractable for volume II is that its photographs are
dense blocks sitting in a left column that is otherwise empty: scanning that
column for rows of heavy ink finds them, where scanning for colour does not (the
theme's decoration is colourful and the photographs are not especially
saturated).

Cuts from the slide's **own raster**, not from a page render. That matters more
than it sounds: the raster is only about 750 px wide, so a 150 dpi render is a
2x interpolation of it, and cropping from the render then compressing bakes
poppler's smoothing into the file. Cropping the original pixels and letting the
browser scale them is visibly sharper and about half the size. The source caps
a photograph at roughly 310x200 real pixels; nothing here can add detail, so the
job is to stop removing it.

Writes data/images/<VOLUME>/<VOLUME>-<page>-<a|b|...>.webp and prints a manifest
so the crops can be checked against the slides before anything is transcribed.
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

# Photographs live in the left part of the slide; questions sit to their right.
COLUMN = 0.45
# Anything below this counts as painted rather than background.
WHITE = 253
# A row is background only if virtually none of it is painted.
BACKGROUND_TOLERANCE = 0.02
# Ignore anything too short to be a photograph (the banner, stray rules).
MIN_HEIGHT = 0.08
# Rows of background this tall separate one photograph from the next. Measured in
# the raster's own pixels, which are about half the size of a 150 dpi render's.
GAP = 5
LETTERS = "abcdefgh"
# WebP at this quality is visually indistinguishable from the PNG crop on these
# photographs — signs, vehicle numbers and road markings all survive — at about
# a twelfth of the size. Sizing images belongs in the pipeline, not in a caching
# policy, and 80 crops as PNG would be 17 MB against 1.5 MB here.
WEBP_QUALITY = 82
# Served at twice the source size with a light unsharp mask. The upscale gives
# the browser something to work with on a high-density screen, and sharpening
# after the upscale reads crisper than before it. Kept mild on purpose: a strong
# mask invents halos, and on a test where the task is reading a sign in the
# photograph, invented detail is a hazard rather than a feature.
SERVE_SCALE = 2
UNSHARP = dict(radius=1.2, percent=90, threshold=2)
# Photographs per slide in volume II. Used only to rejoin a split photograph,
# never to invent one that was not found.
EXPECTED = 2


def slide_rasters(pdf: Path, page: int) -> list[Image.Image]:
    """
    Every content raster on the page, in placement order.

    The deck is not consistent about this: most slides carry one raster holding
    both halves, but some split it into one raster per half. Taking only the
    largest silently returned half a slide, and half a slide still detects one
    photograph, so it looked like a detection failure rather than a missing
    input. The banner is excluded by shape and colour: it is wider than the
    content and palette-encoded, while the photographs are RGB.
    """
    for old in TMP.glob("r-*"):
        old.unlink()
    subprocess.run(
        ["pdfimages", "-f", str(page), "-l", str(page), "-png", str(pdf), str(TMP / "r")],
        check=True,
        capture_output=True,
    )
    out = []
    for path in sorted(TMP.glob("r-*.png")):
        img = Image.open(path)
        if img.mode != "RGB" or not (600 <= img.width <= 900) or img.height < 80:
            continue
        out.append(img.convert("RGB"))
    return out


def photo_boxes(img: Image.Image) -> list[tuple[int, int, int, int]]:
    """
    The photographs on one content raster.

    Found by where the background *is*, not by where the ink is. An earlier
    version looked for rows dense with dark pixels, which quietly cropped the top
    off any photograph that opens on bright sky — and on slide 1 that cut away the
    give-way sign the question is about, leaving a question that cannot be
    answered from its own picture. Blown-out sky is indistinguishable from an
    empty gap by darkness, but not by coverage: inside a photograph almost every
    pixel is at least slightly off-white, while a true gap row is pure white edge
    to edge.
    """
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

    while len(bands) > EXPECTED:
        gaps = [(bands[i + 1][0] - bands[i][1], i) for i in range(len(bands) - 1)]
        _, i = min(gaps)
        bands[i : i + 2] = [(bands[i][0], bands[i + 1][1])]

    boxes = []
    for y0, y1 in bands:
        cols = [
            x
            for x in range(xmax)
            if any(px[x, y] < WHITE for y in range(y0, y1 + 1))
        ]
        if not cols:
            continue
        boxes.append((min(cols), y0, max(cols) + 1, y1 + 1))
    return boxes


def main(argv: list[str]) -> int:
    volumes = argv or ["II"]
    TMP.mkdir(parents=True, exist_ok=True)
    for vol in volumes:
        pdf = SRC / f"{vol} str. ispitnih testova.pdf"
        if not pdf.exists():
            print(f"!! missing {pdf.name}", file=sys.stderr)
            return 1
        pages = int(
            subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True, check=True)
            .stdout.split("Pages:")[1]
            .split()[0]
        )
        out = IMAGES / vol
        # Rebuilt from scratch: a crop left over from an earlier run would keep
        # satisfying the build-time check for an image that no longer exists.
        if out.exists():
            shutil.rmtree(out)
        out.mkdir(parents=True)

        total = 0
        odd = []
        for page in range(1, pages + 1):
            rasters = slide_rasters(pdf, page)
            if not rasters:
                odd.append((page, "no raster"))
                continue
            found: list[tuple[Image.Image, tuple[int, int, int, int]]] = []
            for raster in rasters:
                for box in photo_boxes(raster):
                    found.append((raster, box))
            if len(found) != EXPECTED:
                # Volume II is laid out two photographs to a slide; anything else
                # is worth a human look rather than silent acceptance.
                odd.append((page, len(found)))
            for i, (raster, box) in enumerate(found):
                name = f"{vol}-{page}-{LETTERS[i]}.webp"
                crop = raster.crop(box)
                served = crop.resize(
                    (crop.width * SERVE_SCALE, crop.height * SERVE_SCALE), Image.LANCZOS
                ).filter(ImageFilter.UnsharpMask(**UNSHARP))
                served.save(out / name, "WEBP", quality=WEBP_QUALITY, method=6)
                total += 1
            print(f"  {vol}-{page:>2}: {len(found)} photo(s) " +
                  " ".join(f"{b[2]-b[0]}x{b[3]-b[1]}" for _, b in found))
        print(f"{vol}: {total} crops written to {out}")
        shutil.rmtree(TMP, ignore_errors=True)
        if odd:
            print(f"!! slides not showing two photographs: {odd}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
