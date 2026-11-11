"""Procedural sound design + VO mix. usage: python3 mix.py cue.json out.wav"""
import json, sys, numpy as np, soundfile as sf
from scipy import signal

SR = 44100
cue = json.load(open(sys.argv[1]))
T = cue["total"]; N = int(T * SR)
rng = np.random.default_rng(3)
import music2
mus = np.zeros((N, 2)); sfx = np.zeros((N, 2)); vo = np.zeros(N)

def place(buf, x, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= len(buf): return
    x = x[: len(buf) - i]
    if buf.ndim == 2:
        if x.ndim == 1:
            l, r = np.sqrt(0.5 * (1 - pan)), np.sqrt(0.5 * (1 + pan))
            buf[i:i + len(x), 0] += x * gain * l * 1.41; buf[i:i + len(x), 1] += x * gain * r * 1.41
        else: buf[i:i + len(x)] += x * gain
    else: buf[i:i + len(x)] += x * gain

def env(n, a, d):
    e = np.ones(n); ai = int(a * SR); di = int(d * SR)
    if ai: e[:ai] = np.linspace(0, 1, ai)
    if di: e[-di:] *= np.linspace(1, 0, di) ** 2
    return e

def lp(x, f, o=2): b, a = signal.butter(o, min(f, SR / 2 - 100) / (SR / 2)); return signal.lfilter(b, a, x)
def hp(x, f, o=2): b, a = signal.butter(o, f / (SR / 2), 'high'); return signal.lfilter(b, a, x)
def bp(x, f1, f2): b, a = signal.butter(2, [f1 / (SR / 2), f2 / (SR / 2)], 'band'); return signal.lfilter(b, a, x)

def boom(dur=1.6, f0=70, f1=28):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 6); ph = 2 * np.pi * np.cumsum(f) / SR
    sub = np.sin(ph) * np.exp(-t * 2.2)
    nz = lp(rng.standard_normal(n), 900) * np.exp(-t * 7) * 0.6
    x = np.tanh((sub + nz) * 1.6); return x * env(n, 0.003, 0.3)
def whoosh(dur=0.7, up=True):
    n = int(dur * SR); t = np.arange(n) / SR; x = rng.standard_normal(n)
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    hi = bp(x, 1200, 6000) * (t / dur) ; lo = bp(x, 150, 1200) * (1 - t / dur)
    return (hi + lo * 1.3) * e * 1.6
def riser(dur=4.0):
    n = int(dur * SR); t = np.arange(n) / SR; u = t / dur
    f = 110 * 2 ** (u * 2.5); ph = 2 * np.pi * np.cumsum(f) / SR
    tone = (np.sin(ph) + 0.5 * np.sin(2 * ph + 0.3) + 0.3 * np.sin(3.01 * ph)) * 0.25
    nz = hp(rng.standard_normal(n), 2000) * 0.15
    return (tone + nz) * u ** 2.2
def tick(f=2200):
    n = int(0.05 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 120) + rng.standard_normal(n) * np.exp(-t * 300) * 0.3) * 0.5
def ding(f=880, dur=1.5):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 4)) * np.exp(-t * 3) * 0.5
def impact(dur=0.5):
    n = int(dur * SR); t = np.arange(n) / SR
    x = lp(rng.standard_normal(n), 2500) * np.exp(-t * 14) + np.sin(2 * np.pi * 90 * t) * np.exp(-t * 10)
    return np.tanh(x * 2) * 0.8
def sizzle(dur=2.0):
    n = int(dur * SR); x = hp(rng.standard_normal(n), 3000) * 0.4
    crack = (rng.random(n) > 0.9993) * rng.standard_normal(n) * 3
    return (x + lp(crack, 6000)) * env(n, 0.2, 0.5)
def glass(dur=1.2):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for k in range(40):
        st = int(rng.random() * 0.6 * SR); f = 2500 + rng.random() * 5000; m = n - st; tt = np.arange(m) / SR
        x[st:] += np.sin(2 * np.pi * f * tt) * np.exp(-tt * (30 + rng.random() * 40)) * 0.25
    return x + hp(rng.standard_normal(n), 4000) * np.exp(-t * 6) * 0.5
def rumble(dur):
    n = int(dur * SR); return lp(rng.standard_normal(n), 120, 4) * 3.0 * env(n, 0.5, 0.8)

