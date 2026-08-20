"""Build a static side-by-side page for checking the parse against the slides."""
import base64
import json
import sys
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# Prefer the composited slides from 04_marked_slides.py: the plain renders lose
# the last text row, and verifying a parse against a truncated slide is worse
# than not verifying it.
MARKED = ROOT / "build" / "marked"
PAGES = ROOT / "build" / "pages"
OUT = ROOT / "build" / "review.html"

CSS = """
:root { color-scheme: light dark; --bg:#fff; --fg:#111; --line:#d8dde3; --muted:#6b7280;
        --ok:#0a7d33; --okbg:#e8f6ec; --warn:#b45309; --warnbg:#fdf3e3; }
@media (prefers-color-scheme: dark) {
  :root { --bg:#14161a; --fg:#e8eaed; --line:#2c3038; --muted:#9aa2ad;
          --ok:#6ee7a0; --okbg:#12301d; --warn:#fbbf24; --warnbg:#33280d; } }
* { box-sizing: border-box; }
body { margin:0; padding:24px; background:var(--bg); color:var(--fg);
       font:15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
h1 { font-size:20px; margin:0 0 4px; }
.sub { color:var(--muted); margin-bottom:24px; }
.slide { display:grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap:20px;
         border-top:1px solid var(--line); padding:24px 0; align-items:start; }
@media (max-width:900px) { .slide { grid-template-columns:1fr; } }
.slide img { width:100%; border:1px solid var(--line); border-radius:6px; }
.pg { position:sticky; top:16px; }
.q { border:1px solid var(--line); border-radius:6px; padding:12px 14px; margin-bottom:12px; }
.q.flag { border-color:var(--warn); background:var(--warnbg); }
.qid { font:11px/1 ui-monospace, SFMono-Regular, monospace; color:var(--muted); }
.qt { font-weight:600; margin:6px 0 8px; }
ol { margin:0; padding-left:22px; }
li.correct { color:var(--ok); font-weight:600; background:var(--okbg); border-radius:4px;
             padding:1px 6px; margin-left:-6px; }
.note { margin-top:8px; font-size:13px; color:var(--warn); }
.editnote { margin-top:8px; font-size:13px; color:var(--muted); }
.tag { font-size:11px; color:var(--muted); border:1px solid var(--line);
       border-radius:99px; padding:1px 8px; margin-left:6px; }
"""


def build(volume: str) -> Path:
    data = json.loads((ROOT / "data" / f"questions-{volume}.json").read_text())
    by_page: dict[int, list[dict]] = {}
    for q in data["questions"]:
        by_page.setdefault(q["page"], []).append(q)

    flagged = sum(1 for q in data["questions"] if "review" in q)
    noted = sum(1 for q in data["questions"] if "note" in q)
    parts = [
        "<!doctype html>",
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        f"<title>Сверка — том {escape(volume)}</title>",
        "<style>", CSS, "</style>",
        f"<h1>{escape(data['title'])} — том {escape(volume)}</h1>",
        f"<div class='sub'>{len(data['questions'])} вопросов на {len(by_page)} слайдах · "
        f"{flagged} со спорным ключом · {noted} с правкой текста · "
        f"зелёным отмечен распознанный правильный ответ</div>",
    ]

    for page in sorted(by_page):
        img = next(
            (
                c
                for base in (MARKED, PAGES)
                for w in (1, 2, 3)
                if (c := base / f"{volume}-{page:0{w}d}.png").exists()
            ),
            None,
        )
        if img is None:
            print(f"!! no render for {volume} page {page}", file=sys.stderr)
            continue
        b64 = base64.b64encode(img.read_bytes()).decode()
        parts.append("<div class='slide'>")
        parts.append(f"<div class='pg'><img src='data:image/png;base64,{b64}' alt='slide {page}'></div>")
        parts.append("<div>")
        for q in by_page[page]:
            cls = "q flag" if "review" in q else "q"
            parts.append(f"<div class='{cls}'>")
            parts.append(f"<div class='qid'>{escape(q['id'])}<span class='tag'>{escape(q['category'])}</span></div>")
            parts.append(f"<div class='qt'>{escape(q['text'])}</div><ol>")
            for i, opt in enumerate(q["options"]):
                mark = " class='correct'" if i == q["correct"] else ""
                parts.append(f"<li{mark}>{escape(opt)}</li>")
            parts.append("</ol>")
            if "review" in q:
                parts.append(f"<div class='note'>⚠ Спорный ключ: {escape(q['review'])}</div>")
            if "note" in q:
                parts.append(f"<div class='editnote'>✎ {escape(q['note'])}</div>")
            parts.append("</div>")
        parts.append("</div></div>")

    OUT.write_text("\n".join(parts), encoding="utf-8")
    return OUT


if __name__ == "__main__":
    path = build(sys.argv[1] if len(sys.argv) > 1 else "IV")
    print(f"{path}  ({path.stat().st_size / 1024:.0f} KB)")
