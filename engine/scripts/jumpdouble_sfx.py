# our own synthesized effects for the jumpdouble episode: trampoline 'boing' and a soft wing-flap burst for the pigeons
import numpy as np, soundfile as sf
SR = 44100; r = np.random.default_rng(27)
n = int(0.45 * SR); t = np.arange(n) / SR; f = 140 + 360 * (1 - np.exp(-t * 9))
boing = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * (1 + 0.35 * np.sin(2 * np.pi * 18 * t))
sf.write('audio/jumpdouble_boing.wav', boing / np.abs(boing).max() * 0.7, SR)
n = int(1.2 * SR); t = np.arange(n) / SR; fl = (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 11 * t))) * np.exp(-t * 2.2)
x = r.standard_normal(n) * fl; from scipy import signal; b, a = signal.butter(2, [400 / (SR / 2), 3000 / (SR / 2)], 'band'); x = signal.lfilter(b, a, x)
sf.write('audio/jumpdouble_flap.wav', x / np.abs(x).max() * 0.6, SR); print('ok')
