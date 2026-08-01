# LEGAL EAGLES II: MOTION TO WITHDRAW
### Design & technical plan — draft 1

> *"A motion to withdraw shall state the reasons therefor, unless the reasons are obvious."*

---

## 1. The premise

You are the attorney from *Rise to Partner*. You made partner. You survived the building. It is 2:47 a.m. and you are writing a resignation letter.

**The whole game forks on one keystroke.**

| | |
|---|---|
| **SEND** | *THE SOLO SHINGLE.* You resign. You have a bar card, a laptop, $4,100, and a folding table. Now go build a law firm out of a city that does not want one. |
| **DELETE** | *WAS THIS ALL A DREAM?* You close the draft, put your head down for a second — and wake up in a firm that has been empty for years. Your coffee is still warm. |

The opening montage is a single continuous cinematic (typewriter, LEAnim, the LE1 intro engine) that ends on a two-choice dialog with a cursor blinking in an empty To: field. There is no confirm prompt. Whichever key you hit is the game you get.

---

## 2. The structural idea that makes this affordable

Two full campaigns is 2× the content. **One city, two layers** is about 1.4×.

Author the city's geometry **once**. Dress it **twice**:

- **THE STREET** — Path A. Daylight, traffic, storefronts, clients, an economy, people who want things from you.
- **THE FLOOR** — Path B. The same streets and buildings, hollowed out. Night that never ends. Dust on the same desks. The vending machine you bought a cold brew from in Path A is still there, unplugged, and there is a hand-written note taped to it.

