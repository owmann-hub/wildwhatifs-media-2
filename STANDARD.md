# Wild What Ifs — Official Video Standard

The owner's corrections, collected in one place (last updated Nov 18, 2026).
**Every new video must follow this list.** It overrides older rules in PIPELINE.md and state.json
(`format_v4`, `hook_rules`, `visual_rules`, and the older entries of `format_v5.rules`) wherever they disagree.
Before rendering, go through the checklist at the bottom.

---

## 1. Structure

1. **Runaway format.** The premise is a process that never stops and keeps multiplying ("you fold paper and never stop", "every jump is twice as high"), not "X for 5 seconds".
2. **Length 50–65 s.**
3. **Say the "what if" the same way every time.** The title is on screen from the first frame, and the narrator's very first line is that same question, word for word ("What if you folded a piece of paper and never stopped?"). Every video, no exceptions.
4. **Explain before it happens** (owner, Nov 18: the jump and friction videos were unclear until the thing happened). Right after the title question, 1–2 plain lines say what is about to happen and the physics behind it, e.g. "Friction is the grip that stops things from sliding. Shoes, tyres, even knots need it." At every step, say *why* it happens, not just what ("No friction, so the knot can't hold. It just slides open.").
5. **Start small and human:** the hero in an everyday place doing an everyday thing, with a small stake (an unpaid bill, an ice cream). The process starts by second 3.
6. **10–13 steps of 4–5 s each.** At every step: the counter jumps, one short line with a real comparison, the picture visibly changes, and the camera keeps pulling back. Something new happens at least every 4 s.
7. **Escalating counter:** always on screen, rolls up at each step, and its unit escalates wildly (mm → m → km → "past the Moon").
8. **Scale change:** room → street → city → country → planet → space, in one continuous camera move.
9. **Ending:** no black end card. The last shot stays on screen while the narrator asks for ideas ("What should we try next? Tell us in the comments"), with the same line as small text over that shot. Total ending 2 s or less after the payoff. Shorts just end; no outro.

## 2. Writing and narrator

1. **Narrator:** Kokoro `af_heart`, same voice always; the owner likes it. Calm and dry, **not angry, no swearing.**
2. **Listen test:** the narration alone must tell a complete, simple story that a 12-year-old follows the first time. Never rely on the picture to explain a line.
3. **One thread:** the stake from the first scene comes back through the video and pays off in the last line (model: the electricity bill in `paperfold`, "And no. You still have to pay it.").
4. **Every joke needs a setup** the viewer already saw or heard. No random one-liners ("Mittens is not a person", "It's 3 a.m. in Tokyo"), and no callbacks that were never set up ("This was your idea", "You had one job").
5. **At most one joke per step,** coming from what just happened on screen.
6. **Narrator against the hero** (owner loves this): calmly blames the hero 2–3 times, always with a setup.
7. **Short, plain sentences** (12 words max), one idea per line, no abstract or time-travel framing.
8. **Final fact:** instantly understandable, one simple comparison.
9. **Facts:** every number is computed and checked, with the formula stored in the script JSON. Never invent facts.
10. **Never** reuse a previous script with only the noun swapped, and never copy another channel's video (YouTube's inauthentic-content policy).
11. **Reality first, then the "what if"** (owner, Nov 18: "more real… stuff should look and make sense"). Say the real-world limit plainly before going past it, e.g. "Normal paper stops at about 7 folds. The record is 12, on a 1.2 km strip of toilet paper. But what if you could keep going?" From that line on, the impossible part is clearly the "what if". Every picture must also make physical sense: a paper stack that passes a ceiling breaks through a real ceiling, a hole has walls, things fall the right way.

## 3. Characters

1. **Hero:** same look in every video (hair `short`, colour `0x5a3a20`). Lively animation: blinking, expressions, looking around; never frozen.
2. **Fluent motion:** walk cycles with arm swing and bounce; reactions with anticipation and follow-through.
3. **Mittens = the friend, in every shot with a visible expression** (owner, Nov 18):
   - Mittens is in the scene itself in every shot, near the hero. **Even when she's small in the background, she must be visibly expressive**, never a still prop:
     - exaggerate so it reads at a distance: big eye and eyelid changes, ears flat or up, tail puffing, a jump back, a slow unimpressed head turn, a yawn;
     - she reacts within about half a second of every event;
   - she changes expression at every step (`setCatFace(cat, mood)` + `catLife(cat, t)` on the in-scene cat: unimpressed, annoyed, shock, smug, sleepy, happy, scared), with ears, tail and eyes always moving a little;
   - she is fine and mildly annoyed whatever happens;
   - the **Mittens cam** (round close-up) is optional, not required. Use it only for shots where she can't physically be in the picture (space, a planet seen from far away).
4. **Background cast:** 2–3 per video, a different mix each time, each with a fixed look.
   - Regulars: the Filmer (films instead of helping, complains about the lighting), the Salesman (already selling T-shirts), the Pigeon (watches and judges), Bad Timing (someone proposing or carrying a cake), the Unbothered Person (keeps eating a sandwich).
   - Rarely: the Complainer; the Over-reactor (at most once every 5 videos).
5. **Hair:** one smooth shape that follows the head; no blobs or tufts on top. Characters differ by hair colour.
6. **Hero voice clips** (ElevenLabs "Chris"): only in the narrator's gaps, never over the narration, 3–4 per video at most.

## 4. Look and world

