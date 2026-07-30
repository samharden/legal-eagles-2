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

## Status: Phase 4 (crossover) — complete. The layers bleed, you can walk between them, and there are seven endings.

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
- **The dark.** Every floor district but the one you wake in renders near-black beyond a radius, with a hard seam at the district line, and drains energy for as long as you stand in it — about four minutes of a full bar. You can *cross* a dark district, and you can *look* at one. You cannot *live* in one.
- **The lighting panel.** The layer's only transaction: a breaker box with a time-entry form taped over the switches. It costs banked hours, it is permanent, and the cost has to be read in the building's own language every single time. There is a line for a matter number. Nobody has ever asked about the matter number.
- **Work is what pays.** Establishing a fact, reading a file, closing a matter — and putting down one of **The Unbilled**, which are your own hours itemized and are carrying time you can take back. That is the only reason to fight anything on this layer.
- **The trap, made mechanical.** Every ten hours billed, the building notices, and The Unbilled get faster and hit harder *everywhere*. Lighting a floor buys safety on that floor and pays for it in every other one. You cannot buy your way out; you can only buy your way further in.
- **Collapse costs hours, not a day.** There is no day here to lose, so the building charges you for the time you were out. The entry is already written when you come round.
- The Casefile's third tab on this layer is **THE HOURS** — the two columns, which floors are lit and what the dark ones cost, and the timesheet.

**Phase 3b** laid out the whole city at once and built the first new district on it.

The six districts are allocated on the global tile grid **up front**, before any of them have content, because a region's origin is baked into every save's deltas and into `SPAWN` — moving a district after it has content is the expensive mistake. Every band is 30 tiles tall so they stack flush:

|  | `gx 0–35` | `gx 36–75` | `gx 76–111` |
|---|---|---|---|
| **`gy 0–29`** | — | **THE TOWER DISTRICT** | **THE ANNEX** |
| **`gy 30–59`** | **THE FLATS** | **COURTHOUSE SQUARE** | **THE STRAND** |
| **`gy 60–89`** | — | **MOTOR ROW** | — |

All six are built. Unbuilt space is solid, so a district whose neighbour did not exist yet simply had a wall there; the openings were cut on **both** sides in advance and became doors the day the neighbour landed.

`node tools/check.mjs` validates the city statically and runs automatically before every build: anything authored where it cannot be used (an NPC inside a wall, a prop with no open tile beside it), duplicate ids within a region+layer, unknown actor types, and any floor district that can never be lit because it has a `lightCost` and no panel.

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

**Phase 3d** built the opposition DESIGN §3 and §4 name, and the useful thing about that list is that barely any of it is *a thing that walks at you and reduces a number*. So the roster is **behaviour flags** on a data table, with one branch each in the host — a new enemy is a row until it needs a verb nothing else has.

| | Wants |
|---|---|
| **Process Server** | To hand you paper. Being served is a *condition*, not a hit — stacks, slows you, and stays on you until you sleep |
| **Collections Agent** | $140. Not your energy. Sixty-two hit points and no interest in tiring |
| **Ambulance Chaser** | Your client. Never touches you and cannot be fought off, because she is never on you — she walks at whoever the HUD says you should be talking to, and standing in the gap is the only counter |
| **Notice of Deposition** | You, at nine a.m. Never moves. Throws subpoenas |
| **The Landlord** | The rent. Does not exist while you are current — he is not a fight, he is a bill with a walking speed |
| **Retrieval Associates** | What you are carrying. Three of them, and they take the file rather than the energy |
| **The Unbilled** | Your hours, which you can take back off them |
| **The Ones Who Stayed** | Nothing. They do not move. Walking into one is your decision every time |
| **Past Selves** | Junior, Of Counsel, Partner. Each fights the way you fought at that rank |

**THE TOWER DISTRICT** is north of Courthouse Square, up a ramp: DC&H on one side, Grabbit & Runn on the other, and a plaza between them with nowhere to stand that is not overlooked.

| Path | Matter | Shape |
|---|---|---|
| THE STREET | **Retrieval** | DC&H want back a client list you never physically took, and the covenant they are relying on is posted inside their own front door. Hargrove signed the authorisation; he did not write it and did not refuse it, and he will tell you both. Keeping the internal billing summary is the COUNTERSUE evidence — and it makes nothing better, which is the point |
| THE FLOOR | **The Reviews** | Your personnel file is open on a chair in the plaza with three annual reviews in it, and all three are walking around out there. The first matter built on `kill` stages |

