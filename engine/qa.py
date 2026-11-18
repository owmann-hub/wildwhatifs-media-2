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
if not 50 <= dur <= 65.5: issues.append(f'duration {dur:.1f}s is outside 50-65 s')
bl = run(f'ffmpeg -i "{vid}" -vf blackdetect=d=0.4:pix_th=0.06 -an -f null - 2>&1').stdout + run(f'ffmpeg -i "{vid}" -vf blackdetect=d=0.4:pix_th=0.06 -an -f null - 2>&1').stderr
for m in re.finditer(r'black_start:([\d.]+) black_end:([\d.]+)', bl): issues.append(f'black/dark screen {float(m[1]):.1f}-{float(m[2]):.1f}s (no black end cards; nothing dark for >0.4 s)')
fz = run(f'ffmpeg -i "{vid}" -vf freezedetect=n=0.002:d=2.5 -an -f null - 2>&1'); fz = fz.stdout + fz.stderr
for m in re.finditer(r'freeze_start: ([\d.]+)', fz): issues.append(f'picture frozen for 2.5 s+ from {float(m[1]):.1f}s (something new must happen every 4 s)')
ln = run(f'ffmpeg -i "{vid}" -af ebur128 -f null - 2>&1'); ln = ln.stdout + ln.stderr
I = re.findall(r'I:\s+(-?[\d.]+) LUFS', ln)
if I and not -17 <= float(I[-1]) <= -11: issues.append(f'loudness {I[-1]} LUFS (target about -14)')
try:
    d = json.load(open(script)); L = d if isinstance(d, list) else d.get('lines', [])
    first = (L[0]['text'] if isinstance(L[0], dict) else L[0]) if L else ''
    norm = lambda x: re.sub(r'[^a-z0-9 ]', '', x.lower()).split()
    if title and norm(first) != norm(re.sub(r'[^\w\s?!,\'-]', '', title)): issues.append(f'first narration line "{first}" is not the title question "{title}" word for word')
    last = (L[-1]['text'] if isinstance(L[-1], dict) else L[-1]) if L else ''
    if 'comment' not in last.lower(): issues.append('last narration line does not ask for comment ideas')
except Exception as e: issues.append(f'could not read script: {e}')
n = int(dur)
for k in range(0, n, 16):
    run(f'ffmpeg -y -loglevel error -ss {k} -t 16 -i "{vid}" -vf "fps=1,scale=300:-1,drawtext=text=\'%{{pts\\:hms\\:{k}}}\':x=5:y=5:fontsize=18:fontcolor=yellow:box=1:boxcolor=black,tile=8x2" "{out}/sheet_{k:03d}.jpg"')
rep = {'video': vid, 'duration': round(dur, 2), 'issues': issues, 'sheets': sorted(f for f in os.listdir(out) if f.startswith('sheet'))}
json.dump(rep, open(f'{out}/report.json', 'w'), indent=1)
print(json.dumps(rep, indent=1)); print('NOW Read every sheet image and check STANDARD.md section 9 item by item.')