A `layer` supplies: palette, lighting mood, spawn table, NPC roster, interactable overlay, and per-tile substitutions (a bustling clerk's window becomes a shuttered one). Geometry, collision, and navigation are shared.

Three payoffs:
1. Half the level-design cost.
2. **Recognition is free horror.** Path B players who played Path A already know this building. That's the scariest thing you can hand them.
3. **The crossover is a mechanic, not a cutscene.** Mid-game the layers start to bleed — Path A finds doors that shouldn't exist; Path B finds a window with a living city behind it. Late game you can move between them. Both paths converge on the same final matter.

---

## 3. Path A — THE SOLO SHINGLE

**Suite 2B, above the Golden Wok. Fourth & Marisol. Rent is due on the 1st.**

### Core loop
**Explore → find work → work the case → get paid → survive the month → grow.**

Cases are not handed to you by a quest-giver. You find them: someone crying on the courthouse steps, a flyer on a laundromat corkboard, a wrong-number voicemail, a guy who says his cousin said you were cheap. **Exploration is client acquisition** — that's the answer to "must explore to gain clients."

### The Docket (the game's clock and its pressure)
A day/date system with a calendar. Cases carry **deadlines**. Rent, malpractice premiums, and the bar dues carry due dates. Sleeping advances the day. Miss a filing deadline and the case is dismissed with prejudice — permanently, no reload-scumming, and the client tells people.

This is the survival layer the pitch asks for, and it's what stops an open world from turning into aimless wandering.

### Money is a real resource
- **Retainer vs. contingency** on intake — cash now vs. a big payout you might not survive to collect.
- **Trust account** — client money is not your money. Commingling is a one-keystroke shortcut out of a rent crisis and a slow road to a **Bar Complaint** (which spawns as an actual enemy that follows you between districts).
- Overhead: rent, the copier lease, the answering service, the paralegal's paycheck.

### Growth
- **Reputation, per district** — replaces a single XP bar. The Flats trusting you and the Tower District trusting you are different currencies and mildly incompatible.
- **The practice** — hire staff, upgrade the office, unlock practice areas beyond your LE1 pick. Everybody you hire walks with you, holds station off your shoulder and throws paper at anything that gets near you, for the hire fee divided by 60 — so the price list is the power curve; they keep their paperwork effect on top (receptionist = intake throughput, an associate = a second case in flight).
- **Arrivals** — the opposition is not a fixed roster to be cleared. It arrives off-screen on a timer that opens up as you get further in (matters closed, the bleed, days on the street or hours billed), out of a pool that widens with it.
- **Referral network** — every satisfied client is a node; the graph is the real progression system.

### Opposition
Process Server (fast, tags you — being *served* is a stacking debuff), Collections Agent, **Ambulance Chaser** (rival solo who will steal a client mid-fight if you let them), Notice of Deposition, The Landlord, **Bar Complaint** (a floating drone that files on you and cannot be killed, only answered), and DC&H **Retrieval Associates** — because you left with the client list in your head and the firm knows it.

### Finale
**In re Withdrawal.** Dewey, Cheatham & Howe sues you: non-compete, client poaching, breach of the partnership agreement. The last act is a trial. The final boss is the **Non-Compete** itself — a contract-golem, cousin to LE1's Founding Agreement — with Hargrove standing behind it looking apologetic.

Endings: **WIN** · **SETTLE** · **COUNTERSUE** (needs evidence gathered across the whole game) · **GO BACK** (they offer you your office).

---

## 4. Path B — WAS THIS ALL A DREAM?

**You wake at a desk. The nameplate is yours. The dust is not.**

### Core loop
**Explore → learn a fact → the fact opens a door.** No shops. No economy. Fewer, harder enemies. Survival-horror pacing.

### The lights only work where the building is still billing
The core resource is **Hours**. Floors are dark and hostile until you open and work a **matter** — the building will keep the lights on for anyone doing work. It always will. That's the trap and it's the theme.

### The mystery
- The calendar on every wall reads the same date.
- Every desk drawer in the building holds a resignation letter. Unsent. Different handwriting. There are four hundred of them.
- One of them is in your handwriting and it is dated **tomorrow**.
- The reveal: deleting the letter was **accepted as consideration**. Clause 9 (LE1) wasn't about retirement. You are the firm's continuing performance.

### Opposition
**The Unbilled** (your own hours, itemized), **Past Selves** — Junior Associate You, Of Counsel You, Partner You, each fighting with the exact practice-area attack you chose in LE1 — **The Ones Who Stayed**, and the **Night Clerk**, who is very polite.

### Endings
**WAKE** (it was the three seconds before you went back to work — the bleakest one) · **FILE** (you find the one letter that will still send; it isn't yours) · **DISSOLVE** (the honest fight — mirrors LE1's RENEGOTIATE).

---

## 5. Convergence

Both paths end at **In re Yourself**: a courtroom where you are simultaneously counsel and party, arguing against the version of you that hit the other key. Which of you is real depends on what you did with the trust account, the letters, and the four hundred people who didn't leave.

---

## 6. Technical plan

### Verdict: stay web, stay vanilla, stay zero-dependency
Canvas 2D, procedural sprites, Web Audio chiptune, no assets, GitHub Pages. LE1 proved the whole stack and the aesthetic *is* the game. No engine, no framework, no asset pipeline.

**Two deliberate changes from LE1:**

**a) ES modules with a real dependency graph.** LE1's ordered `<script src>` files sharing mutable globals was the right call *for a refactor of working code*. For 3–4× the content it will not hold. ES modules + an import map, still no build step for development.
> Cost: `file://` double-click stops working (modules need a server). Mitigation: a ~30-line concat script that emits a single-file `dist/index.html` for double-click and itch.io. Both properties preserved.