Reputation is no longer two hard-coded districts — `Practice.seedRep()` takes the city's own region list, so adding a district is a change to `game/city.js` and nowhere else.

**The ranged weapon** is LE1's, ported whole — and in LE1 it was never a weapon, it was your **practice area**. You did not pick a gun, you picked what kind of lawyer you were, and what came out when you pressed the button was the argument that area actually makes.

| | Attack | Shape |
|---|---|---|
| **LITIGATION** | OBJECTION! | Fast, loud, constant. 1-in-4 shots shout |
| **CORPORATE M&A** | Hostile Takeover | One slow enormous non-negotiable point |
| **CRIMINAL DEFENSE** | Cross-Examination | Three of something; only needs one to land |
| **INTELLECTUAL PROPERTY** | Cease & Desist | A letter that turns and finds you |
| **TAX** | Surprise Audit | Ten shots, every direction, at once |

Melee is 18 a swing and requires standing next to a Collections Agent while it takes $140 off you, so ranged is deliberately a little weaker per second and much safer. That is the trade.

**You choose it in the resignation letter.** EXHIBIT C has a blank in it —

> *For nine years I have been the person this firm sends when ______________________.*

— and the five practice areas are the five ways to finish that sentence. Pick one and the letter re-types itself with your clause in it. You are not picking a weapon on a class-select screen; you are saying what you did for these people, and the weapon is downstream of that.

`game/areas.js` is also the answer to two other things DESIGN asked for:

- **LE1 save import** (§6) — LE2 reads `legalEagles.save.v1` and takes your `classId` and `genderId`, so your practice area *and your face* carry over from the first game. The face arrives without being asked, because a face is not a decision. The practice area **pre-selects the row and says so** — it does not answer for you. It used to fill the blank in and skip the question entirely, which meant anybody with an old LE1 save on the same origin was silently handed an area they never picked and could not change, on the one screen the whole game forks on.
  > `localStorage` is scoped to the **origin**, not the path. On GitHub Pages both games sit under `samharden.github.io`, so the import works. Running LE1 off `file://` and LE2 off `localhost:8142` are two different origins and it will never find the save — that is not a bug, and the no-save path is the designed one.
- **Past Selves fight with your attack** (§4) — they literally do now. A litigator's past selves object at them constantly; a tax lawyer's arrive slowly and hit like a filing deadline.

**Phase 3 is closed.** Both dockets run twelve matters, and both are reachable end to end from a fresh start:

```
STREET  ruiz → coronado → ferraro → rivera → bail → lease
        → retrieval → lien → centre → grabbit → sealed → withdrawal
FLOOR   unsent → dept13 → years → ledger → meeting → impound
        → stayed → warm → reviews → sublevel → copier → thefirm
```

They are deliberately not twelve of the same shape. A docket of twelve identical five-fact four-resolution investigations would be a chore, and most of a practice is not an ethical crisis — it is a walk-in worth six hundred dollars that has to be at the window by Thursday. So they run from two stages and no decision at all up to the finale, and about half of them resolve at a **prop** rather than a person: a bail bondsman behind glass, your own lease, a tow-yard gate, a personnel file, a copier. A district reads better when not everything that talks to you has a face.

Two bosses, both gated by `needs` so they are not scenery — neither is on the board until the matter that summons it is open:

- **THE NON-COMPETE** (street) — DESIGN §3's finale opposition, a contract-golem cousin to LE1's Founding Agreement. The argument that beats it is posted on DC&H's own front door, and Hargrove hands it to you from the other table.
- **THE FIRM** (floor) — what has been running the copier in Sublevel C. Not a person and not pretending to be: the going concern, with four hundred people's work in it.

---

**Phase 4** is the payoff the one-city-two-layers structure was built for, and it is one number.

The whole of Phase 3 depended on the two layers being sealed from each other — separate deltas, separate dockets, `layerOk` keeping a floor matter shut while you are walking around in daylight. So the crossover could not be a second world model. It is a dial on the one that already exists:

