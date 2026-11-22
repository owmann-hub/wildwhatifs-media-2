"""Procedural sounds for the 'rain' episode: heavy rain bed, splash (jump into the boat), cash register (buying the umbrella),
umbrella pop, glug (a landmark goes under). usage: python3 scripts/rain_sfx.py  (writes audio/rain_*.wav)"""
import numpy as np, soundfile as sf
from scipy import signal
SR = 44100; rng = np.random.default_rng(2211)
def lp(x, f): b, a = signal.butter(2, f / (SR / 2)); return signal.lfilter(b, a, x)
def bp(x, f1, f2): b, a = signal.butter(2, [f1 / (SR / 2), f2 / (SR / 2)], 'band'); return signal.lfilter(b, a, x)
def norm(x, g=0.7): return x / (np.abs(x).max() + 1e-9) * g
def rainbed(dur=36.0):  # dense hiss + random droplet ticks
    n = int(dur * SR); x = bp(rng.standard_normal(n), 800, 9000) * 0.5 + lp(rng.standard_normal(n), 400) * 0.4
    drops = (rng.random(n) > 0.9985) * rng.standard_normal(n); x += bp(drops, 2000, 7000) * 2.5
    return norm(x, 0.6)
def splash():
    n = int(0.9 * SR); t = np.arange(n) / SR; x = bp(rng.standard_normal(n), 300, 5000) * np.exp(-t * 7) * np.minimum(1, t / 0.01)
    return norm(x + np.sin(2 * np.pi * 120 * t) * np.exp(-t * 12) * 0.6, 0.7)
def chaching():
    n = int(0.9 * SR); t = np.arange(n) / SR; x = bp(rng.standard_normal(n), 2000, 8000) * np.exp(-t * 40) * 0.6
    for s, f in ((0.08, 2093), (0.08, 2637), (0.08, 3136)): i = int(s * SR); tt = np.arange(n - i) / SR; x[i:] += np.sin(2 * np.pi * f * tt) * np.exp(-tt * 5) * 0.35
    return norm(x, 0.6)
def umbpop():
    n = int(0.35 * SR); t = np.arange(n) / SR; f = 300 + 900 * t / 0.35
    return norm(bp(rng.standard_normal(n), 600, 4000) * np.exp(-t * 10) + np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14) * 0.5, 0.6)
def glug():
    n = int(0.6 * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for k, s in enumerate((0.0, 0.14, 0.27)): i = int(s * SR); tt = np.arange(n - i) / SR; f = 180 + 500 * tt; x[i:] += np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 18) * (1 - k * 0.2)
    return norm(x, 0.7)
for nm, fn in (('rainbed', rainbed), ('splash', splash), ('chaching', chaching), ('umbpop', umbpop), ('glug', glug)): sf.write(f'audio/rain_{nm}.wav', fn(), SR)
print('ok')
