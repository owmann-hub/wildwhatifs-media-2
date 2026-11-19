"""Procedural sounds for the 'mittensgrow' episode: meow (normal + giant), doubling pop, couch crunch, wall thud, stomp, gulp.
usage: python3 scripts/mittensgrow_sfx.py  (writes audio/mittensgrow_*.wav)"""
import numpy as np, soundfile as sf
from scipy import signal
SR = 44100; rng = np.random.default_rng(1120)
def lp(x, f): b, a = signal.butter(2, f / (SR / 2)); return signal.lfilter(b, a, x)
def hp(x, f): b, a = signal.butter(2, f / (SR / 2), 'high'); return signal.lfilter(b, a, x)
def bp(x, f1, f2): b, a = signal.butter(2, [f1 / (SR / 2), f2 / (SR / 2)], 'band'); return signal.lfilter(b, a, x)
def norm(x, g=0.7): return x / (np.abs(x).max() + 1e-9) * g
def meow(dur=0.7, f0=520, drop=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; u = t / dur
    f = f0 * drop * (0.75 + 0.45 * np.sin(np.pi * np.clip(u * 1.1, 0, 1)) - 0.2 * u)
    src = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR, 0.3) * np.minimum(1, t / 0.04) * np.minimum(1, (dur - t) / 0.18)
    fm = 900 + 900 * np.sin(np.pi * np.clip(u, 0, 1))   # 'm-e-ow' formant sweep
    x = np.zeros(n); seg = 1024
    for k in range(0, n, seg):
        c = fm[k] * drop ** 0.5; x[k:k + seg] = bp(src[max(0, k - 256):k + seg], max(80, c * 0.7), min(SR / 2 - 100, c * 1.4))[-len(src[k:k + seg]):]
    x += bp(src, 2400 * drop ** 0.5, 3600 * drop ** 0.5) * 0.3
    return norm(x, 0.6)
def pop():
    n = int(0.35 * SR); t = np.arange(n) / SR
    return norm(np.sin(2 * np.pi * (220 + 900 * t) * t) * np.exp(-t * 14) + bp(rng.standard_normal(n), 400, 3000) * np.exp(-t * 30) * 0.4, 0.6)
def crunch():
    n = int(0.9 * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for _ in range(60): c = int(rng.random() * 0.5 * SR); m = int(0.015 * SR); x[c:c + m] += rng.standard_normal(m) * rng.random()
    x = bp(x, 200, 4000) + np.sin(2 * np.pi * 70 * t) * np.exp(-t * 8) * 0.8 + bp(rng.standard_normal(n), 80, 600) * np.exp(-t * 6)
    return norm(x)
def thud():
    n = int(0.8 * SR); t = np.arange(n) / SR
    return norm(np.sin(2 * np.pi * (60 + 40 * np.exp(-t * 20)) * t) * np.exp(-t * 7) + lp(rng.standard_normal(n), 800) * np.exp(-t * 12) * 0.7)
def gulp():
    n = int(0.6 * SR); t = np.arange(n) / SR
    g = np.sin(2 * np.pi * np.cumsum(180 + 260 * np.exp(-((t - 0.18) / 0.06) ** 2)) / SR) * np.exp(-((t - 0.2) / 0.12) ** 2)
    return norm(lp(g + 0.2 * bp(rng.standard_normal(n), 200, 1200) * np.exp(-((t - 0.2) / 0.1) ** 2), 1800), 0.6)
sf.write('audio/mittensgrow_meow.wav', meow(), SR); sf.write('audio/mittensgrow_meow_big.wav', meow(1.3, 300, 0.55), SR)
sf.write('audio/mittensgrow_pop.wav', pop(), SR); sf.write('audio/mittensgrow_crunch.wav', crunch(), SR); sf.write('audio/mittensgrow_thud.wav', thud(), SR); sf.write('audio/mittensgrow_gulp.wav', gulp(), SR)
print('ok')
