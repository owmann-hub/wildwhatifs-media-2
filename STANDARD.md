# Wild What Ifs — Official Video Standard

The owner's corrections, collected in one place (last updated Nov 26, 2026).
**Every new video must follow this list.** It overrides older rules in PIPELINE.md and state.json
(`format_v4`, `hook_rules`, `visual_rules`, and the older entries of `format_v5.rules`) wherever they disagree.
Before rendering, go through the checklist at the bottom.

---

## ★ REWARDING, CALM, SIMPLE (owner, Nov 26: this comes first and overrides anything below that disagrees)

Model: polystoriesdaily "What would happen if your speed doubled every minute?" (113 s, and people still watch to the end). The owner: "the whole point is to make a video so good that it doesn't matter how long it is, people still stay."

1. **Calm opening.** The first ~4 seconds show only the hero (and Mittens) in the everyday place, plus the title, and the narrator saying the question. No counter yet, no labels, no meme effect, nothing else.
2. **Every step is a reward you SEE happen.** Each step puts the hero against or next to something real at that exact scale, and something happens between them:
   - he races the dog, then the cars, then the bullet train, then a jet;
   - the bubble swallows the lamp, then the bus, then the stadium.
   Not just a label beside the object; a moment with an action and a reaction. Each step must be more impressive than the last.
   **What "rewarding" means** (owner, Nov 26, about the "Earth spins faster" video): show the CONSEQUENCES happening to normal, everyday things, big and visible:
   - cups, chairs, cars and people sliding or flying around;
   - water lifting out of the sea, pools and glasses and floating;
   - planes struggling, turning back or being thrown off course;
   - trees bending, roofs ripping off, buildings and whole cities breaking apart;
   - each step a bigger, more spectacular disaster than the last.
   A number going up is not a reward. Seeing what that number DOES to the world is. Every step must show at least one of these moments clearly, with the hero and Mittens reacting.
3. **Steady pace:** about 4–5 seconds per step, one short sentence per step (in the caption and spoken by the narrator). Never rushed, never nerve-wracking.
4. **Halfway twist** (around the middle): something resets or changes the race. A rival joins with their own counter, the rules flip, or it starts again in a new place. Then a second climb, bigger than the first, all the way to the end.
5. **No length limit.** Any length is fine (40–120 s) as long as every step pays off. Cut any step that isn't a reward.
6. **Very little on screen:**
   - the hero and the thing he is up against;
   - one big number with a small label under it;
   - one caption line.
   Nothing else: no gauge lines, no landmark boxes, no "NEXT" lines, no extra tags.
