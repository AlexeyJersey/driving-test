# Feature Specification: Offline Driving-Ticket Trainer

**Feature Branch**: `001-offline-ticket-trainer`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "Simple, convenient trainer for the question bank of a Montenegrin
driving school, extracted from the school's PDF slide decks. Learning mode with immediate
feedback, a mistakes drill, progress statistics, and bookmarks. Exam mode is deferred but its
seam must be preserved. Runs as an offline web app installable to a phone home screen."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Practise questions with immediate feedback (Priority: P1)

A learner opens the app, picks a topic (or everything), and works through questions one at a
time. For each question they see the Montenegrin question text and its answer options, choose
one, and immediately learn whether they were right. If they were wrong, the correct option is
shown alongside their choice so the difference registers before they move on. They advance to
the next question and can stop at any point.

**Why this priority**: This is the entire product in one slice. Without it there is nothing to
use; with it alone the app already replaces flipping through a PDF, because it hides the answer
until the learner has committed to a choice — which the source slides cannot do, since their
answer marks are always visible.

**Independent Test**: Load the app with a single volume of questions present, answer several
questions correctly and incorrectly, and confirm the feedback is immediate and correct against
the source slide. Delivers standalone value with no other story implemented.

**Acceptance Scenarios**:

1. **Given** a question is displayed, **When** the learner has not yet answered, **Then** no
   option is visually marked as correct and no answer is revealed.
2. **Given** a question is displayed, **When** the learner selects the correct option, **Then**
   the app confirms it as correct and offers to continue to the next question.
3. **Given** a question is displayed, **When** the learner selects a wrong option, **Then** the
   app marks their choice as wrong AND marks which option was correct.
4. **Given** a question has been answered, **When** the learner continues, **Then** the next
   unanswered question in the selected set is shown.
5. **Given** the learner reaches the end of the selected set, **When** no questions remain,
   **Then** the app reports the set as finished with a summary of right and wrong answers.
6. **Given** a question carries a flagged, unverified answer key, **When** it is displayed,
   **Then** the app visibly warns that this answer is disputed.

---

### User Story 2 - Drill the questions I got wrong (Priority: P2)

Every question the learner answers incorrectly is remembered. The learner can start a session
made up only of their past mistakes, and a question leaves that set once they have answered it
correctly enough times to count as learned. The mistakes set shrinks as they improve, so the
remaining items are exactly what still needs work.

**Why this priority**: Re-reading everything is the slowest way to prepare. Concentrating on
personal weak spots is the single highest-value study behaviour, and it is the reason to have
an app rather than a PDF at all.

**Independent Test**: Answer several questions wrong, open the mistakes drill, confirm exactly
those questions appear, answer one correctly the required number of times, and confirm it
leaves the set while the others remain.

**Acceptance Scenarios**:

1. **Given** the learner answers a question incorrectly, **When** they open the mistakes drill,
   **Then** that question is in the set.
2. **Given** a question is in the mistakes set, **When** the learner answers it correctly the
   required number of consecutive times, **Then** it is removed from the set.
3. **Given** a question is in the mistakes set, **When** the learner answers it incorrectly
   again, **Then** its progress toward removal resets.
4. **Given** the learner has no recorded mistakes, **When** they open the mistakes drill,
   **Then** the app states there is nothing to drill rather than showing an empty screen.

---

### User Story 3 - Study without a network and from the home screen (Priority: P3)

The learner installs the app to their phone's home screen and uses it on the road, in a
basement classroom, or on a plane. It opens and works identically with no connection, including
all questions, all progress, and all statistics.

**Why this priority**: Studying happens in dead time and dead zones. An app that needs a
connection to show a question the learner already downloaded is a worse PDF. It ranks below the
two study behaviours only because those must exist before offline access means anything.

**Independent Test**: Load the app once, disable networking entirely, restart the browser or
launch from the home-screen icon, and confirm every question, answer, and stored progress is
available and correct.

**Acceptance Scenarios**:

1. **Given** the app has been opened once, **When** the device has no connectivity, **Then**
   the app launches and every question remains available.
