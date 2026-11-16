"""Procedural sounds for the 'asteroid' episode: T. rex roar, small sniff, jungle bed (insects + odd calls), camera shutter, cat swat, asteroid fly-by.
usage: python3 scripts/asteroid_sfx.py  (writes audio/asteroid_*.wav)"""
import numpy as np, soundfile as sf
from scipy import signal
SR = 44100; rng = np.random.default_rng(17)
def lp(x, f): b, a = signal.butter(2, f / (SR / 2)); return signal.lfilter(b, a, x)
def hp(x, f): b, a = signal.butter(2, f / (SR / 2), 'high'); return signal.lfilter(b, a, x)
def bp(x, f1, f2): b, a = signal.butter(2, [f1 / (SR / 2), f2 / (SR / 2)], 'band'); return signal.lfilter(b, a, x)
def roar(dur=1.6):
    n = int(dur * SR); t = np.arange(n) / SR; env = np.minimum(1, t / 0.12) * np.exp(-np.maximum(0, t - 0.9) * 3.5)
    f0 = 95 + 25 * np.sin(2 * np.pi * 0.7 * t) - 20 * t; ph = 2 * np.pi * np.cumsum(f0) / SR
    tone = sum(np.sin(ph * k + rng.random()) / k for k in range(1, 14)); grit = bp(rng.standard_normal(n), 150, 2200) * (0.6 + 0.4 * np.sin(2 * np.pi * 31 * t))
    x = (tone * 0.5 + grit * 0.9) * env; x = np.tanh(lp(x, 2600) * 2.2); return x / np.abs(x).max() * 0.9
def sniff(dur=0.5):
    n = int(dur * SR); t = np.arange(n) / SR; e = np.exp(-((t - 0.1) / 0.05) ** 2) + np.exp(-((t - 0.3) / 0.05) ** 2)
    x = bp(rng.standard_normal(n), 600, 3500) * e; return x / np.abs(x).max() * 0.7
def jungle(dur):
    n = int(dur * SR); t = np.arange(n) / SR; x = bp(rng.standard_normal(n), 3500, 7000) * (0.04 + 0.03 * np.sin(2 * np.pi * 7 * t) ** 2)   # insects
    x += lp(rng.standard_normal(n), 300) * 0.05
    for k in range(int(dur / 1.3)):   # odd calls (bird-ish whoops)
        c = rng.random() * (dur - 1); m = int(0.35 * SR); tt = np.arange(m) / SR; f = 600 + 900 * np.sin(np.pi * tt / 0.35) * (0.5 + rng.random())
        ch = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.35) * 0.06; i = int(c * SR); x[i:i + m] += ch[: n - i]
    return x
def shutter():
    n = int(0.25 * SR); t = np.arange(n) / SR; x = hp(rng.standard_normal(n), 2000) * (np.exp(-t * 90) + 0.6 * np.exp(-np.maximum(0, t - 0.09) * 120) * (t > 0.09)); return x / np.abs(x).max() * 0.6
def swat():
    n = int(0.3 * SR); t = np.arange(n) / SR; x = bp(rng.standard_normal(n), 800, 6000) * np.exp(-t * 25) * np.minimum(1, t / 0.02); x += np.sin(2 * np.pi * 180 * t) * np.exp(-t * 40) * 0.5; return x / np.abs(x).max() * 0.6
def flyby(dur=4.5):
    n = int(dur * SR); t = np.arange(n) / SR; e = np.exp(-((t - dur * 0.62) / (dur * 0.22)) ** 2)
    x = lp(rng.standard_normal(n), 900) * e * 1.2 + np.sin(2 * np.pi * np.cumsum(60 - 25 * (t / dur)) / SR) * e * 0.4; return np.tanh(x * 1.5) * 0.8
for name, x in [('roar', roar()), ('roar2', roar(1.2) * 0.85), ('sniff', sniff()), ('jungle', jungle(25.0)), ('shutter', shutter()), ('swat', swat()), ('flyby', flyby())]:
    sf.write(f'audio/asteroid_{name}.wav', x.astype(np.float32), SR)
print('ok')
