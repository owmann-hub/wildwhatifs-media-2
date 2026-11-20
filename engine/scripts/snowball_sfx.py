"""Procedural sounds for the 'snowball' episode: snow crunch (footsteps/rolling), roll rumble, cash-register ka-ching, house crunch, soft thump.
usage: python3 scripts/snowball_sfx.py  (writes audio/snowball_*.wav)"""
import numpy as np, soundfile as sf
from scipy import signal
SR = 44100; rng = np.random.default_rng(2011)
def lp(x, f): b, a = signal.butter(2, f / (SR / 2)); return signal.lfilter(b, a, x)
def hp(x, f): b, a = signal.butter(2, f / (SR / 2), 'high'); return signal.lfilter(b, a, x)
def bp(x, f1, f2): b, a = signal.butter(2, [f1 / (SR / 2), f2 / (SR / 2)], 'band'); return signal.lfilter(b, a, x)
def norm(x, g=0.7): return x / (np.abs(x).max() + 1e-9) * g
def crunch(dur=0.25):  # one snow crunch: dense tiny clicks, band-passed
    n = int(dur * SR); t = np.arange(n) / SR; x = (rng.random(n) > 0.92) * rng.standard_normal(n)
    x = bp(x, 900, 7000) * np.exp(-t * 9) * np.minimum(1, t / 0.01)
    return norm(x, 0.6)
def roll(dur=3.0):  # rolling snow: crunch grains modulated by the rotation
    n = int(dur * SR); t = np.arange(n) / SR; x = (rng.random(n) > 0.95) * rng.standard_normal(n)
    mod = 0.55 + 0.45 * np.sin(2 * np.pi * 1.6 * t) ** 2
    x = bp(x, 400, 5000) * mod + lp(rng.standard_normal(n), 180) * 0.6
    f = int(0.2 * SR); x[:f] *= np.linspace(0, 1, f); x[-f:] *= np.linspace(1, 0, f)
    return norm(x, 0.6)
def kaching():
    n = int(0.9 * SR); t = np.arange(n) / SR
    bell = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, d in ((2093, 5), (2637, 6), (3136, 7))) * (t > 0.08)
    clk = bp(rng.standard_normal(n), 2000, 8000) * np.exp(-t * 60)
    return norm(bell * 0.5 + clk, 0.6)
def house():  # wooden crunch + thump
    n = int(0.9 * SR); t = np.arange(n) / SR
    cr = sum(bp(rng.standard_normal(n), 200, 3000) * np.exp(-np.maximum(0, t - s) * 25) * (t > s) for s in (0, 0.05, 0.12, 0.2, 0.31))
    th = np.sin(2 * np.pi * 70 * t) * np.exp(-t * 8)
    return norm(cr * 0.5 + th, 0.7)
def thump():
    n = int(0.5 * SR); t = np.arange(n) / SR
    return norm(np.sin(2 * np.pi * (90 - 40 * t) * t) * np.exp(-t * 12) + lp(rng.standard_normal(n), 600) * np.exp(-t * 20) * 0.5, 0.7)
sf.write('audio/snowball_crunch.wav', crunch(), SR); sf.write('audio/snowball_roll.wav', roll(), SR); sf.write('audio/snowball_kaching.wav', kaching(), SR)
sf.write('audio/snowball_house.wav', house(), SR); sf.write('audio/snowball_thump.wav', thump(), SR); print('ok')
