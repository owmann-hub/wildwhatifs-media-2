#!/usr/bin/env python3
"""Final-video QA (owner, Nov 18: 'create a check system that does a video quality check').
usage: python3 qa.py videos/<file>.mp4 engine/scripts/<slug>.json "<title>"  -> out/qa_final_<name>/ (sheets + report.json)
Checks: duration 50-65 s; black frames; frozen stretches; loudness; first narration line == title; ending (no long dark card).
Then LOOK AT EVERY SHEET (1 frame per second, with timestamps) and go through the visual checklist in STANDARD.md section 9."""
import sys, json, re, subprocess, os
vid, script, title = sys.argv[1], sys.argv[2], (sys.argv[3] if len(sys.argv) > 3 else '')
name = os.path.splitext(os.path.basename(vid))[0]; out = f'out/qa_final_{name}'; os.makedirs(out, exist_ok=True)
run = lambda c: subprocess.run(c, shell=True, capture_output=True, text=True)
dur = float(run(f'ffprobe -v error -show_entries format=duration -of csv=p=0 "{vid}"').stdout)
issues = []
if not 30 <= dur <= 125: issues.append(f'duration {dur:.1f}s is outside 30-120 s')
bl = run(f'ffmpeg -i "{vid}" -vf blackdetect=d=0.4:pix_th=0.06 -an -f null - 2>&1').stdout + run(f'ffmpeg -i "{vid}" -vf blackdetect=d=0.4:pix_th=0.06 -an -f null - 2>&1').stderr
for m in re.finditer(r'black_start:([\d.]+) black_end:([\d.]+)', bl): issues.append(f'black/dark screen {float(m[1]):.1f}-{float(m[2]):.1f}s (no black end cards; nothing dark for >0.4 s)')
fz = run(f'ffmpeg -i "{vid}" -vf freezedetect=n=0.004:d=3.0 -an -f null - 2>&1'); fz = fz.stdout + fz.stderr
for m in re.finditer(r'freeze_start: ([\d.]+)', fz): issues.append(f'picture frozen or almost still for 3 s+ from {float(m[1]):.1f}s (something new must happen every 4-5 s)')
ln = run(f'ffmpeg -i "{vid}" -af ebur128 -f null - 2>&1'); ln = ln.stdout + ln.stderr
I = re.findall(r'I:\s+(-?[\d.]+) LUFS', ln)
if I and not -17 <= float(I[-1]) <= -11: issues.append(f'loudness {I[-1]} LUFS (target about -14)')
try:
    d = json.load(open(script)); L = d if isinstance(d, list) else d.get('lines', [])
    first = (L[0]['text'] if isinstance(L[0], dict) else L[0]) if L else ''
    norm = lambda x: re.sub(r'[^a-z0-9 ]', '', x.lower()).split()
    if title and norm(first) != norm(re.sub(r'[^\w\s?!,\'-]', '', title)): issues.append(f'first narration line "{first}" is not the title question "{title}" word for word')
    last = (L[-1]['text'] if isinstance(L[-1], dict) else L[-1]) if L else ''
    if '?' not in last: issues.append('last narration line does not ask for comment ideas')
except Exception as e: issues.append(f'could not read script: {e}')
# loop check: last frame should match the first frame of the video
run(f'ffmpeg -y -loglevel error -ss 0.05 -i "{vid}" -frames:v 1 -vf scale=90:160 "{out}/_first.png"'); run(f'ffmpeg -y -loglevel error -sseof -0.08 -i "{vid}" -frames:v 1 -vf scale=90:160 "{out}/_last.png"')
try:
    from PIL import Image; import numpy as np
    a = np.asarray(Image.open(f'{out}/_first.png').convert('RGB'), float); b = np.asarray(Image.open(f'{out}/_last.png').convert('RGB'), float)
    if np.abs(a - b).mean() > 40: issues.append(f'last frame does not match the first frame (loop) - mean difference {np.abs(a - b).mean():.0f}')
except Exception as e: issues.append(f'loop check failed: {e}')
# ending energy: the last 5 s must change as much as the middle of the video
def motion(a, b):
    r = run(f'ffmpeg -ss {a} -t {b-a} -i "{vid}" -vf "scale=90:160,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG" -an -f null - 2>&1'); r = r.stdout + r.stderr
    v = [float(x) for x in re.findall(r'YAVG=([\d.]+)', r)]; return sum(v) / max(1, len(v))
try:
    mid, end = motion(dur * 0.35, dur * 0.65), motion(max(0, dur - 5), dur - 0.1)
    if end < mid * 0.5: issues.append(f'ending is too still: motion in the last 5 s is {end:.2f} vs {mid:.2f} in the middle (the counter must keep climbing to the last frame)')
except Exception as e: issues.append(f'ending-motion check failed: {e}')
n = int(dur)
for k in range(0, n, 16):
    run(f'ffmpeg -y -loglevel error -ss {k} -t 16 -i "{vid}" -vf "fps=1,scale=300:-1,drawtext=text=\'%{{pts\\:hms\\:{k}}}\':x=5:y=5:fontsize=18:fontcolor=yellow:box=1:boxcolor=black,tile=8x2" "{out}/sheet_{k:03d}.jpg"')
rep = {'video': vid, 'duration': round(dur, 2), 'issues': issues, 'sheets': sorted(f for f in os.listdir(out) if f.startswith('sheet'))}
json.dump(rep, open(f'{out}/report.json', 'w'), indent=1)
print(json.dumps(rep, indent=1)); print('NOW Read every sheet image and check STANDARD.md section 9 item by item.')
