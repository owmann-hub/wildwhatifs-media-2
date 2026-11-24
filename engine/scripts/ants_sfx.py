"""Procedural sounds for the 'ants' episode: crawling rustle bed (grows with the pile), tiny doubling blip, birthday-cake 'ta-da' plink.
usage: python3 scripts/ants_sfx.py  (writes audio/ants_*.wav)"""
import numpy as np, soundfile as sf
from scipy import signal
SR = 44100; rng = np.random.default_rng(2411)
def bp(x, f1, f2): b, a = signal.butter(2, [f1 / (SR / 2), f2 / (SR / 2)], 'band'); return signal.lfilter(b, a, x)
def norm(x, g=0.7): return x / (np.abs(x).max() + 1e-9) * g
def rustle(dur=15.0):  # thousands of tiny legs: dense clicks + soft hiss, swelling over time
    n = int(dur * SR); t = np.arange(n) / SR; clicks = (rng.random(n) > 0.996) * rng.standard_normal(n)
    x = bp(clicks, 2500, 9000) * 2 + bp(rng.standard_normal(n), 3000, 8000) * 0.25
    return norm(x * (0.25 + 0.75 * (t / dur) ** 1.5), 0.6)
def blip():
    n = int(0.08 * SR); t = np.arange(n) / SR; f = 1400 + 1600 * t / 0.08
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 45), 0.5)
def tada():
    n = int(0.9 * SR); x = np.zeros(n)
    for s, f in ((0.0, 784), (0.09, 988), (0.18, 1175)): i = int(s * SR); tt = np.arange(n - i) / SR; x[i:] += np.sin(2 * np.pi * f * tt) * np.exp(-tt * 6) * 0.4
    return norm(x, 0.55)
for nm, fn in (('rustle', rustle), ('blip', blip), ('tada', tada)): sf.write(f'audio/ants_{nm}.wav', fn(), SR)
print('ok')