2. **Given** the app is open, **When** the learner installs it to the home screen, **Then**
   launching from that icon opens the app without browser chrome getting in the way.
3. **Given** the learner answered questions while offline, **When** they reopen the app later,
   **Then** those answers are still recorded.

---

### User Story 4 - See how ready I am (Priority: P4)

The learner sees how much of the bank they have covered, how accurate they are, and which
topics they are weakest in, so they can decide what to study next and judge whether they are
ready to sit the real exam.

**Why this priority**: Motivating and directive, but the learner can still study effectively
without it. It depends on answer history that only accrues once the earlier stories exist.

**Independent Test**: Answer a known mix of questions right and wrong across two topics, then
confirm the reported coverage, accuracy, and per-topic breakdown match that mix exactly.

**Acceptance Scenarios**:

1. **Given** the learner has answered some questions, **When** they open statistics, **Then**
   they see how many distinct questions they have attempted out of the total available.
2. **Given** the learner has answered questions across several topics, **When** they open
   statistics, **Then** accuracy is broken down per topic.
3. **Given** the learner has never answered anything, **When** they open statistics, **Then**
   the app shows an explanatory empty state rather than zeroes without context.

---

### User Story 5 - Bookmark questions to come back to (Priority: P5)

The learner marks any question worth revisiting — a rule they keep forgetting, a wording they
find confusing — and can later study only their bookmarked questions.

**Why this priority**: Genuinely useful for a small number of stubborn items, but it duplicates
much of the value the mistakes drill already provides automatically.

**Independent Test**: Bookmark two questions from different topics, open the bookmarks set, and
confirm exactly those two appear and that removing a bookmark takes it out of the set.

**Acceptance Scenarios**:

1. **Given** any question is displayed, **When** the learner bookmarks it, **Then** it appears
   in the bookmarks set.
2. **Given** a bookmarked question, **When** the learner removes the bookmark, **Then** it
   leaves the set without affecting answer history or mistake state.
3. **Given** bookmarks exist, **When** the learner starts a bookmarks session, **Then** only
   bookmarked questions are asked.

---

### Edge Cases

- **Only part of the question bank is available.** Only one of the four source volumes has been
  transcribed so far. The app must present whatever volumes exist, report totals based on them,
  and require no code change when a volume is added.
- **A question's answer key is disputed.** Some extracted keys contradict the expected answer
  and are flagged as unverified. The app must not hide this from the learner, because silently
  teaching a wrong rule is the worst possible failure.
- **Device storage is unavailable or cleared.** In private browsing, or after the learner
  clears site data, the app must still run and let them study; it must say that progress cannot
  be saved rather than failing or silently losing data.
- **Stored progress was written by an older version.** If the shape of stored data changes, the
  app must either migrate it or reset it cleanly, never present corrupted statistics.
- **A selected set is empty.** Choosing a topic with no questions, or a drill with nothing due,
  must produce an explanatory state, not a blank screen or an error.
- **The learner leaves mid-session.** Closing the app part-way through a set must not lose the
  answers already given, nor the learner's place in the set.
- **Stored progress refers to a question that no longer exists.** A later data revision may drop
  or renumber a question the learner has already answered. Statistics must quietly ignore such
  orphaned records rather than counting them, which would push coverage above 100%.
- **The same question is answered many times.** Statistics must distinguish "questions
  attempted" from "answers given" so repeated drilling does not inflate coverage.

## Requirements *(mandatory)*

### Functional Requirements

**Question delivery**

- **FR-001**: System MUST present each question with its full Montenegrin text and all of its
  answer options, exactly as recorded in the question data, without paraphrase or translation.
- **FR-002**: System MUST NOT reveal which option is correct until the learner has submitted an
  answer for that question.
- **FR-003**: System MUST, on submission, indicate both whether the learner's choice was correct
  and which option is correct.
- **FR-004**: System MUST display a visible warning on any question whose answer key is marked
  as disputed or unverified, and MUST NOT warn on questions that merely carry an editorial note
  about the source text, because a warning that appears where nothing is in doubt teaches the
  learner to ignore warnings.
- **FR-005**: System MUST allow the learner to study a subset of questions selected by topic,
  and to study the whole available bank.
