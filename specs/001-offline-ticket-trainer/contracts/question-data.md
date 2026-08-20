# Contract: Question Data File

The interface between the extraction pipeline and the application. The pipeline writes it, the
build-time validator enforces it, the application only reads it.

## Location and naming

`data/questions-<VOLUME>.json`, one file per source deck, e.g. `data/questions-IV.json`.
Discovery is by glob: whatever files match are the bank (FR-006). Adding a volume is adding a
file (SC-008).

Illustrations for a volume live at `data/images/<VOLUME>/<filename>`, and a question's `image`
field holds the bare filename, not a path. The volume directory comes from the question's own
volume, so an image cannot be shared across volumes — which is intentional: the same sign
photographed for two decks is two files, and deduplicating them would couple the volumes'
regeneration to each other.

## Shape

```json
{
  "volume": "IV",
  "source": "IV str. ispitnih testova.pdf",
  "title": "Poznavanje vozila i pružanje prve pomoći",
  "questions": [
    {
      "id": "IV-1-1",
      "page": 1,
      "category": "vehicle",
      "text": "Radno kočenje ne mora da ima:",
      "options": ["poluprikolica sa tri osovine", "putničko vozilo do 750 kg sopstvene mase", "laka prikolica"],
      "correct": 2
    },
    {
      "id": "IV-7-2",
      "page": 7,
      "category": "vehicle",
      "text": "Svjetlosni snop oborenog svijetla treba da bude:",
      "options": ["izveden kao lijevi asimetrični", "simetričan", "izveden kao desni asimetrični"],
      "correct": 2,
      "image": null,
      "review": "Крестик на слайде красный — похоже на исправление преподавателя."
    },
    {
      "id": "IV-1-5",
      "page": 1,
      "category": "firstaid",
      "text": "Pod opekotinom podrazumijevamo povredu nastalu od:",
      "options": ["upale kože", "djelovanja toplote", "uboda čvrstog predmeta"],
      "correct": 1,
      "note": "На слайде напечатано «črvstog» — исправлено на «čvrstog». Ключ ответа не оспаривается."
    }
  ]
}
```

`volume` on the file is authoritative; a question inherits it and does not repeat it.

## Question kinds

Volume IV was entirely multiple choice, so the first version of this contract assumed that was
all there was. Volume II proved otherwise on its fifth slide.

- **`choice`** (default, and what `kind` means when absent): a question with `options` and a
  `correct` index. Everything in volume IV.
- **`order`**: "in the situation shown, the order of passing is ___". The source has no options
  at all — the answer is a sequence of the vehicle numbers marked on the photograph, written
  into boxes. Represented as `answer`, a string of digits such as `"1 3 2"`, with no `options`
  and no `correct`.

An `order` question is not a `choice` question with the options left out, and it must not be
turned into one by inventing plausible distractors: the source contains no distractors, and
fabricating them would put words in the examiner's mouth.

## Rules the validator enforces

Failure aborts the build and names the offending question id. Nothing partially valid is ever
generated.

| Rule | Why it exists |
|------|---------------|
| `kind`, when present, is `choice` or `order`; absent means `choice` | Keeps volume IV's files valid unchanged |
| A `choice` question has `options` and a valid `correct`, and no `answer` | |
| An `order` question has a non-empty `answer` of digits separated by single spaces, and neither `options` nor `correct` | A sequence answer has no index to point at |
| `id` unique across **all** files, not just within one | Learner progress is keyed by id; a collision silently merges two questions' histories |
| `correct` is an integer in `[0, options.length)` | The single most damaging possible defect (Principle I) |
| `options` has at least two entries, none empty | A question with one option teaches nothing |
| `text` non-empty | |
| `page` present and a positive integer | Provenance is mandatory — verification depends on being able to find the slide |
| `review`, if present, is a non-empty string | An empty flag would raise a warning that explains nothing |
| `note`, if present, is a non-empty string | |
| `image`, if present, resolves to `data/images/<VOLUME>/<image>` | A missing illustration makes a picture question unanswerable |

Free text in `review` and `note` is written in the maintainer's language, not the content
language: these are working remarks, not exam material. The interface pairs them with a label
from its own string table, so the warning itself is translatable even when the remark is not.

## Editing by hand

This is the supported way to correct a question in this release (FR-027): edit the JSON, rebuild,
done. No application code changes for any change of text, options, answer, or flag.

Three obligations come with that.

Changing `correct` requires visual confirmation against the rendered source slide (Principle I)
— the render is at `build/pages/<VOLUME>-<page>.png`, and the review page shows it side by side
with the parsed question. Resolving a disputed key means removing the `review` field, which is
what stops the warning from showing.

Correcting a typo in `text` or an option goes in `note`, never in `review`. `review` means "this
answer may be wrong" and raises a warning to the learner; a note about source spelling must not.

Never change an `id`. Ids are the join key to learner progress; renaming one discards that
question's history for every existing learner.

## Regeneration and identifier stability

Ids are positional, so re-extracting a volume is the one operation that can corrupt learner
history while producing a perfectly valid file. If a re-run finds one more question on slide 4
than the previous run did, every later index on that slide shifts, and each shifted id now
denotes a different question. Uniqueness holds, ranges hold, the build passes.

The pipeline therefore MUST diff its output against the current `data/` before writing, and MUST
refuse to write when an existing id would come to denote different content. New questions get
new ids — a suffixed index where a slot is genuinely new — rather than displacing their
neighbours. Retired ids are never reused.

This obligation is the pipeline's, not the application validator's: the app only ever sees one
revision of the data, so it cannot tell that an id changed meaning.
