# our own synthesized effects for the spinfaster episode: beach waves (swelling filtered noise) and a 'hop' boing
import numpy as np, soundfile as sf
from scipy import signal
SR = 44100; r = np.random.default_rng(26)
def lp(x, f): b, a = signal.butter(2, f / (SR / 2)); return signal.lfilter(b, a, x)
n = int(11.5 * SR); t = np.arange(n) / SR
sw = 0.35 + 0.65 * (0.5 + 0.5 * np.sin(2 * np.pi * t / 3.6 - 1.2)) ** 2
waves = lp(r.standard_normal(n), 900) * sw + 0.4 * lp(r.standard_normal(n), 250) * sw
waves /= np.abs(waves).max(); sf.write('audio/spinfaster_waves.wav', waves * 0.8, SR)
n = int(0.35 * SR); t = np.arange(n) / SR; f = 180 + 420 * t / t[-1]
boing = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * (1 + 0.3 * np.sin(2 * np.pi * 22 * t))
sf.write('audio/spinfaster_boing.wav', boing / np.abs(boing).max() * 0.7, SR); print('ok')
