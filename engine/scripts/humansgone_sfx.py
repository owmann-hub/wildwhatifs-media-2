"""Procedural sounds for the 'humansgone' episode: vanish poof, chess-clock clatter, piece tap, water gush, wood creak/collapse, ice crack.
usage: python3 scripts/humansgone_sfx.py  (writes audio/humansgone_*.wav)"""
import numpy as np, soundfile as sf
from scipy import signal
SR = 44100; rng = np.random.default_rng(2111)
def lp(x, f): b, a = signal.butter(2, f / (SR / 2)); return signal.lfilter(b, a, x)
def bp(x, f1, f2): b, a = signal.butter(2, [f1 / (SR / 2), f2 / (SR / 2)], 'band'); return signal.lfilter(b, a, x)
def norm(x, g=0.7): return x / (np.abs(x).max() + 1e-9) * g
def poof():  # soft airy puff with a sparkly top (people vanishing)
    n = int(0.9 * SR); t = np.arange(n) / SR; x = bp(rng.standard_normal(n), 300, 3000) * np.exp(-t * 6) * np.minimum(1, t / 0.02)
    sp = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * (8 + k)) for k, f in enumerate((2637, 3136, 3951, 4699))) * 0.15
    return norm(x + sp, 0.7)
def clatter():  # wooden chess clock dropping on the table
    n = int(0.6 * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for s, a in ((0, 1), (0.09, 0.5), (0.15, 0.3), (0.2, 0.15)):
        i = int(s * SR); m = n - i; tt = np.arange(m) / SR; x[i:] += a * (bp(rng.standard_normal(m), 700, 4000) * np.exp(-tt * 60) + np.sin(2 * np.pi * 420 * tt) * np.exp(-tt * 40) * 0.5)
    return norm(x, 0.7)
def tap():  # chess piece placed
    n = int(0.15 * SR); t = np.arange(n) / SR
    return norm(bp(rng.standard_normal(n), 1500, 6000) * np.exp(-t * 80) + np.sin(2 * np.pi * 1200 * t) * np.exp(-t * 60) * 0.4, 0.6)
def gush(dur=2.0):  # water rushing in
    n = int(dur * SR); t = np.arange(n) / SR; x = bp(rng.standard_normal(n), 200, 2500) * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * t) ** 2)
    e = np.minimum(1, t / 0.3) * np.minimum(1, (dur - t) / 0.6); return norm(x * e, 0.6)
def collapse():  # wood creak + crumbling roofs
    n = int(1.6 * SR); t = np.arange(n) / SR; f = 180 + 60 * np.sin(2 * np.pi * 1.3 * t)
    creak = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * bp(rng.standard_normal(n), 400, 2000) * np.exp(-((t - 0.3) / 0.25) ** 2) * 0.4
    crum = sum(bp(rng.standard_normal(n), 150, 2500) * np.exp(-np.maximum(0, t - s) * 9) * (t > s) for s in (0.45, 0.55, 0.7, 0.85, 1.0))
    return norm(creak + crum * 0.5 + np.sin(2 * np.pi * 55 * t) * np.exp(-np.maximum(0, t - 0.45) * 4) * (t > 0.45), 0.75)
def icecrack():
    n = int(1.2 * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for k in range(9):
        i = int(rng.random() * 0.8 * SR); m = n - i; tt = np.arange(m) / SR; x[i:] += bp(rng.standard_normal(m), 1500, 9000) * np.exp(-tt * 70) * (0.5 + rng.random())
    return norm(x + lp(rng.standard_normal(n), 120) * np.exp(-t * 3) * 0.6, 0.7)
for nm, fn in (('poof', poof), ('clatter', clatter), ('tap', tap), ('gush', gush), ('collapse', collapse), ('icecrack', icecrack)): sf.write(f'audio/humansgone_{nm}.wav', fn(), SR)
print('ok')
