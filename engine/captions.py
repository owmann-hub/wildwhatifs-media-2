"""Build word-by-word ASS captions from cue (vo events) + script text. usage: captions.py name"""
import json, sys, re, soundfile as sf
name = sys.argv[1]
lines = {L['id']: L['text'] for L in json.load(open(f'scripts/{name}.json'))}
if name == 'sneeze': lines['pay'] = 'And somewhere, very far away, someone whispers...'
cue = json.load(open(f'scripts/{name}_cue.json'))
def ts(t): h=int(t//3600); m=int(t%3600//60); s=t%60; return f"{h}:{m:02d}:{s:05.2f}"
hdr = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: W,Inter Display Black,86,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,-1,0,0,0,100,100,0,0,1,7,4,5,40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
ev = []
Y = 1123
for e in cue['events']:
    if e['type'] != 'vo': continue
    m = re.search(rf'audio/{name}_(\w+)\.wav', e['file'])
    if not m: continue
    lid = m.group(1); text = lines[lid].replace('T N T', 'TNT')
    dur = sf.info(e['file']).duration
    words = text.split()
    # weights: letters + pauses after punctuation
    w = []
    for wd in words:
        base = len(re.sub(r'[^A-Za-z0-9]', '', wd)) + 2.5
        pause = 6 if wd.endswith('...') else (3.5 if wd[-1] in '.?!' else (2 if wd[-1] in ',:' else 0))
        w.append((base, pause))
    lead, tail = 0.12, 0.15
    total = sum(a + b for a, b in w); span = dur - lead - tail
    t = e['t'] + lead
    for i, (wd, (a, b)) in enumerate(zip(words, w)):
        d_word = span * a / total; d_pause = span * b / total
        st, en = t, t + d_word + d_pause * 0.6
        clean = wd.strip(',').upper()
        clean = re.sub(r'[.,!]+$', '', clean)
        color = '&H003FD2FF&' if i % 3 == 0 else '&H00FFFFFF&'
        ev.append(f"Dialogue: 0,{ts(st)},{ts(en)},W,,0,0,0,,{{\\pos(540,{Y})\\c{color}\\fscx70\\fscy70\\t(0,90,\\fscx108\\fscy108)\\t(90,160,\\fscx100\\fscy100)}}{clean}")
        t += d_word + d_pause
open(f'out/{name}.ass', 'w').write(hdr + '\n'.join(ev) + '\n')
print(name, len(ev), 'words')
