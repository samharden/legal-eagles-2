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

## Status: Phase 1 (vertical slice) — playable, one complete case per path

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

Not built yet: the Docket/clock, the economy and trust account, reputation, staff, combat beyond a briefcase swing, the other four districts, the crossover. See DESIGN.md §8.

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

**A quest with a `layer` only exists on that layer.** THE STREET and THE FLOOR
share one quest registry, so `layer: 'floor'` keeps a floor matter from opening
while you are walking around in daylight. Omit `layer` only for something that
genuinely belongs to both.

### The bundler's two rules

`tools/build.mjs` concatenates the module graph into one scope, so it enforces:

1. **No circular imports.**
2. **No duplicate module-scope declaration names across files.**

Both fail the build with the offending files named. Keep imports as plain relative specifiers — the dev server adds cache-busting, the source stays clean.

### Why a Node dev server

ES modules import each other by literal path, so a `?v=` on the entry never reaches `engine/stage.js`, and Chrome will happily keep a stale module graph across reloads even under `Cache-Control: no-store`. `tools/serve.mjs` rewrites relative import specifiers on the way out, stamping each with the newest mtime in the source tree. Change any file and every module URL changes. This cost an hour to discover once; it is not worth rediscovering.