|  | | |
|---|---|---|
| **0** | SEALED | the game as Phase 3 shipped it |
| **1** | SEEPAGE | the other layer's colour is in this one, and the things that stand still over there are faintly here |
| **2** | THE SEAM | props authored `bleed: 2` come into being — the door that shouldn't exist, the window with traffic |
| **3** | TRAVERSAL | the crossings open |

The level is **derived from matters closed**, never stored as a story flag, so a save cannot disagree with the docket about how far in you are. The gates are the same two buildings on both paths — the Tower (`retrieval` / `reviews`), then the Annex (`sealed` / `sublevel`), then your own finale (`withdrawal` / `thefirm`) — so a player on either path meets the bleed in the same place at the same depth.

- **The level is global; the intensity is local.** Every district holds a piece of evidence on each layer, and reading it *witnesses* that district, which roughly triples how far through it renders. The bleed is something you find, not something done to you on a schedule — and a district you finished with in Phase 3 becomes worth walking back into.
- **Rendering is one draw with different constants.** Palette, solid edge, page colour, tint, motes and vignette all lerp along the district's own number; the tile scan is region-first so a dressing is resolved when the scan crosses a district line rather than once per tile. The two moods are drawn over each other at complementary opacity rather than averaged — two atmospheres in one room is the effect, and an average would be a third atmosphere belonging to neither.
- **Ghosts.** Where the other layer's furniture stands, drawn under everything real and never interactive. The vending machine from DESIGN §2, still there, unplugged.
- **Three crossings**, each one physical thing seen from either side: the door four feet left of the courthouse steps in eleven feet of granite; the fire door in the plaza retaining wall, with the push bar on the side people were getting out from; the doorway at the end of run L with the brass threshold worn through in the middle. They exist a level before they open, so you find them and cannot use them.

> Crossing over keeps your position, energy, what you are carrying, the grievance and the paralegal. The world does not come with you. Everything else that had to be true was already true: deltas are keyed by layer, `layerOk` opens the other docket no further than its prereqs allow, and `HAS_CLOCK` / `HAS_HOURS` are one-line predicates on `G.layer` — so the day stops and the timesheet starts without a single system being told about it. A street player who crosses finds exactly one matter open over there, because every floor matter after *In re: The Unsent* has a prereq. One letter, in one drawer, on a floor that is dark.

**IN RE YOURSELF** is the only quest in the game with no `layer`. It opens on your first crossing — not on the bleed level, because standing next to an open door is not the same as having gone through one.

**Hon. M. Bane** has been named in five places since Phase 1 and never appeared. He is on the steps now, on both layers at the same tile, because Department 13 is one room and has been in session throughout. **THE PARTY OF THE SECOND PART** fights with *your* practice area, the way the Past Selves do, and is deliberately not `scales` — pressure is a floor-only quantity and this is the one fight that has to be the same fight from both sides of the door.

All seven endings are offered to everybody and gated on what you **did**:

| | Wants |
|---|---|
| **WIN** | *In re Withdrawal* behind you, and not lost |
| **SETTLE** | nothing. It is always there |
| **COUNTERSUE** | the internal billing summary you kept at *Retrieval* |
| **GO BACK** | a room somebody offered you — Grabbit's folder, or DC&H's release |
| **WAKE** | nothing. It is always there |
| **FILE** | to know whose hand the letter is in |
| **DISSOLVE** | the going concern already down |

Which list you can reach is never decided by the key you pressed in the reel; by the time that screen runs you have been through a door. **SETTLE** and **WAKE** are the two ungated ones, one per list, and both of them are surrender.

The ending reel is the opening reel's own presentation — same typewriter, same slate, same stamp. Its last scene is not written: it is read off the save. DESIGN §5 says which of you is real depends on what you did with the trust account, the letters and the four hundred who did not leave, so those are what the game says back to you.

---

**Phase 5** is the last one, and two of its five items turned out to be smaller than DESIGN §8 implies:

- **Input parity was already done** in Phase 0, as §6 asked — keyboard, mouse, touch buttons plus joystick, and gamepad on the standard mapping, all through one action layer. What Phase 5 owed was not plumbing but a *layout* pass, and that has landed:

  > On a landscape phone the board is width-driven, so at 812×375 it computed 812×507 in a 375-tall viewport and the 220px control shelf covered 384px of a 502px board — there was no visible playfield at all. Landscape now has no shelf: `#touch` becomes a transparent full-viewport layer, the thumbs land in the screen's own bottom corners, and the board is capped by the height it actually has. The cap is on `#wrap` rather than the canvas, because the HUD is positioned against the wrap and has to keep lining up with the board's edges.

  The HUD's two-column rows also stacked below 700px instead of forcing the name to wrap to four lines, and the utility buttons — which sit *above* the HUD at `z-index:6` — now have their strip reserved on `body.touch` rather than at a width breakpoint, since that is exactly when they exist.

- **Audio** was mostly built already — a full chiptune engine and the SFX set — and had three songs. It has six, and two of them are assembled out of the others rather than composed, because that is what they are *about*:

  | | |
  |---|---|
  | `letter` · `street` · `floor` | as before. `floor` is `street`'s chord roots an octave down |
  | `boss` | the city's own progression with the thirds flattened and nowhere to breathe — same roots, so a boss fight is audibly happening in the district it is happening in |
  | `yourself` | THE FLOOR's bass and chords under THE STREET's lead, at a tempo between them, over a kick that is just a pulse. Nothing new is written: the two halves are put in the same room and told to account for themselves |
  | `ending` | the letter's own progression and bass, *finished*. Its lead trails off unresolved because at 2:47 a.m. nothing was; this one goes up to the tonic and stops |

  **The bleed does not get a track.** `musicTick(want, bleed)` takes the same 0–1 the renderer lerps its palette with, and does to the music what the renderer does to the colour — one composition, different constants. Each song carries an `echo` and a `bleedInto`, so the bleed lerps the room toward the other layer's: THE FLOOR is reverberant and THE STREET is not, so on Path A the first thing to arrive is the wrong acoustics for the place you are standing in, before anything else is wrong. Then the other layer's chord fades in *underneath* the current one — they share roots an octave apart, which is why two pads sit together instead of fighting — and the lead goes progressively flat, in cents, so it reads as something wrong with the tuning and never as a key change.

- **The run summary** opens over the ending reel's close card, and *it* — not the reel — is what returns you to the title. It borrows the Casefile's own panel and every one of its renderers' classes, because a run summary **is** a casefile: the final one, no tabs, with the per-layer parts shown together. Nothing new is measured; every number was already being kept, and `coda()` already turned the interesting half into prose. There is deliberately no score.

- **NEW GAME +** is the other key. A finished run writes a short record to `legalEagles2.runs.v1` — separate from the save, because clearing one should not erase the other — and the title then offers **DELETE IT INSTEAD** or **SEND IT INSTEAD** by name. DESIGN §3 says both paths are full-length campaigns, so a second run is the other side of the fork rather than the same side with the numbers turned up.

  The reel still runs and EXHIBIT C still asks what kind of lawyer you are. Only the fork is spent, and it is shown spent: both keys are still on screen — the one you pressed has to be visible or "the other one" means nothing — but it is struck through, unnumbered, not tappable, and the narration says so.

  What a second run inherits is a paragraph, not a mechanic. The building keeps four hundred letters and does not throw any away, so it kept yours: there is a box near the end pulled forward an inch, with your last resignation in it, marked SENT or struck out according to which key you pressed, and behind it one for every run before that. Bane has been presiding since 1959 on a docket with one matter on it, so of course he has seen you before, and he does not make anything of it.

- **The map** (`MAP`, in the Casefile on both layers) is drawn from `REGIONS`' own origins, so it is the city rather than a picture of one — adding a district puts it on the map and nothing in the renderer changes. A district you have not walked is an **empty dashed rectangle with no name in it**: you can see there is something there and you are not told what.

  What fills it in is `engine/atlas.js`, and deliberately not `Bleed.seen` — the nearest existing thing, which means *you read the evidence there*, not *you were ever in it*. The atlas is keyed `"<layer>:<region>"` exactly like region deltas, and for the same reason, which buys the best thing on the panel for free:

  > **Cross over and the map is blank again.** Four districts you know intimately on THE STREET are dashed rectangles on THE FLOOR. The one that fills in first is wherever you came through.

  A walked district carries its state — `ON THE LIGHTS`/`DARK` on the floor, your standing on the street, and how far through it has bled — and a ring marks a district with a crossing in it once the bleed has put one there.