- **FR-006**: System MUST derive the available question set from the bundled question data at
  build time, and MUST behave correctly when only some volumes are present.
- **FR-007**: System MUST support questions that carry an accompanying illustration, displaying
  the image with the question, for volumes where questions reference a picture.

**Progress and drilling**

- **FR-008**: System MUST record, per question, the learner's answer history sufficient to
  determine whether they have answered it, how often, and how often correctly.
- **FR-009**: System MUST add a question to the mistakes set when it is answered incorrectly.
- **FR-010**: System MUST remove a question from the mistakes set once it has been answered
  correctly the configured number of consecutive times.
- **FR-011**: System MUST reset a question's progress toward removal when it is answered
  incorrectly again.
- **FR-012**: Users MUST be able to start a study session restricted to the mistakes set.
- **FR-013**: Users MUST be able to bookmark and unbookmark any question, and to start a study
  session restricted to bookmarked questions.
- **FR-014**: System MUST report coverage (distinct questions attempted against total
  available), overall accuracy, and accuracy broken down by topic.
- **FR-015**: System MUST distinguish distinct questions attempted from total answers submitted
  in all reported statistics.
- **FR-016**: Users MUST be able to reset their stored progress deliberately, and the app MUST
  confirm before doing so.

**Persistence and availability**

- **FR-017**: System MUST persist all learner state on the device and restore it on next launch.
- **FR-018**: System MUST function fully with no network connection after first load, including
  all questions, illustrations, and stored state.
- **FR-019**: System MUST be installable to a phone home screen and launch from it.
- **FR-020**: System MUST continue to function, in a clearly degraded and clearly communicated
  way, when device storage is unavailable.
- **FR-021**: System MUST handle stored state written by an earlier version by migrating or
  resetting it, and MUST never present statistics derived from unreadable state.
- **FR-022**: System MUST NOT transmit any learner data off the device, and MUST NOT include
  analytics, tracking, or advertising.

**Boundaries**

- **FR-023**: System MUST NOT implement a timed or scored exam session in this release, while
  keeping question selection, session state, and scoring modelled so one can be added without
  restructuring stored data.
- **FR-024**: System MUST NOT implement accounts, authentication, or remote content management
  in this release, while reaching all persistence and all question content through single
  abstraction points that a future remote implementation can replace.
- **FR-025**: System MUST NOT implement translation of question content in this release, while
  keeping question data free of any embedded translated text.
- **FR-026**: System MUST NOT provide any in-app authoring, editing, or deletion of question
  content in this release. The application is a read-only consumer of the question data.
- **FR-027**: Correcting a question MUST require only editing the question data outside the
  application and rebuilding; no application code change may be needed to change a question's
  text, options, correct answer, or dispute flag.
- **FR-028**: Question data MUST be validated before a build consumes it, so that a hand-edited
  correction with a malformed shape fails loudly rather than shipping.
- **FR-029**: All question content MUST be reached through a single content-access boundary, so
  that a future administrator-facing implementation can add editing behind that same boundary
  without changing any screen or study flow that consumes questions.
- **FR-030**: Every question MUST carry a stable identifier and its source provenance (volume
  and slide), so that an edit made later — in the data files now, through an administrator
  interface eventually — can be attributed to a specific question and traced back to the slide
  it came from. A published identifier MUST always denote the same question, including across
  re-extraction of its volume.

**Session continuity and data hygiene**

- **FR-031**: System MUST persist an in-progress study session — its question set, position, and
  running tally — and offer to resume it on next launch, because a mobile browser may discard
  the page at any moment and losing your place thirty questions into a set is indistinguishable
  from losing the work.
- **FR-032**: System MUST derive statistics only from questions present in the current question
  bank, ignoring stored progress for questions the data no longer contains, so that coverage can
  never exceed the number of questions available.

### Key Entities

- **Question**: One exam question. Carries a stable identifier, the volume and slide it came
  from, its topic, its text, its ordered answer options, the index of the correct option, an
  optional illustration reference, and an optional dispute note when its key is unverified.
- **Volume**: One source deck of questions, identified by its numeral. Determines which
  questions exist; volumes appear as they are transcribed.