7. **Mittens circle** (the round close-up): only once in a while, 2–3 times per video at the funniest moments. Mittens can be in the scene itself whenever it fits.
9. **One "boom zoom" per video** (owner, Nov 27): at ONE specific moment that deserves an exaggerated reaction, a sudden zoom onto Mittens' (or the hero's) shocked or deadpan face, with our own deep boom sound (`snapzoom` in mix.py), held about 0.5–0.8 s, then straight back to the action. Never the real "vine boom" file or any downloaded meme sound.
8. **One trend or meme nod per video** (owner, Nov 27: "stuff related to memes or stuff that's going on… that will get people talking in the comments"). Put one light, recognisable reference to something people are talking about into a step or a background gag, made by us. Examples:
   - Mittens playing chess like the famous unbeatable chess-bot cat (no chess.com logo or character design, only the idea);
   - a viral dance, a trending sound idea, a big game or sports moment, a famous internet joke.
   Never: wars, attacks, disasters, deaths, terrorism, elections or other political fights (owner asked about the US–Iran war; declined because it's a real war with real victims, it limits ads on YouTube and it splits the comments). Generic military things are fine as scale steps without naming a real conflict ("faster than a fighter jet"). No real people's faces or names, no copyrighted characters, logos or songs. Check that the trend is current when the video is made.

---

## 0. REALLY, REALLY CLEAR (owner, Nov 20; this comes before everything else)

Model: the viral "folds to cross the universe" reel (30 s, 175K likes, 14.7K shares). It won by being impossible to misunderstand. Every video must pass these tests:

1. **The pause test.** Pause on ANY frame. A stranger with the sound off must be able to say, in under one second:
   - what the thing is;
   - how big, far, deep, hot or old it is right now;
   - what it just passed.
   If any frame fails, fix that frame.
2. **The listen test.** With eyes closed, the narration alone tells the whole story (section 2).
3. **One focus object, always visible.** The object of the "what if" (the paper stack, the hole, Mittens, the snowball) stays near the centre of the frame and is never hidden, cropped or lost. The camera follows it smoothly; no cuts during the climb.
4. **Counter:** one big number with a small label (see ★.6). The gauge graphics are removed (owner, Nov 26).
5. **Size is shown, not told:** see ★.2. The real object is IN the scene with the hero at the right scale, and something happens between them. No label boxes.
6–8. (Replaced by ★.3–★.6 on Nov 26: steady 4–5 s steps, no clean/fast 'big part', minimal text.)
9. **Real numbers only,** computed and checked (section 2.9).
10. **Physics chain with real thresholds** (owner, Nov 20; model: the "body temperature doubled every 3 seconds" reel). Every milestone is a real number paired with what really happens at that number, shown right where the viewer is looking: 100 °C coffee boils, 233 °C paper catches fire, steel melts, hotter than the Sun's surface. The viewer learns the physics just by watching. Facts must be correct, and the caption says it in 3–5 words ("Hot coffee… then boiling").
11. (Removed Nov 26: no "NEXT" line, the screen stays simple.)
12. **Consequences start next to the hero, then spread.** First the things in his hands and on him (the cup, his clothes, the snow at his feet), then the street, then the city, then the planet. Never jump to something far away that the viewer hasn't seen connected to him.
13. **The rule in the title.** When there is a rate, the title says it ("…doubled every 3 seconds?"), so the viewer can predict what's next.
14. **Opening wish + callback ending.** The first line after the title gives a small wish or problem ("−10 °C. You just want to be warm."), and the last line before the comment question pays it off ("Well. You're not cold anymore.").
15. **It never stops, and the end is the biggest part** (owner, Nov 20: the snowball video "died really really fast, it should have kept going"; it stopped growing at Moon size and the last 6 s were a frozen picture with the counter stuck). The premise says "never stops", so the counter climbs until the very last frame, and the last milestone is the biggest and most surprising of the video. Go as far as the idea allows: past the Moon, Earth, Jupiter, the Sun, the Solar System, the galaxy. The payoff line and the comment question are said WHILE it is still growing and the camera still pulling back, never over a still picture. The last 5 s must change at least as fast as the middle. The final image is the most absurd one (e.g. "Bigger than the Sun. Mittens is still on top."), then it loops.

---

## 1. Structure

1. **Runaway format.** The premise is a process that never stops and keeps multiplying ("you fold paper and never stop", "every jump is twice as high"), not "X for 5 seconds".
2. **Length:** no fixed limit (see ★.5).
2b. (Removed Nov 26: the meme opening is replaced by the calm opening in ★.1.)
3. **Say the "what if" the same way every time, from the very first frame.** The title is on screen from frame 0 (over the payoff opening too), and the narrator starts saying it at second 0, word for word ("What if you folded a piece of paper and never stopped?"). Context must never wait until after the opening: delaying it raises the skip rate (owner's hook-method reference, Nov 20). Every video, no exceptions.
3b. **Triple hook in the first ~6 seconds** (from Kallaway's "Triple Hook Method", owner Nov 20):
   - **Context (0–2 s):** the viewer knows the topic instantly, through all three channels at once: audio (the narrator says the question), visuals (the object and the hero are clearly visible) and text (the title).
   - **Lean (2–4 s):** something that makes them curious in one direction: a surprising real number, a proof, or something shocking ("Normal paper stops at about 7 folds.").
   - **Snapback (4–6 s):** a contrarian twist that pulls them the other way ("But keep going, and by fold 42 you reach the Moon."). The video then delivers on that twist.
   QA asks three questions about the first 6 seconds: is the context clear in the first second? Is there a curiosity pull? Is there a snapback?
4. **Explain before it happens** (owner, Nov 18: the jump and friction videos were unclear until the thing happened). Right after the title question, 1–2 plain lines say what is about to happen and the physics behind it, e.g. "Friction is the grip that stops things from sliding. Shoes, tyres, even knots need it." At every step, say *why* it happens, not just what ("No friction, so the knot can't hold. It just slides open.").
5. **Start small and human:** the hero in an everyday place doing an everyday thing, with a small stake (an unpaid bill, an ice cream). The process starts by second 3.
6. **Steps:** about 4–5 s each (see ★.3), each one a visible reward (★.2), with a twist halfway (★.4).
7. **Escalating counter:** one big number (★.6) that rolls up at each step; its unit escalates (mm → m → km → "past the Moon").
8. **Scale change:** room → street → city → country → planet → space, in one continuous camera move.
9. **Ending:** no black end card. The last shot stays on screen while the narrator asks **one specific question about this video that viewers can answer with their own guess or opinion** (owner, Nov 19), e.g. "How many folds do you think you could do?", "How deep would you dig before turning back?". The same question appears as small text over that shot. Never use the generic "What should we try next?". Total ending 2 s or less after the payoff. Shorts just end; no outro.
10. **Loop ending** (owner, Nov 20): the very last frame matches the very first frame of the video (the same shot as the opening), so when the Short replays it flows straight into the start and people rewatch without noticing.

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
3. **Mittens = the friend (Mittens is a he), in every shot with a visible expression** (owner, Nov 18):
   - Mittens is in the scene itself in every shot, near the hero. **Even when she's small in the background, she must be visibly expressive**, never a still prop:
     - exaggerate so it reads at a distance: big eye and eyelid changes, ears flat or up, tail puffing, a jump back, a slow unimpressed head turn, a yawn;
     - she reacts within about half a second of every event;
   - she changes expression at every step (`setCatFace(cat, mood)` + `catLife(cat, t)` on the in-scene cat: unimpressed, annoyed, shock, smug, sleepy, happy, scared), with ears, tail and eyes always moving a little;
   - she is fine and mildly annoyed whatever happens;
   - **occasional gag (owner, Nov 27): Mittens the smug chess genius**, a nod to the famous unbeatable chess-bot cat. Use it in about 1 video out of 3, not every video; the rest of the time Mittens is a normal cat. When used, he keeps playing (and winning) even in the middle of the disaster. Our own cat design only: no chess.com logo, and never a recreation of the chess.com Mittens picture.
   - the **Mittens cam** (round close-up) is optional: 2–3 times per video at most, at the funniest moments (owner, Nov 26).
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
   - the gauge and counter (see 0.4);
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
3. **Caption** ends with the same specific question as the narrator's last line (e.g. "How many folds could you do? 👇"). Comments may credit viewers' ideas. No prizes, no like or subscribe requests.
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

- Meme-style edits in the middle of the video: only the one boom zoom (★.9); the others are still on hold.
- Random absurd cameos (the skeleton): on hold.
- Angry or swearing narrator: rejected.
- Thicker sculpted hair: proposed Nov 17, not approved; keep the current hair.

---

## Checklist before rendering

- [ ] Narrator's first line = the on-screen title question, word for word, starting at 0 s with the title on screen from frame 0
- [ ] Triple hook: context by 2 s, lean by 4 s, snapback by 6 s
- [ ] Next 1–2 lines explain what will happen and the physics; each step says why
- [ ] Real-world limit said plainly before the "what if" part
- [ ] `render.mjs qa` clean (or every flag checked by eye); `qa.py` clean; every sheet viewed
- [ ] Listen test passed: every line clear without the picture; every joke has a setup; one thread from start to end
- [ ] Pause test passed on the sheets: every frame shows what it is, how big it is now, and what it just passed
- [ ] Every milestone = a real threshold + what really happens there
- [ ] Rate stated in the title when there is one; opening wish paid off at the end
- [ ] Last frame matches the first frame (loop)
- [ ] Counter still climbing in the last frame; the last milestone is the biggest; nothing static in the last 5 s
- [ ] Mittens in every shot where he fits, with a readable, changing expression; Mittens circle 2–3 times at most
- [ ] 2–3 cast members, different from the last video
- [ ] Opening place different from the last two videos
- [ ] Bright, golden light; varied buildings; lively street
- [ ] All numbers computed and stored with their formulas
- [ ] Calm opening: only hero, Mittens and title for ~4 s
- [ ] One trend/meme nod (not war, politics, disasters or tragedy)
- [ ] Every step is a visible reward: everyday things visibly affected (flying, floating, breaking), each bigger than the last; ~4–5 s per step; twist halfway
- [ ] On screen only: hero + thing, one big number, one caption; Mittens circle 2–3 times at most
- [ ] Ending: narrator asks one specific answerable question over the last shot, 2 s or less, no black card
- [ ] Mix log: voice-over-music 8–10 dB, voice-over-effects ≥ 14 dB; no-music copy made
