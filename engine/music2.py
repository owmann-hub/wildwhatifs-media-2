"""Background song + ambience beds for mix.py.
song(): a real looped track (chords, bass, pluck arp, drums, lead) whose layers
come in and out with an intensity curve, so it builds with the video.
amb(): environment beds — city, wind, space, fire."""
import numpy as np
from scipy import signal

SR = 44100
R = np.random.default_rng(11)

def _lp(x, f, o=2): b, a = signal.butter(o, min(f, SR / 2 - 100) / (SR / 2)); return signal.lfilter(b, a, x)
def _hp(x, f, o=2): b, a = signal.butter(o, f / (SR / 2), 'high'); return signal.lfilter(b, a, x)
def _bp(x, f1, f2): b, a = signal.butter(2, [f1 / (SR / 2), f2 / (SR / 2)], 'band'); return signal.lfilter(b, a, x)
def hz(m): return 440 * 2 ** ((m - 69) / 12)

def _add(buf, x, t, g=1.0):
    i = int(t * SR)
    if i >= len(buf) or i < 0: return
    x = x[: len(buf) - i]; buf[i:i + len(x)] += x * g

# ---- instruments ----
def pluck(f, dur=0.22):
    n = int(dur * SR); t = np.arange(n) / SR
    x = (signal.square(2 * np.pi * f * t, 0.3) * 0.5 + np.sin(2 * np.pi * f * 2 * t) * 0.3) * np.exp(-t * 16)
    return _lp(x, 3500)
