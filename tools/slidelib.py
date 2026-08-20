"""Shared slide geometry helpers for the extraction tools."""
from PIL import Image


def banner_bottom(img: Image.Image, search: float = 0.30) -> int:
    """
    Last row of the title bar at the top of a slide.

    Only the top of the image is searched, and only the first run of blue rows
    counts. Several slides carry a second blue band along the bottom, and taking
    the last blue row anywhere would put the "content top" below the whole slide
    — which silently emptied the search area rather than failing loudly.
    """
    rgb = img.convert("RGB")
    px = rgb.load()
    step = max(1, rgb.width // 200)
    limit = int(rgb.height * search)
    threshold = (rgb.width / step) * 0.6

    def is_blue_row(y: int) -> bool:
        blue = sum(
            1
            for x in range(0, rgb.width, step)
            for r, g, b in (px[x, y],)
            if b > 100 and b > r + 40 and b > g + 30
        )
        return blue > threshold

    # The last blue row in the top band — not the first non-blue row after it.
    # The title's large white glyphs make their own rows non-blue, so stopping at
    # the first gap returns a line through the middle of the banner.
    last = 0
    for y in range(limit):
        if is_blue_row(y):
            last = y
    return last