# ---------- music bed: pad drone + pulse, intensity curve ----------
def music(start, end, key=45, ints=None, bpm=100):
    n = int((end - start) * SR); t = np.arange(n) / SR
    I = np.interp(t + start, [p[0] for p in ints], [p[1] for p in ints])
    notes = [key, key + 7, key + 12, key + 15, key + 19]
    pad = np.zeros(n)
    for j, m in enumerate(notes):
        f = 440 * 2 ** ((m - 69) / 12)
        for d in (-0.12, 0.0, 0.11):
            ph = rng.random() * 6.28
            pad += signal.sawtooth(2 * np.pi * f * (1 + d / 100) * t + ph) * (0.5 if j < 2 else 0.25)
    # moving low-pass via chunked filtering
    out = np.zeros(n); seg = 2048; zi = None
    for k in range(0, n, seg):
        fc = 300 + 2600 * I[k]; b, a = signal.butter(2, fc / (SR / 2))
        if zi is None: zi = signal.lfilter_zi(b, a) * 0
        out[k:k + seg], zi = signal.lfilter(b, a, pad[k:k + seg], zi=zi)
    out *= 0.05
    # pulse: sub kick on beats + hat
    beat = 60 / bpm; kick = np.zeros(n); hat = np.zeros(n)
    kn = int(0.35 * SR); kt = np.arange(kn) / SR
    ks = np.sin(2 * np.pi * np.cumsum(45 + 90 * np.exp(-kt * 30)) / SR) * np.exp(-kt * 9)
    hn = int(0.04 * SR); hs = hp(rng.standard_normal(hn), 7000) * np.exp(-np.arange(hn) / SR * 90)
    b = 0.0
    while b < end - start:
        i = int(b * SR); amp = I[min(i, n - 1)]
        if amp > 0.25:
            seg_ = ks[: n - i]; kick[i:i + len(seg_)] += seg_ * 0.5 * amp
        hi = int((b + beat / 2) * SR)
        if amp > 0.45 and hi < n:
            seg_ = hs[: n - hi]; hat[hi:hi + len(seg_)] += seg_ * 0.25 * amp
        b += beat
    x = out * (0.4 + 0.6 * I) + kick + hat
    st = np.stack([x, x], 1); st[:, 1] = np.roll(st[:, 1], 300)  # tiny width
    return st

for ev in cue["events"]:
    k = ev["type"]; t = ev["t"] if "t" in ev else 0; g = ev.get("gain", 1.0); p = ev.get("pan", 0)
    if k == "vo":
        x, sr = sf.read(ev["file"]); x = x if x.ndim == 1 else x.mean(1)
        if sr != SR: x = signal.resample_poly(x, SR, sr)
        place(vo, x, t, g)
    elif k == "music": place(mus, music(ev["start"], ev["end"], ev.get("key", 45), ev["ints"], ev.get("bpm", 100)), ev["start"], g)
    elif k == "song": place(mus, music2.song(ev["start"], ev["end"], ev.get("key", 57), ev.get("bpm", 112), ev["ints"]), ev["start"], g)
    elif k == "amb":
        x = music2.amb(ev["kind"], ev["end"] - ev["start"]); f = int(min(1.0, (ev["end"] - ev["start"]) / 3) * SR)
        x[:f] *= np.linspace(0, 1, f); x[-f:] *= np.linspace(1, 0, f); place(sfx, x, ev["start"], g)
    elif k == "boom": place(sfx, boom(ev.get("dur", 1.6)), t, g, p)
    elif k == "whoosh": place(sfx, whoosh(ev.get("dur", 0.7)), t - ev.get("dur", 0.7) * 0.6, g, p)
    elif k == "riser": place(sfx, riser(ev["dur"]), t - ev["dur"], g, p)
    elif k == "tick": place(sfx, tick(ev.get("f", 2200)), t, g, p)
    elif k == "ding": place(sfx, ding(ev.get("f", 880)), t, g, p)
    elif k == "impact": place(sfx, impact(), t, g, p)
    elif k == "sizzle": place(sfx, sizzle(ev.get("dur", 2.0)), t, g, p)
    elif k == "glass": place(sfx, glass(), t, g, p)
    elif k == "rumble": place(sfx, rumble(ev["dur"]), t, g, p)
    elif k == "file":
        x, sr = sf.read(ev["file"]); x = x if x.ndim == 1 else x.mean(1)
        if sr != SR: x = signal.resample_poly(x, SR, sr)
        place(sfx, x, t, g, p)
    elif k == "mute":  # silence the music for a beat
        a, b = int(ev["start"] * SR), int(ev["end"] * SR); f = int(0.08 * SR)
        m = np.ones(N); m[a:b] = 0; m[max(0, a - f):a] = np.linspace(1, 0, min(f, a)); m[b:b + f] = np.linspace(0, 1, len(m[b:b + f]))
        mus *= m[:, None]

# duck music AND effects/ambience under the narrator (owner, Nov 11: secondary sounds were drowning the voice)
ve = np.abs(vo); ve = lp(ve, 5); ve = ve / (ve.max() + 1e-9)
act = np.clip(ve * 5, 0, 1)
mus *= (1 - 0.78 * act)[:, None]
sfx *= (1 - 0.62 * act)[:, None]
vo_st = np.stack([vo, vo], 1)
# light voice EQ: presence lift
vo_st = vo_st + 0.25 * np.stack([hp(vo, 3000), hp(vo, 3000)], 1)
bed = mus * cue.get("music_gain", 0.3) + sfx * cue.get("sfx_gain", 0.4)
# clarity check: narrator must sit at least 14 dB above everything else while speaking
m_ = act > 0.5
if m_.any():
    rv = np.sqrt((vo_st[m_] ** 2).mean()); rb = np.sqrt((bed[m_] ** 2).mean()) + 1e-9; margin = 20 * np.log10(rv / rb)
    if margin < 14: bed *= 10 ** ((margin - 14) / 20); margin = 14.0
    print("voice-over-bed margin dB:", round(float(margin), 1))
mix = vo_st * 1.0 + bed
mix = np.tanh(mix * 0.9) / 0.9
mix /= np.abs(mix).max() + 1e-9; mix *= 0.89
sf.write(sys.argv[2], mix, SR)
print("wrote", sys.argv[2], round(T, 2), "s")
