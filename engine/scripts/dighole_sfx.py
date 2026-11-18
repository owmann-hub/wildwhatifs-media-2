"""Procedural sounds for the 'dighole' episode: spade dig (thunk + dirt scatter), pipe burst (hiss + splash), lava rumble/bubbles, pop-out.
usage: python3 scripts/dighole_sfx.py  (writes audio/dighole_*.wav)"""
import numpy as np, soundfile as sf
from scipy import signal
SR = 44100; rng = np.random.default_rng(1119)
def lp(x, f): b, a = signal.butter(2, f / (SR / 2)); return signal.lfilter(b, a, x)
def hp(x, f): b, a = signal.butter(2, f / (SR / 2), 'high'); return signal.lfilter(b, a, x)
def bp(x, f1, f2): b, a = signal.butter(2, [f1 / (SR / 2), f2 / (SR / 2)], 'band'); return signal.lfilter(b, a, x)
def norm(x, g=0.7): return x / (np.abs(x).max() + 1e-9) * g
def dig():
    n = int(0.6 * SR); t = np.arange(n) / SR
    thunk = np.sin(2 * np.pi * (140 - 60 * t) * t) * np.exp(-t * 30) + bp(rng.standard_normal(n), 300, 2500) * np.exp(-t * 40) * 0.8
    sc = np.zeros(n)
    for _ in range(40): c = int((0.25 + rng.random() * 0.3) * SR); m = int(0.01 * SR); sc[c:c + m] += rng.standard_normal(min(m, n - c)) * rng.random()
    sc = bp(sc, 800, 6000) * 0.5
    return norm(thunk + sc)
def burst(dur=2.6):
    n = int(dur * SR); t = np.arange(n) / SR
    clank = np.sin(2 * np.pi * 620 * t) * np.exp(-t * 18) + np.sin(2 * np.pi * 1180 * t) * np.exp(-t * 25) * 0.6
    hiss = hp(rng.standard_normal(n), 2500) * np.minimum(1, t / 0.05) * np.exp(-t * 0.6) * 0.6
    spl = lp(rng.standard_normal(n), 1500) * np.minimum(1, t / 0.1) * np.exp(-t * 0.8) * 0.6
    return norm(clank * 0.6 + hiss + spl)
def lava(dur=6.0):
    n = int(dur * SR); t = np.arange(n) / SR; x = lp(rng.standard_normal(n), 140) * 2.0
    for _ in range(int(dur * 5)):
        c = int(rng.random() * (n - SR // 4)); m = int(0.12 * SR); tt = np.arange(m) / SR; f = 120 + rng.random() * 220
        x[c:c + m] += np.sin(2 * np.pi * (f + 400 * tt) * tt) * np.exp(-tt * 30) * 0.5
    e = np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.8); return norm(x * e, 0.6)
def pop():
    n = int(0.9 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (300 + 500 * t) * t) * np.exp(-t * 9) * 0.6 + bp(rng.standard_normal(n), 300, 3000) * np.exp(-t * 6) * 0.7
    return norm(x)
def baa():
    n = int(0.8 * SR); t = np.arange(n) / SR; f0 = 280 + 25 * np.sin(2 * np.pi * 7 * t)
    src = signal.sawtooth(2 * np.pi * np.cumsum(f0) / SR) * np.minimum(1, t / 0.05) * np.exp(-np.maximum(0, t - 0.5) * 8)
    x = bp(src, 500, 900) + bp(src, 1100, 1600) * 0.6 + bp(src, 2300, 2900) * 0.3
    return norm(x, 0.5)
sf.write('audio/dighole_dig.wav', dig(), SR); sf.write('audio/dighole_burst.wav', burst(), SR); sf.write('audio/dighole_lava.wav', lava(), SR)
sf.write('audio/dighole_pop.wav', pop(), SR); sf.write('audio/dighole_baa.wav', baa(), SR)
print('ok')
