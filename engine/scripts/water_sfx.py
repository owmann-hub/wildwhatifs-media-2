"""Procedural water sounds for the 'water' episode: river lapping bed, big splash, small plips, mud thud. usage: python3 scripts/water_sfx.py"""
import numpy as np, soundfile as sf
from scipy import signal
SR = 44100; rng = np.random.default_rng(15)
def lp(x, f): b, a = signal.butter(2, f / (SR / 2)); return signal.lfilter(b, a, x)
def bp(x, f1, f2): b, a = signal.butter(2, [f1 / (SR / 2), f2 / (SR / 2)], 'band'); return signal.lfilter(b, a, x)
def bubble(f0, dur, amp):
    n = int(dur * SR); t = np.arange(n) / SR; f = f0 * (1 + 0.6 * t / dur); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (6 / dur)) * amp
def lap(dur):
    n = int(dur * SR); x = bp(rng.standard_normal(n), 200, 1400) * 0.25
    env = np.convolve(np.abs(rng.standard_normal(n)), np.ones(4000) / 4000, 'same'); x *= 0.5 + env
    for k in range(int(dur * 9)):
        i = int(rng.random() * (n - SR)); b = bubble(300 + rng.random() * 900, 0.03 + rng.random() * 0.06, 0.08 + rng.random() * 0.1); x[i:i + len(b)] += b
    return x * 0.8
def splash(dur=1.6, big=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; x = bp(rng.standard_normal(n), 300, 7000) * np.exp(-t * 3.2) * 0.9
    x += lp(rng.standard_normal(n), 400) * np.exp(-t * 6) * 0.8 * big
    for k in range(60):
        i = int(rng.random() ** 2 * (n - SR * 0.2)); b = bubble(400 + rng.random() * 1800, 0.02 + rng.random() * 0.05, 0.15); x[i:i + len(b)] += b
    return np.tanh(x * 1.2) * 0.8
def plip():
    n = int(0.25 * SR); t = np.arange(n) / SR; return (bubble(900, 0.08, 0.6)[:n].tolist() + [0] * 0) and np.pad(bubble(900, 0.08, 0.6), (0, n - int(0.08 * SR)))[:n] + bp(rng.standard_normal(n), 2000, 8000) * np.exp(-t * 40) * 0.4
def thud():
    n = int(1.2 * SR); t = np.arange(n) / SR; f = 40 + 60 * np.exp(-t * 12); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4) + lp(rng.standard_normal(n), 600) * np.exp(-t * 9) * 0.9
    return np.tanh(x * 1.5) * 0.8
def clink():
    n = int(0.6 * SR); t = np.arange(n) / SR; x = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, d in [(2350, 9), (3710, 12), (5200, 18)]) * 0.25; return x
sf.write('audio/water_lap.wav', lap(8.0), SR); sf.write('audio/water_splash.wav', splash(), SR); sf.write('audio/water_plip.wav', plip(), SR)
sf.write('audio/water_thud.wav', thud(), SR); sf.write('audio/water_clink.wav', clink(), SR); sf.write('audio/water_lap2.wav', lap(9.0), SR)
print('ok')
