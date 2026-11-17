"""Procedural sounds for the 'paperfold' episode: paper fold (crinkle + crease snap), roof crunch, airliner fly-by, little 'cash register' ding.
usage: python3 scripts/paperfold_sfx.py  (writes audio/paperfold_*.wav)"""
import numpy as np, soundfile as sf
from scipy import signal
SR = 44100; rng = np.random.default_rng(1118)
def lp(x, f): b, a = signal.butter(2, f / (SR / 2)); return signal.lfilter(b, a, x)
def hp(x, f): b, a = signal.butter(2, f / (SR / 2), 'high'); return signal.lfilter(b, a, x)
def bp(x, f1, f2): b, a = signal.butter(2, [f1 / (SR / 2), f2 / (SR / 2)], 'band'); return signal.lfilter(b, a, x)
def fold(big=0.0):
    dur = 0.32 + 0.25 * big; n = int(dur * SR); t = np.arange(n) / SR
    crk = np.zeros(n)
    for _ in range(int(30 + 30 * big)):   # crinkles
        c = int(rng.random() * n * 0.7); m = int(0.004 * SR); crk[c:c + m] += rng.standard_normal(min(m, n - c)) * (0.3 + rng.random())
    crk = bp(crk, 1500 - 900 * big, 9000 - 5000 * big) * np.exp(-t * (6 - 3 * big))
    swish = bp(rng.standard_normal(n), 500, 4000) * np.sin(np.pi * np.minimum(1, t / (dur * 0.8))) * 0.35
    snap_t = dur * 0.75; snap = hp(rng.standard_normal(n), 2500 - 2000 * big) * np.exp(-np.maximum(0, t - snap_t) * 70) * (t > snap_t)
    thud = np.sin(2 * np.pi * (90 - 40 * big) * t) * np.exp(-np.maximum(0, t - snap_t) * 18) * (t > snap_t) * big * 1.4
    x = crk * 0.8 + swish + snap * 0.9 + thud; return x / np.abs(x).max() * 0.7
def crunch(dur=1.4):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for _ in range(60): c = int(rng.random() * n * 0.6); m = int(0.02 * SR); x[c:c + m] += bp(rng.standard_normal(m), 400, 5000)[: n - c] * rng.random()
    x = x * np.exp(-t * 2.5) + lp(rng.standard_normal(n), 200) * np.exp(-t * 4) * 1.5; return x / np.abs(x).max() * 0.7
def flyby(dur=3.6):
    n = int(dur * SR); t = np.arange(n) / SR; e = np.exp(-((t - dur * 0.55) / (dur * 0.25)) ** 2)
    x = lp(rng.standard_normal(n), 1400) * e + bp(rng.standard_normal(n), 2000, 5000) * e * 0.25; return np.tanh(x * 1.4) * 0.7
def till():
    n = int(0.8 * SR); t = np.arange(n) / SR; x = (np.sin(2 * np.pi * 1568 * t) + 0.6 * np.sin(2 * np.pi * 2093 * t)) * np.exp(-t * 6); x[: int(0.05 * SR)] += hp(rng.standard_normal(int(0.05 * SR)), 3000) * 0.4; return x / np.abs(x).max() * 0.6
for k in range(3): sf.write(f'audio/paperfold_fold{k}.wav', fold(k / 2), SR)
sf.write('audio/paperfold_crunch.wav', crunch(), SR); sf.write('audio/paperfold_flyby.wav', flyby(), SR); sf.write('audio/paperfold_till.wav', till(), SR)
print('ok')