**b) `engine/` and `game/` split.**
- `engine/` — render core, sprites, LEAnim, audio, input (keyboard/mouse/touch/gamepad — LE1's is genuinely good, port it whole), entities, particles, camera, dialogue, save, UI panels.
- `game/` — districts, cases, story, items, enemies, layers. Content, not code.

### The four systems LE1 doesn't have that open-world needs

**1. Streaming regions with persistent deltas.**
LE1 builds every map at startup and `setWorld` swaps globals. That won't scale. Need: `Region` records with lazy `build()`, an entity registry keyed by region, **delta persistence** (this enemy is dead, this door is open, this pickup is gone) so the world remembers, and seamless edge transitions between adjacent districts instead of stair-warps. Fast-travel graph on top.

**2. A facts/knowledge model — the single most important new system.**
Investigation games run on *what you know*, not what you're holding. A global `facts` set; dialogue lines, choices, and doors gate on facts the way LE1 gated on `[AMBITION 3]`. This is what makes both paths work: Path A wins cases with facts, Path B opens the building with them.

**3. Quest engine v2.**
LE1's `QLINE` graph engine was the right bet — extend it, don't replace it. New stage types: `investigate` (evidence nodes in the world), `interview` (dialogue that yields facts), `deliver`, `deadline` (fails on the clock), `choice`. Every case in LE2 is authored as data.

**4. A map format and a dev-only editor.**
LE1's maps are hand-coded `hline()`/`rectF()` calls. At LE2's scale that's the bottleneck. Move to **compact ASCII tilemaps** (rows of characters in a data file) plus a browser-based editor behind `?edit=1` that paints tiles and exports the ASCII. A weekend of work that pays for itself by the second district.

### Also
- **Save v3** from day one: versioned envelope, explicit migrations, region deltas + facts + docket + economy.
- **LE1 save import.** Read `legalEagles.save.v1`; your rank, ending, perks, and practice area seed LE2 — Past Selves in Path B fight with *your* attack. If no save exists, a short "tell us about your career" character-creation covers it.
- **Mobile and gamepad from the start**, not bolted on. LE1 learned this the expensive way; port the input layer before writing the first district.

---

## 7. Districts (city scaffold)

| District | Path A | Path B |
|---|---|---|
| **Courthouse Square** | Clerk's window, the steps, bail bonds row — the fishing ground | Department 13 is still in session. It has been since 1959. |
| **The Strand** | Small business: landlord/tenant, contracts, your own landlord | Every storefront is a different year |
| **Motor Row** | PI work, tow yards, the chiropractor who refers | The cars are running. Nobody's in them. |
| **The Tower District** | DC&H and Grabbit & Runn. Hostile. Late game. | Where you woke up |
| **Riverside / The Flats** | Pro bono, eviction defense, the community center — the ethics engine | The only place with daylight |
| **The Annex** *(LE1 callback)* | Sublevels, records, lore | Sublevel C is open |

---

## 8. Build order

| Phase | Deliverable | Why first |
|---|---|---|
| **0 — Spike** | Engine extraction, streaming-region proof, ASCII map format + editor, **the opening montage and the SEND/DELETE fork** | Proves the tech and gets the game's best moment playable immediately |
| **1 — Vertical slice** | Courthouse Square in both layers; one complete case on each path, intake → investigation → resolution | Every system exercised end-to-end before content scales |
| **2 — Systems** | Docket/clock, economy + trust account, reputation, facts model, staff/allies, office upgrades | The survival loop |
| **3 — Content** | 5–6 districts, ~12 cases per path, full enemy roster, bosses | The bulk |
| **4 — Crossover** | Layer bleed, cross-layer traversal, *In re Yourself* finale, all endings | The payoff |
| **5 — Polish** | Audio, LEAnim cinematics, mobile/gamepad parity, NG+, run summary | Ship |

---

## 9. Decisions (settled 2026-07-27)

1. **Repo** — **new repo, `legal-eagles-2`**, with its own GitHub Pages deploy. Ember/LE1 stays untouched and live. Engine code is ported by copy, not shared.
2. **World shape** — **seamless contiguous city.** No loading breaks between districts; regions stream at their edges. This makes streaming + delta persistence a Phase 0 must-have, not a later optimization, and it's what sells the layer-bleed crossover.
3. **Path parity** — **both paths are full-length campaigns**, converging at *In re Yourself*. The one-city-two-layers structure is what makes this affordable; protect it — any content authored for only one layer should be a deliberate, noted exception.
4. **`file://` playability** — **keep it.** Develop against ES modules over a local server; ship a ~30-line concat script emitting a single-file `dist/index.html` for double-click and itch.io. Write the script in Phase 0 so it never rots.

### Immediate next step — Phase 0

1. Scaffold `legal-eagles-2` (repo, Pages, `.claude/launch.json`, `engine/` + `game/` skeleton).
2. Port LE1's input layer whole (keyboard/mouse/touch/gamepad) — it's the most proven, least-fun-to-rewrite code in the project.
3. Build the ASCII tilemap format + `?edit=1` editor **before** any district is authored.
4. Streaming-region spike: two adjacent regions, seamless edge crossing, deltas persisting both ways.
5. The opening montage + the SEND/DELETE fork, playable end to end.
6. The concat script.
