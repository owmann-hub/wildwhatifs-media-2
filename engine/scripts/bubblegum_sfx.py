# our own synthesized effects for the bubblegum episode: a breath 'puff' (air into gum) and a stretchy gum creak
import numpy as np, soundfile as sf
from scipy import signal
SR = 44100; r = np.random.default_rng(11)
def bp(x, a, b): b_, a_ = signal.butter(2, [a / (SR / 2), b / (SR / 2)], 'band'); return signal.lfilter(b_, a_, x)
n = int(0.42 * SR); t = np.arange(n) / SR
puff = bp(r.standard_normal(n), 300, 2500) * np.sin(np.pi * t / t[-1]) ** 1.5 * 0.8
f = 140 + 260 * (t / t[-1]) ** 0.7; stretch = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-((t - 0.25) / 0.12) ** 2) * 0.35
x = puff + stretch; x /= np.abs(x).max(); sf.write('audio/bubblegum_puff.wav', x * 0.9, SR)
n = int(0.6 * SR); t = np.arange(n) / SR; f = 90 + 40 * np.sin(2 * np.pi * 3 * t)
creak = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-t * 4) * 0.3; creak = bp(creak, 200, 3000); creak /= np.abs(creak).max()
sf.write('audio/bubblegum_creak.wav', creak * 0.8, SR); print('ok')