def bell(f, dur=0.9):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.01 * t) + 0.15 * np.sin(2 * np.pi * f * 3.98 * t)) * np.exp(-t * 4.5) * np.minimum(1, t / 0.005)
def bassnote(f, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    x = signal.sawtooth(2 * np.pi * f * t) * 0.6 + np.sin(2 * np.pi * f * t)
    e = np.minimum(1, t / 0.006) * np.exp(-t * 3.5)
    return _lp(x * e, 420)
def padchord(ms, dur):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in ms:
        for d in (-0.15, 0, 0.13):
            x += signal.sawtooth(2 * np.pi * hz(m) * (1 + d / 100) * t + R.random() * 6.28)
    x = _lp(x, 1400) * 0.06
    a = int(0.25 * SR); x[:a] *= np.linspace(0, 1, a); x[-a:] *= np.linspace(1, 0, a)
    return x
def kick():
    n = int(0.42 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * np.cumsum(48 + 120 * np.exp(-t * 32)) / SR) * np.exp(-t * 7.5)
    return np.tanh(x * 1.6) * 0.9
def clap():
    n = int(0.25 * SR); t = np.arange(n) / SR; z = R.standard_normal(n)
    e = np.exp(-t * 22) + 0.6 * np.exp(-np.maximum(t - 0.012, 0) * 30) * (t > 0.012)
    return _bp(z, 900, 5000) * e * 0.55
def hat(open_=False):
    n = int((0.18 if open_ else 0.045) * SR); t = np.arange(n) / SR
    return _hp(R.standard_normal(n), 7500) * np.exp(-t * (18 if open_ else 85)) * 0.22

# ---- the song ----
def song(start, end, key=57, bpm=112, ints=None, prog=None):
    """key: MIDI root of the minor key (57 = A). ints: [[t, 0..1], ...] in video time."""
    L = end - start; n = int(L * SR); beat = 60 / bpm; bar = beat * 4
    I = lambda tt: float(np.interp(tt + start, [p[0] for p in ints], [p[1] for p in ints]))
    prog = prog or [(0, [0, 3, 7]), (-4, [0, 4, 7]), (3, [0, 4, 7]), (-2, [0, 4, 7])]   # i VI III VII
    pad = np.zeros(n); arp = np.zeros(n); bass = np.zeros(n); drums = np.zeros(n); lead = np.zeros(n); side = np.ones(n)
    motif = [12, 10, 7, 10, 12, 15, 14, 10]  # lead notes (scale degrees in semitones above root)
    nb = int(np.ceil(L / bar)) + 1
    K, C, H, HO = kick(), clap(), hat(), hat(True)
    for b in range(nb):
        t0 = b * bar
        if t0 >= L: break
        root, tri = prog[b % len(prog)]
        r = key + root; ms = [r + iv for iv in tri]
        _add(pad, padchord([m - 12 for m in ms] + [ms[0]], bar + 0.25), t0)
        for s in range(16):  # 16th grid
            ts = t0 + s * beat / 4
            if ts >= L: break
            iv = I(ts)
            # arp
            if iv > 0.15 and s % 2 == 0 or iv > 0.6:
                note = ms[[0, 1, 2, 1][s % 4]] + (12 if (s // 4) % 2 else 0)
                _add(arp, pluck(hz(note)), ts, 0.16 * min(1, 0.3 + iv))
            # bass 8ths
            if iv > 0.38 and s % 2 == 0:
                _add(bass, bassnote(hz(r - 24), beat / 2 * 0.95), ts, 0.5)
            # drums
            if s % 4 == 0 and (iv > 0.7 or (iv > 0.32 and s in (0, 8))):
                _add(drums, K, ts, 0.85); i = int(ts * SR); m = min(n - i, int(0.22 * SR))
                if m > 0: side[i:i + m] = np.minimum(side[i:i + m], 0.45 + 0.55 * np.linspace(0, 1, m) ** 0.6)
            if s in (4, 12) and iv > 0.5: _add(drums, C, ts, 0.7)
            if iv > 0.45 and s % 2 == 1 or iv > 0.82 and s % 2 == 0: _add(drums, H, ts, 0.8 if s % 2 else 0.45)
            if iv > 0.6 and s == 14: _add(drums, HO, ts, 0.6)
            # lead motif on 8ths, second half of bar pairs
            if iv > 0.72 and s % 2 == 0 and b % 2 == 1:
                _add(lead, bell(hz(key + 12 + motif[(s // 2) % 8] + (root if root > 0 else 0) * 0)), ts, 0.11)
    pad *= side; arp *= (0.6 + 0.4 * side)
    # intensity-driven filter on the pad bed (opens up as things escalate)
    It = np.interp(np.arange(n) / SR + start, [p[0] for p in ints], [p[1] for p in ints])
    pad = pad * (0.55 + 0.45 * It)
    L_ = pad + arp + bass + drums + lead
    Rr = pad + np.roll(arp, 420) + bass + drums + np.roll(lead, 260)   # a bit of width
    st = np.stack([L_, Rr], 1)
    st /= np.abs(st).max() + 1e-9
    return st * 0.9

# ---- ambience beds ----
def amb(kind, dur):
    n = int(dur * SR); t = np.arange(n) / SR; z = R.standard_normal(n)
    if kind == 'city':
        x = _lp(np.cumsum(z) * 0.02, 600) ; x = x - _lp(x, 40)  # traffic rumble
        x *= 0.35
        for _ in range(int(dur / 3.5)):            # passing cars
            c = R.random() * dur; w = 1.6
            e = np.exp(-((t - c) / (w / 2)) ** 2); x += _bp(z, 300, 1800) * e * 0.25
        for _ in range(int(dur / 2)):              # birds
            c = R.random() * dur; m = int(0.12 * SR); tt = np.arange(m) / SR
            f = 3200 + 1400 * np.sin(2 * np.pi * 18 * tt) + R.random() * 800
            ch = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.12) * 0.05
            i = int(c * SR); x[i:i + m] += ch[: n - i]
        return x
    if kind == 'wind':
        mod = 0.5 + 0.5 * np.sin(2 * np.pi * 0.17 * t + R.random() * 6) * np.sin(2 * np.pi * 0.07 * t)
        return _bp(z, 250, 1400) * (0.25 + 0.5 * mod) * 0.5
    if kind == 'space':
        x = sum(np.sin(2 * np.pi * f * t + R.random() * 6) for f in (55, 82.5, 110.3)) * 0.12
        return x * (0.7 + 0.3 * np.sin(2 * np.pi * 0.11 * t)) + _lp(z, 200) * 0.05
    if kind == 'fire':
        x = _lp(z, 900) * 0.3
        for _ in range(int(dur * 9)):  # crackles
            i = int(R.random() * n); m = int(0.01 * SR)
            x[i:i + m] += (R.standard_normal(min(m, n - i)) * np.exp(-np.arange(min(m, n - i)) / SR * 400)) * 0.6
        return x
    return np.zeros(n)
