# Drum Pro

## Overview
A 2-D drum kit you can play in the browser. The full kit is drawn on screen — kick, snare,
hi-hats, toms, ride, crash — and hitting a piece plays its sound. Touch screens tap the drums
directly; desktop plays with assigned keys. Beyond free play there's a **falling-notes mode**
where notes scroll down onto the kit and you hit them in time, with several modes that differ
by scroll speed.

## Tech Stack
- **HTML5 Canvas** — kit rendering, falling notes, hit feedback
- **CSS3** — menus, mode select, score panel
- **Vanilla JavaScript** — game loop, input, state
- **Web Audio API** — drum synthesis and timing
- No external dependencies, no build step (matches `emoji-battle/`, `ore-bit/`, `FARKLE/`)

## The Kit
Eight playable pieces, laid out as a front-facing 2-D kit (like looking at a drummer's setup):

| Piece            | Key     | Sound character                                  |
|------------------|---------|--------------------------------------------------|
| Kick             | `Space` | low sine thump with fast pitch drop              |
| Snare            | `S`     | noise burst + short tonal body                   |
| Closed hi-hat    | `A`     | short filtered noise, tight decay                |
| Open hi-hat      | `Q`     | same source, long decay                          |
| High tom         | `D`     | mid sine with pitch drop                         |
| Mid tom          | `F`     | lower sine with pitch drop                       |
| Floor tom        | `J`     | lowest tom, longest decay                        |
| Ride             | `K`     | bright sustained noise + metallic partials       |
| Crash            | `L`     | wide noise wash, long decay                      |

Home-row keys sit left-to-right in the same order as the pieces on screen, so the mapping is
learnable by looking at the kit. `Space` is kick because it's the foot.

## Modes

### Free Play
No notes, no scoring. Tap/click/press anything, any time. This is the default landing mode and
must feel instant — it's the thing most people will judge the game on.

### Falling Notes
Notes scroll from the top of the screen down toward a hit line drawn just above the kit. Each
piece is a lane; a note in a lane means "hit that piece when it reaches the line."

- **Judgements** — Perfect / Good / Miss, based on a fixed millisecond window around the note's
  scheduled time. Windows stay constant in ms across all speeds.
- **Speed modes** — the "different modes" are scroll-speed presets. Faster scroll = less time to
  read what's coming, same timing precision required:
  - Slow, Normal, Fast, Insane
- **Scoring** — combo multiplier, accuracy percentage, letter grade at the end.
- **Persistence** — best grade/score per chart per speed in `localStorage` (`drumpro-save-v1`).

## Project Structure
```
drum-pro/
├── CLAUDE.md
├── index.html      — entry point, canvas + menus
├── style.css       — menus, mode select, score panel
├── audio.js        — AudioContext setup, synthesized drum voices
├── kit.js          — kit layout, hit zones, drawing
├── charts.js       — note chart data (patterns + BPM)
└── game.js         — game loop, input routing, falling-notes logic, scoring
```
Split from the start here rather than one big file — audio synthesis and chart data are both
self-contained enough to live on their own.

## Critical Constraints
These are the things that make or break a drum game, in order:

1. **Latency is the whole game.** Free-play hits must fire the sound in the same event handler as
   the input — never queue them to the next animation frame.
2. **Audio clock, not frame clock.** Falling-note timing and judgement compare against
   `AudioContext.currentTime`, never a `requestAnimationFrame` timestamp or `Date.now()`. Note
   positions are *derived* from audio time each frame, so visuals follow audio, not the reverse.
3. **Unlock audio on first gesture.** Browsers start the `AudioContext` suspended; `resume()` it
   inside the first real tap/keypress, and show a "tap to start" screen until then.
4. **Multi-touch.** Use `pointerdown` (not `click`) with `touch-action: none` on the canvas, and
   track multiple simultaneous pointers — real drumming hits two pieces at once.
5. **Key repeat.** Ignore `keydown` events where `event.repeat` is true, or holding a key machine-guns.
6. **Polyphony.** Every hit gets its own voice; a second snare hit must not cut off the first's tail
   (except hi-hat, where closed *should* choke open — that's how a real hat behaves).

## Conventions
- ES6+ (const/let, classes)
- Single shared `state` object; no scattered globals
- Drums are **synthesized**, not sampled — no asset files to load, works offline, instant startup
- Input layer maps both keys and pointer hits to one `hit(piece, time)` function so both paths
  behave identically
- No build step — open `index.html` directly in a browser

## Design Goals
- Feels like an instrument first, a game second
- Readable at a glance: each piece has a distinct color, reused for its lane and its notes
- Visible hit feedback on the drum itself (flash/ring scale) so touch play feels physical
- Touch and desktop are both first-class, not one ported to the other

## Open Questions
1. **Backing audio for falling-notes mode** — a synthesized metronome/click only, or actual music?
   Music means audio files, which breaks the no-assets rule and adds loading. Starting with a click
   + the drums themselves is simplest.
2. **Charts** — hand-authored drum patterns (rock beat, funk, blast beat, etc.) looping at a set BPM,
   versus full-length songs. Patterns are cheaper and fit the "short loop" feel of the portfolio.
3. **Difficulty vs speed** — should the modes also change *note density*, or strictly scroll speed
   as described above?

## Landing Page Integration
After the first playable build, add a card to the root `index.html` linking to `drum-pro/index.html`,
following the pattern used by the other games, and add a row to the root `CLAUDE.md` projects table.