Still to do: LEAnim cinematics. See DESIGN.md §8.

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

`P` is a raw layer swap and always has been — it is not the crossover. The real
one is `window.LE2.Bld`: `setBleed(3)` opens the crossings, `witness('strand')`
marks a district found, and `cross()` walks you through from wherever you are.

## Build the single file

```bash
node tools/build.mjs
```

Writes `dist/index.html` — one file, no external references, double-clickable and itch.io-ready.

> **Double-click `dist/index.html`, never the `index.html` in the repo root.** The
> root one is the dev entry and is built out of ES modules; browsers fetch module
> scripts under CORS rules and `file://` has an opaque origin, so it fails with a
> console error and a blank page. That is the cost DESIGN §6a accepted for the
> dependency graph, and the bundler is the mitigation it promised. The root file
> now detects `file://` and says all this on the page instead of failing silently —
> `tools/build.mjs` strips that notice from `dist`, which is the one place the
> notice would be actively wrong.

---

## Controls

| Key | Action |
|-----|--------|
| `WASD` / arrows | Move |
| `E` | Use / talk / advance |
| `C` / `Tab` | The Casefile |
| `1`–`9` | Pick a dialogue choice |
| `J` / `Space` | Briefcase strike |
| `K` / click | **Fire** — your practice area's attack. Held, not tapped; aims at the cursor |
| `L` | Spin *(reserved)* |
| `Shift` | Dash |
| `M` · `F` | Mute · fullscreen |
| `−` / `+` / wheel | Zoom |
| 🎮 | Sticks move & aim, A use, B strike, X fire, Y spin, LB dash |

---

## Architecture

```
engine/     reusable — stage, sprites, anim (LEAnim), audio, input,
            tilemap, region streaming, save, facts, quests, dialogue,
            clock, practice, hours, bleed
game/       content — city regions, layers, actors, cases, casefile,
            render, intro, ending, main
dev/        editor.js — the ?edit=1 map painter
tools/      serve.mjs (dev server), check.mjs (city validation), build.mjs
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
genuinely belongs to both — *In re Yourself* is the one thing that does, and it
should stay the one thing.

**Anything with a `bleed: n` does not exist below bleed level n.** The gate runs
at BUILD time (`World.gate`), so whatever changes it must be followed by
`world.rebuild()` — otherwise the new content appears the next time you happen
to walk far enough away to evict the district, which is nowhere. Reading a
`bleed` prop witnesses its district; that is the only way a district's intensity
goes up.

**A crossing is authored twice.** It is one physical thing seen from both sides,
so it needs a `cross: true, repeat: true` prop at the *same tile* on both layers
of its region. `tools/check.mjs` enforces the pairing: a one-sided crossing is a
one-way trip into a district with no way back out, and it is the only bug here a
player cannot work around.

**A dialogue's close handler only owns the conversation's state.** A choice's
`fx` can move the game somewhere else entirely — picking an ending does exactly
that from inside a conversation — so both close handlers restore `'play'` only
if the state is still `'dialog'`. Restoring it unconditionally silently stomps
whatever the choice just did.

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

It also strips `<script data-dev-only>` (and the comment immediately above it)
out of the shipped HTML. Anything that only makes sense while being served from
the source tree goes in one of those. Today that is the `file://` notice, which
in `dist` would tell a player who correctly double-clicked `dist/index.html` to
go and open `dist/index.html`.

One non-obvious trap the bundler now guards: the bundle is inserted with
`html.replace('</body>', () => …)` and the replacement **must** be a function.
With a replacement string, JS expands `` $` ``, `$'`, `$&` and `$$` inside it,
and the bundle is full of `${…}` in template literals. The source parses; the
shipped copy is quietly corrupted.

### Why a Node dev server

ES modules import each other by literal path, so a `?v=` on the entry never reaches `engine/stage.js`, and Chrome will happily keep a stale module graph across reloads even under `Cache-Control: no-store`. `tools/serve.mjs` rewrites relative import specifiers on the way out, stamping each with the newest mtime in the source tree. Change any file and every module URL changes. This cost an hour to discover once; it is not worth rediscovering.
