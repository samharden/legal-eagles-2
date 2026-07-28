# LEGAL EAGLES II: MOTION TO WITHDRAW

> *"A motion to withdraw shall state the reasons therefor, unless the reasons are obvious."*

Sequel to [LEGAL EAGLES: Rise to Partner](https://github.com/samharden/legal-eagles-rpg). You made partner. You survived the building. It is 2:47 a.m. and you are writing a resignation letter.

The whole game forks on one keystroke:

| | |
|---|---|
| **SEND** | *THE SOLO SHINGLE* — you resign. Build a law firm out of a city that does not want one. |
| **DELETE** | *WAS THIS ALL A DREAM?* — you close the draft, put your head down, and wake in a firm that has been empty for years. |

Design doc: [DESIGN.md](DESIGN.md).

---

## Status: Phase 3 (content) — in progress. Both paths now have a resource loop.

**Phase 0** built the engine: the opening reel and the **SEND / DELETE** fork; a **seamless two-region city** (Courthouse Square gx 0–39, The Strand gx 40–75) on one global tile grid, crossed on foot with no loading break; **region streaming with persistent deltas**; **two layers over one geometry**; movement, dash, melee, pickups; one input layer over keyboard/mouse/touch/gamepad; ASCII tilemaps and the `?edit=1` editor; and a bundler emitting a self-contained `dist/index.html`.

**Phase 1** added the four systems a case needs, and one case per path:

- **Facts** (`engine/facts.js`) — what you *know*, as distinct from what you carry. Dialogue choices, quest stages and doors all gate on facts. This is the spine of the investigation loop and the thing LE1 had no model for.
- **Quest engine v2** (`engine/quests.js`) — LE1's graph plus a `learn` stage (completes on facts, not counters), a `resolve` stage (parks until the player decides, and records which branch), and per-stage hints that *are* the HUD objective.
- **Dialogue** (`engine/dialogue.js`) — DOM on every platform, trees as data, choices gated on `if` predicates with bracketed `[TAG]` unlocks. A gate you can't yet pass renders disabled rather than hidden.
- **The Casefile** (`game/casefile.js`, key `C`) — every open matter, what to do next, everything established, and how many holes are left. It shows the count of what you don't know without showing what it is.

The two cases:

| Path | Matter | Shape |
|---|---|---|
| THE STREET | **Ruiz v. Golden Wok** | Your first client wants to sue your landlord. Intake → three evidence sources → report → four resolutions, one of which only opens if you established the conflict. |
| THE FLOOR | **In re: The Unsent** | Whose resignation letter is this, and what does filing one actually take. Three facts → the Night Clerk → file, keep, or burn. |

**Phase 2** added the survival layer — and one scoping decision that shapes the rest of the game:

> **The Docket, rent and the economy are Path A only.** DESIGN.md §4 says THE FLOOR's calendar reads the same date forever. So it does: `endDay()` refuses on that layer, the Casefile drops to a single tab, and the HUD shows no money. The two paths now have genuinely different verbs rather than the same verbs with different scenery.

- **The Docket** (`engine/clock.js`) — a day counter and the things that come due on it. Matters can carry a `due`; miss it and the case is **dismissed with prejudice**, permanently. That is LE2's first real failure state.
- **The books** (`engine/practice.js`) — two accounts, and the distinction between them is the whole point. A retainer is the *client's* money and sits in **trust** until you earn it. On rent day, with the operating account short, the game offers you the trust account. It always works. It is never free — it opens a grievance that follows you between districts until the trust is whole again.
- **Rent, arrears and eviction** — $1,100 weekly. Miss twice and the lock changes. Evicted you can still end the day (blocking it would soft-lock the game); you just sleep in the firm car and wake at 55% energy.
- **Reputation** per district, moved by how you close matters — and by how you lose them.
- **Collapse instead of death.** Energy zero is not a game-over screen. You lose the rest of the day, which is worse, because the docket does not care why you were unconscious.
- **The Casefile gained tabs** — MATTERS · DOCKET · ACCOUNTS, including a real double-entry ledger.
- **The practice** — three hires and three office upgrades, bought at Suite 2B. The hire fee is not the mechanic; **payroll** is. A person is a standing weekly obligation scheduled from the day you take them on, so it lands off the rent's rhythm and the week has two squeezes in it instead of one. Miss one and *everybody* goes — a firm that cannot make payroll does not get to keep half its people.

  | | Costs | Does |
  |---|---|---|
  | **Perla Ocampo**, receptionist | $500 + $280/wk | A lapsed deadline gets one day of grace. Once per matter — the grace is a person, not a rule |
  | **Renata Vosloo**, paralegal | $900 + $420/wk | Walks with you and swings at whatever has closed on you |
  | **Desmond Achebe**, associate | $1,600 + $900/wk | Establishes one fact overnight on an open matter. Never resolves anything — deciding is still the job |

  Office upgrades: a bed (+12 energy), a second chair (you cannot hire anybody until there is somewhere to put them), and your name on the door in vinyl (+2 standing everywhere, once).

**Phase 3a** closed the one place the two paths weren't at parity: THE FLOOR now has its own resource, and it is the structural inverse of THE STREET's.

> On the street the pressure comes from outside — rent is imposed, the docket is imposed, and paying is how you keep working. On the floor nothing is imposed. **The building offers.**

- **The Hours** (`engine/hours.js`) — two numbers. **Banked** is what you can spend and moves both ways. **Billed** is what you have put into this building ever, and only goes up. Everything is stored in tenths of an hour as integers, because a firm bills in six-minute increments and floats accumulate lies.
- **The dark.** Every floor district but the one you wake in renders near-black beyond a radius, with a hard seam at the district line, and drains energy for as long as you stand in it. You can *cross* a dark district cheaply. You cannot *work* in one.
- **The lighting panel.** The layer's only transaction: a breaker box with a time-entry form taped over the switches. It costs banked hours, it is permanent, and the cost has to be read in the building's own language every single time. There is a line for a matter number. Nobody has ever asked about the matter number.
- **Work is what pays.** Establishing a fact, reading a file, closing a matter — and putting down one of **The Unbilled**, which are your own hours itemized and are carrying time you can take back. That is the only reason to fight anything on this layer.
- **The trap, made mechanical.** Every ten hours billed, the building notices, and The Unbilled get faster and hit harder *everywhere*. Lighting a floor buys safety on that floor and pays for it in every other one. You cannot buy your way out; you can only buy your way further in.
- **Collapse costs hours, not a day.** There is no day here to lose, so the building charges you for the time you were out. The entry is already written when you come round.
- The Casefile's third tab on this layer is **THE HOURS** — the two columns, which floors are lit and what the dark ones cost, and the timesheet.

**Phase 3b** laid out the whole city at once and built the first new district on it.

The six districts are allocated on the global tile grid **up front**, before any of them have content, because a region's origin is baked into every save's deltas and into `SPAWN` — moving a district after it has content is the expensive mistake. Every band is 30 tiles tall so they stack flush:

|  | `gx 0–35` | `gx 36–75` | `gx 76–111` |
|---|---|---|---|
| **`gy 0–29`** | — | THE TOWER DISTRICT | THE ANNEX |
| **`gy 30–59`** | **THE FLATS** | **COURTHOUSE SQUARE** | **THE STRAND** |
| **`gy 60–89`** | — | **MOTOR ROW** | — |

Unbuilt space is solid, so a district whose neighbour does not exist yet simply has a wall there. The openings are cut on **both** sides in advance: Courthouse Square already has its climb north to the Tower District, and it is a wall until that region lands.

**MOTOR ROW** (bold above = built) is reached down the alley on the courthouse's south side — no loading break, same as the seam east to The Strand. Tow yards, body shops, and a chain-link fence you can see through, which is the point of a fence.

| Path | Matter | Shape |
|---|---|---|
| THE STREET | **The Kestenbaum Referral** | The chiropractor who refers, and what comes attached. Your first **contingency** — it pays nothing until it closes, which is a very different feeling once rent is weekly. Four resolutions; two of them need the ledger out of the alley. |
| THE FLOOR | **The Impound** | Four rows of cars, every engine running, every ticket dated today. One car is not running and the ticket on it is dated tomorrow. Sign, count, or walk. |

**RIVERSIDE / THE FLATS** is west along the same road. The river takes its whole west edge, and it is the one district that reads differently on the two layers in kind rather than in degree:

> DESIGN §7 says The Flats is the only place on THE FLOOR with daylight. So it is — and it is also the only district there that costs **nothing** to light, because those are the same fact. The building never owned this one, so it has nothing to bill. There are no Unbilled in it. Standing in it lifts the vignette and stops the pulse, because the pulse is the building and the building is not here.

| Path | Matter | Shape |
|---|---|---|
| THE STREET | **The Rivera Block** | Thirty three-day notices served on one Saturday to empty a building in escrow. The ethics engine: pro bono is mechanically the *worst* choice — it pays $0 during a week when rent is $1,100 — and the game does not quietly reimburse you for it. Opposing counsel's $4,000 is real money for doing nothing, and you take it from him, not from her. |
| THE FLOOR | **In re: The Meeting** | Thirty chairs in a circle in a warm room, and a sign-in sheet with four blank lines at the bottom. The counterpart to the resignation letter: a piece of paper you *can* sign. |

**Iris Nakamura exists on both layers** — same person, same cardigan, and she does not know you on the second one. `CASE_HOOKS.layer()` is how her tree finds out which Flats it is being asked for; quest state cannot answer it before either matter has opened.

Reputation is no longer two hard-coded districts — `Practice.seedRep()` takes the city's own region list, so adding a district is a change to `game/city.js` and nowhere else.

Not built yet: combat beyond a briefcase swing, the other three districts, the full enemy roster and bosses, LE1 save import, the crossover. See DESIGN.md §8.

---

## Run it

```bash
node tools/serve.mjs
```

Then open <http://localhost:8142>. Node is used only for the dev server and the bundler — the game itself has no dependencies, no build step, and no external assets.

Useful URLs:

| URL | What |
|---|---|
| `/?dev=1` | Dev HUD (resident regions, tile coords) and dev keys |
| `/?dev=1&layer=street` | Skip the reel, start on Path A |
| `/?dev=1&layer=floor` | Skip the reel, start on Path B |
| `/?edit=1` | Map editor |
| `/?touch=1` | Force the mobile layout on desktop |

Dev keys (`?dev=1` only): `P` swap layer · `O` save · `U` load.

## Build the single file

```bash
node tools/build.mjs
```

Writes `dist/index.html` — one file, no external references, double-clickable and itch.io-ready.

---

## Controls

| Key | Action |
|-----|--------|
| `WASD` / arrows | Move |
| `E` | Use / talk / advance |
| `C` / `Tab` | The Casefile |
| `1`–`9` | Pick a dialogue choice |
| `J` / `Space` | Briefcase strike |
| `K` / click | Fire *(reserved)* |
| `L` | Spin *(reserved)* |
| `Shift` | Dash |
| `M` · `F` | Mute · fullscreen |
| `−` / `+` / wheel | Zoom |
| 🎮 | Sticks move & aim, A use, B strike, X fire, Y spin, LB dash |

---

## Architecture

```
engine/     reusable — stage, sprites, anim (LEAnim), audio, input,
            tilemap, region streaming, save, facts, quests, dialogue
game/       content — city regions, layers, actors, cases, casefile,
            render, intro, main
dev/        editor.js — the ?edit=1 map painter
tools/      serve.mjs (dev server), build.mjs (bundler)
```

`engine/` never imports `game/`. Where the engine needs to ask the game a
question it calls out through a hooks object — `questHooks.knows`,
`questHooks.layerOk`, `CASE_HOOKS.say`. That is what keeps the quest engine
content-agnostic.

Vanilla ES modules, canvas 2D, Web Audio. No framework, no dependencies, no asset files — every sprite, map and note is generated in code, as in LE1.

### Three things worth knowing before you edit

**Maps are ASCII.** `game/city.js` holds each region's geometry as rows of characters (`engine/tilemap.js` defines the legend). Rows must be rectangular — the parser throws with the offending row rather than silently producing collision bugs. Paint with `?edit=1` and paste the export back.

**The city is one coordinate space.** A region declares its origin in global tiles; there is no per-map coordinate system and no `setWorld`. Query by global tile: `world.tileAt(gx, gy)`. Unbuilt space is solid.

**A district's origin is permanent.** It is baked into every save's delta keys and into `SPAWN`. The grid in the status section above allocates all six up front for exactly this reason — take the next free cell, don't reflow the ones that exist.

**Deltas are keyed by layer.** `world.delta(id)` is scoped `"<layer>:<region>"`, so killing someone on THE STREET has no effect on THE FLOOR. Anything that permanently changes a region must go through `killActor` / `takePickup` / `markUsed`, or it will come back when the region rebuilds.

### Two authoring rules for cases

**Never put two consecutive `talk` stages on the same NPC.** `talkTo()` emits the
talk event twice — once when the conversation opens and once when it closes.
The open emit is what lets a single conversation both satisfy a `talk` stage and
answer the `resolve` stage behind it; without it `qResolve()` is a silent no-op,
because the quest is still parked on the talk stage while the player is choosing.
The close emit catches a stage unlocked by facts learned in that same
conversation. Two consecutive same-NPC talk stages would be walked through by
that pair in one go.

**A floor region needs `lightCost` and a `lights: true` panel prop**, or it is
dark forever and there is no way to pay for it. Exactly one region carries
`litFree: true` — the one you wake up in. `main.js` reads that flag off the
region rather than naming a district, so this stays true at six districts.

**A quest with a `layer` only exists on that layer.** THE STREET and THE FLOOR
share one quest registry, so `layer: 'floor'` keeps a floor matter from opening
while you are walking around in daylight. Omit `layer` only for something that
genuinely belongs to both.

### The bundler's rules

`tools/build.mjs` concatenates the module graph into one scope, so it enforces:

1. **No circular imports.**
2. **No duplicate module-scope declaration names across files.**
3. **No `import * as X` where some module also exports a top-level `X`** — the
   generated alias `const X = {…}` would collide with the real binding.
4. **The emitted script must parse**, checked after insertion into the HTML.

All four fail the build with the offending files named. Rules 3 and 4 exist
because both failure modes ship a page that loads, renders nothing, and logs
nothing — the most expensive kind of broken. Keep imports as plain relative
specifiers; the dev server adds cache-busting, the source stays clean.

One non-obvious trap the bundler now guards: the bundle is inserted with
`html.replace('</body>', () => …)` and the replacement **must** be a function.
With a replacement string, JS expands `` $` ``, `$'`, `$&` and `$$` inside it,
and the bundle is full of `${…}` in template literals. The source parses; the
shipped copy is quietly corrupted.

### Why a Node dev server

ES modules import each other by literal path, so a `?v=` on the entry never reaches `engine/stage.js`, and Chrome will happily keep a stale module graph across reloads even under `Cache-Control: no-store`. `tools/serve.mjs` rewrites relative import specifiers on the way out, stamping each with the newest mtime in the source tree. Change any file and every module URL changes. This cost an hour to discover once; it is not worth rediscovering.
