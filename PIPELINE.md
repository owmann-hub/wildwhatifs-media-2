# Wild What Ifs — automated pipeline (read this first in every scheduled run)

Owner's standing instruction: produce and publish one "What if" Short per day on YouTube, Instagram and TikTok
without asking them. Never publish a video that failed the quality check; skip the day instead and note why in state.json.

## Repo layout
- `state.json` — the queue of videos, per-platform status, account IDs, premise bank, Metricool monthly count. ALWAYS update and push it after any action.
- `videos/` — finished mp4s (H.264, ≤ 40 MB). Public raw URL:
  `https://raw.githubusercontent.com/owmann-hub/wildwhatifs-media-2/main/<file>`
- `engine/` — the three.js + Playwright renderer, Kokoro TTS, sound mixer and caption burner used for the first 3 videos.

## Accounts / tools
- YouTube: Zapier action `youtube_upload_video` (selected_api `YouTubeV4CLIAPI`), connection_id in state.json. Publishes immediately → only call it in the 21:00 run.
- TikTok: Metricool `createScheduledPost`, blogId 7970179, network `tiktok`, `isAigc: true`, autoPublish true, at 23:05 Buenos Aires.
  Free plan = 20 posts per calendar month: check `metricool.posts_used`; if 20 reached, skip TikTok for that video (mark `skipped_quota`).
- Instagram: vidIQ `vidiq_video_upload` (url = raw GitHub URL) → `vidiq_instagram_publish_reel` with platformAccountId from state.json,
  caption = caption + "\n\n" + hashtags, `isAiGenerated: true`. Poll/continue as the tool describes until PUBLISHED.
- vidIQ credit budget: ≤ 10 credits per production run (150/month plan).

## Production run (one new video per day, keep the queue 2 days ahead)
1. Clone this repo. If fewer than 2 queue items have youtube.status == "pending", make a new video dated the day after the last post_date.
2. Use the `plan_november` entry whose post_date is the next unfilled date (follow its premise and notes; mark it made). If there is no plan entry, pick from `premise_bank`. Read `style_notes` and apply them. Never repeat a made premise.
   Build the video in the style named by the plan entry's `style` (definitions in state.json `styles`); "WINNER" means use `style_test.winner` (fall back to A_explainer if none). Save the style on the queue item.
   If `plan_november[*].tiktok` is false for that date, set the item's tiktok status to "skipped_quota" when queueing it.
3. Script — FIRST read state.json `format_v5` (owner-approved Nov 11, THE CURRENT STANDARD, template engine/scenes/sun.js; it overrides everything older, including the lengths and cold-open rules mentioned below). Older: state.json `format_v4` (owner-approved Nov 10; it overrides older rules where they conflict: world-scale '…for 5 seconds' premise, countdown counter, 3 s hook + 'N seconds earlier' card, 25–30 s, one locked look based on engine/scenes/nyc.js, little text). Older `hook_rules` (Nov 9): 30–38 s, cold open on the most extreme moment, hook line ≤ 2 s, looping ending, closing question. Then: hook in first 2 s, live counter that drives the story, 6–8 escalating beats with scale changes (street → city → planet/space),
   a human/funny angle in every beat, an open loop paid off at the end, close teasing part 2. ~2.6 spoken words/s. Fact-check numbers with a web search.
4. Engine setup: `cd engine && npm i three@0.170 playwright@1.63`; Chrome at /usr/bin/google-chrome (else `npx playwright install chromium` and change executablePath);
   `pip install --break-system-packages kokoro-onnx soundfile scipy`; download `kokoro-v1.0.onnx` and `voices-v1.0.bin` from
   https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/ into engine/models/.
5. Voice: `python3 tts.py <slug> af_heart 1.1` (script JSON in engine/scripts/<slug>.json). Time every beat from the real line durations.
6. Write a NEW scene module `engine/scenes/<slug>.js`. FOLLOW state.json `visual_rules` (owner-approved Nov 9) and copy patterns from `engine/scenes/sneeze3.js` and `engine/scenes/heat3.js` (title in/out, POV start/end, crowd, traffic, Mittens, heat fronts, side counter with place/time):
   setFace()+life() on every character every frame, a reacting side character with speech bubbles (drawBubble), expanding waves via makeShockwave()+makeSuburb().wave() instead of beams/flashes,
   makeSuburb() for any town seen from above, drawSideCounter() for the numbers (never the old centre drawCounter box). Other helpers: makePerson, makeVoxelHouse, makeEarth, makeBurst, makeSkyDome, drawTitle, drawCaption.
   Vary setting, colours, character and camera from previous episodes (YouTube penalises templated, mass-produced content).
7. Stills first: `W=540 H=960 ./sheet.sh <slug> t1,t2,...` → LOOK at the contact sheet; fix blown-out frames, subjects hidden behind the HUD (top 35 %),
   camera inside objects, empty frames. Iterate until every beat reads clearly.
8. Full render at 720x1280: `W=720 H=1280 node render.mjs <slug> video ../videos/tmp.mp4 0 <TOTAL> 30` (≈25–30 min; run in background and poll).
9. Sound: write scripts/<slug>_cue.json (copy scripts/sneeze_cue2.json: a `song` event with an intensity curve + `amb` beds per location, music_gain 0.38) → `python3 mix.py cue out.wav`;
   also mix a no-music version (music_gain 0) → `videos/<yyyy-mm-dd>-<slug>-nomusic.mp4` for the owner's manual TikTok posts (they add a trending sound in-app); captions: `python3 captions.py <slug>`;
   final: ffmpeg burn `ass=` + mux audio with loudnorm I=-14, then re-encode CRF 23 maxrate 7M to `videos/<yyyy-mm-dd>-<slug>.mp4`.
10. QA: grab 8 frames from the final mp4 and look at them; check duration 45–55 s, the opening is the calm scene with title + countdown, the end card is present, audio present (volumedetect max ≈ -1 dB).
11. Commit + push the mp4, the new scene/script files and the updated state.json (append queue item with title, caption, hashtags, due times).

## Publishing runs
- 06:35 run: Instagram for every queue item whose instagram.status == "pending" and due ≤ now.
- 20:57 run: YouTube (title + " #shorts", description = caption + "\n\nAnimated · AI voice\n\n" + hashtags + " #shorts", public, not made for kids)
  for the item whose post_date == today; then schedule its TikTok at 23:05 today via Metricool (title as tiktokData.title, text = title + caption + hashtags).
- After posting: set status "posted"/"scheduled" with IDs, increment metricool.posts_used[YYYY-MM], commit + push state.json.
- If a tool errors: do not retry in a loop; mark status "error: <message>" and continue with the other platforms.

## Housekeeping
- Delete mp4s from videos/ once all three platforms are posted for more than 3 days.
- If `.git` grows above 800 MB, recreate history: orphan branch with current files, force-push main.

## Manual fallback (owner's request, Nov 8)
The owner wants all ~30 posts a month on every platform. Whenever a platform can't be posted automatically
(Metricool quota reached, a Sunday TikTok marked skipped_quota, or any tool error), the run's final message —
which arrives on the owner's phone — must START with "📲 Your turn — post on <platform>", followed by the raw
video download link, title, caption + hashtags and the AI-label reminder. Mark the status "manual_requested".
Keep that mp4 for at least 7 days.
For TikTok, if the queue item has `file_tiktok` (the no-music version), give THAT link and add the line
"Add a trending sound in TikTok at ~15–20% volume (voice must stay clear)".