1. **Polished toy look:** rounded characters and cars, soft shadows, soft fill light, smooth shading (never flat), 4x anti-aliasing.
2. **Bright:** strong warm light on the hero's face, saturated colours, the face the brightest thing in frame. Dark topics: dark-blue world with warm lamps and neon, never grey or black.
3. **Golden light by default:** warm, low sun with long soft shadows, haze that softens distant buildings, some lit windows.
4. **Varied city:** no two neighbouring buildings alike. Street level uses warm European town houses (shutters, balconies, cornices, shop signs with invented names, awnings, cobblestones), with towers only in the distance. Add trees, benches, lamps, bikes, murals.
5. **Lively streets:** cars driving, people doing specific things; planes when something flies.
6. **A different opening place every video** (couch, dining table, restaurant, a date, bus, gym, park…), never repeating the last two.
7. **Landmark labels:** 2–4 per video, with a real name and a real number, for about 2 s each.
8. **Effects:** expanding shockwaves for impacts (not a bullet and a flash); moderate particles, glow and fog.
9. **Sharpness:** light background blur only; a blurred foreground object never covers more than about 10% of the frame; the subject fills at least a third of the frame in close shots.
10. **Final encode:** scale to 1080x1920 with lanczos and `unsharp=5:5:0.55:5:5:0.0`, `-crf 20 -maxrate 9M -bufsize 18M`.

## 5. Sound

1. **The narrator is always clearly heard, and the music is always heard too** (owner, Nov 18: "the videos are missing the music"). mix.py holds the music at a fixed 9 dB below the voice while he speaks, ducks it only gently, and lets it come up in the gaps. Effects and ambience stay at least 14 dB below the voice. The mix log must print `voice-over-music dB: 9` (allowed 8–10).
2. **Music:** an upbeat background track with a clear beat and melody, audible on phone speakers (not just a soft pad). Never bake copyrighted songs into the files; make a no-music copy for TikTok.
3. **No-narrator test:** only on the plan entry marked `no_narrator_test` (Nov 23). Otherwise the narrator is always on.

## 6. On-screen text

1. **Minimal text:**
   - title (first seconds only), with the same wording as the spoken question;
   - the side counter;
   - the italic caption line the narrator is reading;
   - landmark labels;
   - name tags only in the intro.
2. **AI-generated label** on every platform.

## 7. Titles, captions and posting

1. **Title:**
   - the premise with the first two words in capitals and one emoji, under 60 characters;
   - it must match the spoken first line;
   - leave curiosity open.
2. **Hashtags:** 5 at most, including #shorts. **Description:** 1–2 punchy sentences, a keyword line, the same hashtags.
3. **Caption** ends with "Comment your what-if — we make the best ones." Comments may credit viewers' ideas. No prizes, no like or subscribe requests.
4. **Schedule** (Buenos Aires time), one video per day:
   - YouTube at 20:57;
   - TikTok automatic via Metricool at 23:05;
   - Instagram at 06:35.

## 8. Quality check (mandatory, owner Nov 18)

1. **Before the full render:** `node render.mjs <scene> qa out/qa_<slug> 0.5`. It checks every half second for:
   - the camera under a floor, inside a roof or wall, or touching an object;
   - a missing floor at the bottom of the frame;
   - a missing ceiling or floor in indoor shots (the scene returns `interior: true`);
   - the main object (`focus: <Object3D>` returned from `update()`) off screen or hidden behind something.
   Look at every still it saves and fix every real problem; ignore false alarms only after looking.
2. **After the render:** `python3 qa.py videos/<file>.mp4 engine/scripts/<slug>.json "<title>"`. It checks the length, black or frozen screens, loudness, that the first line is the title, and that the last line asks for comments. It also makes contact sheets at one frame per second.
3. **Look at every sheet** and check each point:
   - floors, ceilings, roofs and walls are where they should be, with no gaps and no floating objects;
   - anything that "goes through" something visibly breaks through it;
   - no character or object clips through another;
   - every narrated claim is visible on screen at that moment ("through the ceiling" shows the ceiling breaking);
   - labels and captions don't cover faces and are spelled right (no cut-off words like "FOLD 5" for "FOLD 51");
   - the counter matches the narration;
   - Mittens visible with a readable expression in every shot;
   - the hero's face is bright.
4. **Fix and re-render the affected part.** Never queue a video that fails, and write the QA result into the queue item as `qa`.

## 9. Not approved, or on hold

- Meme-style edits (freeze-frames, sudden zooms, record scratch): on hold, to decide later.
- Random absurd cameos (the skeleton): on hold.
- Angry or swearing narrator: rejected.
- Thicker sculpted hair: proposed Nov 17, not approved; keep the current hair.

---

## Checklist before rendering

- [ ] Narrator's first line = the on-screen title question, word for word
- [ ] Next 1–2 lines explain what will happen and the physics; each step says why
- [ ] Real-world limit said plainly before the "what if" part
- [ ] `render.mjs qa` clean (or every flag checked by eye); `qa.py` clean; every sheet viewed
- [ ] Listen test passed: every line clear without the picture; every joke has a setup; one thread from start to end
- [ ] Counter escalates at every step; something new every 4 s or less
- [ ] Mittens in every shot with a readable, changing expression (Mittens cam only where she can't be in the picture)
- [ ] 2–3 cast members, different from the last video
- [ ] Opening place different from the last two videos
- [ ] Bright, golden light; varied buildings; lively street
- [ ] All numbers computed and stored with their formulas
- [ ] Ending: narrator asks for ideas over the last shot, 2 s or less, no black card
- [ ] Mix log: voice-over-music 8–10 dB, voice-over-effects ≥ 14 dB; no-music copy made
