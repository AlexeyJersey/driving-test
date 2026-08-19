# Source material

The four exam decks this project extracts questions from are **not committed**. They are the
driving school's material, so they stay on the maintainer's machine rather than in the
repository.

To run the pipeline, place them here with these exact names:

```
source/I str. ispitnih testova.pdf     17 slides   rules of the road
source/II str. ispitnih testova.pdf    40 slides   situational questions over photographs
source/III str. ispitnih testova.pdf   27 slides   signs, signals, police gestures
source/IV str. ispitnih testova.pdf     9 slides   vehicle systems and first aid
```

`tools/01_render.py` reads them and writes slide renders to `build/pages/`. Nothing else in the
project touches them: the web application consumes only `data/*.json`, so it builds and runs
without these files present.

What is committed instead is the extraction output — `data/questions-<VOLUME>.json` — which is
the project's actual source of truth.
