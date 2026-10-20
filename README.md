# Retro Otome — Tamagotchi Care System V40

V40 integrates the Tamagotchi Care System rules V1.2 into the existing mobile snowy-cottage pet board. The project remains a static GitHub Pages app and uses the browser's localStorage; it does not need a backend or live AI.

## What's integrated

- **Real-time growth:** incubation progress is timestamp-based; post-hatch stages are derived from `hatchedAt` (chick under 3 days, growing from 3 days, grown from 7 days). When the page reopens, only one state synchronization occurs; offline time does not create a backlog of care events.
- **Food preferences:** this single chick prefers millet, likes corn and oats, is less enthusiastic about leafy greens, and reacts neutrally to other food. Preference affects mood and reactions, not health or extra bond rewards.
- **Feeding rewards:** each successful feed restores 30 satiety and starts the shared 4-hour cooldown. Ordinary feeding affinity rewards are capped at 3 per local calendar day; feeding and reaction animations still work once the affinity cap is reached.
- **Mortimer formal care:** a persisted random 2.5–5 hour schedule; urgent needs may bring it forward to 1.5–2.5 hours after the previous formal care, never below the absolute 90-minute minimum. Each successful formal care applies exactly one valid care action, increases shared bond and Mortimer bond by 1, and is de-duplicated in history. The ribbon collection unlocks after 3 formal cares.
- **Ambient moments:** separate, state-aware observations have their own persisted scheduling and a minimum 30-minute gap. They do not change care stats, bond, care count, or formal history.
- **Care history and collections:** formal actions and collection unlocks use unique event IDs; history is capped at 120 records while collection ownership remains in persistent arrays. Collection milestone checks are idempotent.
- **Legacy-save migration:** preserves the current chick, needs, cooldowns, bonds, care records, and collection. Migration does not infer a formal-care count from an ambiguous/truncated history; it uses the persistent count or the already-owned ribbon.
- **Animated chick:** the snowy-cottage scene uses the local transparent PNG walk and idle sequences. A completed automatic walk can unlock the snow-footprints memento.

## Care values

- Natural incubation: about 24 real hours; warming has a 6-hour cooldown and adds up to 45 percentage points.
- Satiety: -2 per elapsed hour; energy: -1 per elapsed hour; cleanliness: -1 per two elapsed hours.
- Feeding: +30 satiety; 4-hour cooldown; disabled at satiety 90% or above.
- Petting: 2-hour cooldown; bond +1 and Vivi bond +1.
- Playing: 6-hour cooldown; requires energy over 30%; energy -18, satiety -5, bond +2 and Vivi bond +2.
- User rest: only when energy is 30% or lower; lasts 30 minutes and restores +35 energy when completed.
- User nest cleaning: only at cleanliness 30% or lower; restores cleanliness to 100%.
- Mortimer feed: when satiety is 60% or lower and the shared feed cooldown has ended, +25 satiety and starts the shared feed cooldown.
- Mortimer cleaning: when cleanliness is 50% or lower, +30 cleanliness.
- Mortimer low-energy care: at energy 31–40, +20 energy; at energy 30 or lower, starts the existing 30-minute rest instead of immediately restoring energy.
- Successful formal Mortimer care: shared bond +1 and Mortimer bond +1; it does not change Vivi bond.

## Runtime limitations

The app is single-device and local-only. When the page is closed, no JavaScript timers run. On reopening the pet board, timestamps are reconciled and at most one eligible formal Mortimer-care event is processed; there is no offline backlog. The site does not call a live AI for Mortimer's actions.

## Files

- `index.html`
- `style.css`
- `app.js`
- `assets/chick/` — transparent idle and walk animation frames
- `Tamagotchi_8module_rules.md` — the V1.2 implementation specification
- `NETEASE_API_SETUP.md` — existing music API setup notes

## Verification

The JavaScript source is checked with `node --check`; asset references and ZIP integrity are checked before packaging. Full browser end-to-end testing may be limited in this environment, so please test the final project in your GitHub Pages deployment after replacing the files.
