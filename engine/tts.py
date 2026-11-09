import json, sys, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro("models/kokoro-v1.0.onnx", "models/voices-v1.0.bin")
name, voice, speed = sys.argv[1], sys.argv[2], float(sys.argv[3])
lines = json.load(open(f"scripts/{name}.json"))
out = {}
for L in lines:
    s, sr = k.create(L["text"], voice=voice, speed=speed, lang="en-us")
    p = f"audio/{name}_{L['id']}.wav"; sf.write(p, s, sr)
    out[L["id"]] = round(len(s)/sr, 2)
json.dump(out, open(f"audio/{name}_dur.json","w"), indent=1); print(name, out, "total", round(sum(out.values()),1))