- **Topic**: The subject grouping a question belongs to, used for filtering and for per-topic
  accuracy.
- **Answer Record**: One submitted answer to one question — which option was chosen and whether
  it was correct — forming the history that all progress derives from.
- **Question Progress**: Per-question derived state: whether it has been attempted, its running
  streak of consecutive correct answers, and whether it currently counts as a mistake.
- **Bookmark**: A learner's mark on a question, independent of any answer history.
- **Study Session**: A run through a selected set of questions, holding which questions are in
  the set, the position within it, and the tally of right and wrong answers so far.
- **Learner State**: The whole persisted body of the above, versioned so it can be migrated or
  reset, and shaped so that it could later belong to an identified user.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A learner can go from opening the app to answering their first question in no
  more than two interactions.
- **SC-002**: With networking fully disabled after a first load, 100% of questions,
  illustrations, and previously stored progress remain available.
- **SC-003**: 100% of questions present in the transcribed data are reachable through the app,
  and every displayed correct answer matches the answer recorded for that question.
- **SC-004**: Feedback on a submitted answer renders within one frame of the tap on a mid-range
  phone — there is no spinner, no async gap, no perceptible wait.
- **SC-005**: After closing and reopening the app, 100% of previously recorded answers,
  mistakes, and bookmarks are still present.
- **SC-006**: A question answered incorrectly appears in the mistakes drill, and leaves it only
  after the required number of consecutive correct answers — verifiable end to end.
- **SC-007**: The app is fully usable on a 360 px-wide phone screen with no horizontal
  scrolling and no truncated question text.
- **SC-008**: Adding a newly transcribed volume to the question data makes its questions
  available with no change to application code.
- **SC-009**: After first load, the app makes no outbound requests for question content or
  learner data, observable by monitoring the device's network activity during a full session.
- **SC-010**: Correcting a wrong answer key takes one edit to one data file plus a rebuild, and
  the corrected answer is what the app then teaches.

## Assumptions

- **Question data is the input, not part of this feature.** Extraction from the source PDFs is
  a separate pipeline that already exists; this feature consumes its output. At the time of
  writing, one volume of four (45 questions) is transcribed.
- **Administrator editing is a known future direction, deliberately not built now.** The
  eventual shape is an administrator who edits the question bank through an interface. This
  release keeps the seam — one content-access boundary and stable, traceable question identity
  — but adds no write path, no stub, and no hidden screen, per Constitution v1.2.0 Development
  Workflow.
- **Question content is maintained outside the application, by hand.** Both updates (a newly
  transcribed volume) and corrections (a wrong answer key) are made by editing the JSON files
  in the data directory and rebuilding. There is deliberately no editing interface: the
  maintainer and the learner are the same person, they already work in an editor, and an
  in-app editor would create a second copy of the truth that has to be reconciled. Errors are
  spotted either while studying — which is why disputed keys are surfaced in the app — or on
  the pipeline's review page, and then fixed in the data.
- **Editorial notes and disputed keys are different things.** A question may carry a note that
  the source text had a typo, which is informational, or a flag that its answer key is doubted,
  which is a warning to the learner. Only the latter is surfaced as a warning.
- **Mastery threshold defaults to two consecutive correct answers** for removing a question
  from the mistakes set. This was not specified; two is chosen as enough to distinguish
  knowledge from a lucky guess among three options without being tedious.
- **Question order within a set defaults to source order**, with shuffling offered as a choice,
  because source order aids first-pass learning while shuffling prevents position memorisation.
- **One learner per device.** No profile switching, since accounts are out of scope.
- **The real exam's format is unknown** — number of questions, time limit, and pass mark have
  not been confirmed with the driving school. This is why exam mode is deferred rather than
  guessed at.
- **Target device is a modern mobile browser** on a phone; desktop use is supported but not
  optimised for.
- **All content is Montenegrin**, matching the real exam. Interface text may later be
  translated, and question content may later gain a separate lookup layer, but neither is in
  this release.
- **Illustrations exist for two of the four volumes** (situational photographs and sign
  diagrams) and will need to be extracted alongside their questions when those volumes are
  transcribed.
