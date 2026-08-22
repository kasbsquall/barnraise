"""Frames where the activity feed actually changes, measured off the encoded clip.

Placing micro-sounds by guessing puts them near the motion instead of on it, and
the ear hears that even when the eye does not. Two things matter here:

  * the region is given in PLATE pixels (the 4K capture), not CSS pixels;
  * with the typewriter, a message is a sustained change rather than a jump, so
    the cue is the START of the run and everything inside it is suppressed.
"""
import subprocess, sys, numpy as np

clip = sys.argv[1]
fps = 30
X, Y, W, H = 2250, 380, 1040, 1240          # the activity column, plate pixels

raw = subprocess.run(
    ['ffmpeg', '-v', 'error', '-i', clip,
     '-vf', f'crop={W}:{H}:{X}:{Y},scale=130:155,format=gray',
     '-f', 'rawvideo', '-'], capture_output=True).stdout
n = len(raw) // (130 * 155)
f = np.frombuffer(raw, dtype=np.uint8)[:n * 130 * 155].reshape(n, 155, 130).astype(np.int16)
d = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2))

thr = max(d.mean() + 0.9 * d.std(), 0.06)
cues, last = [], -999
for i, v in enumerate(d):
    if v > thr and i - last > 24:            # one cue per event, not per typed frame
        cues.append(i + 1)
        last = i

print(f'frames {n}  mean {d.mean():.3f}  sigma {d.std():.3f}  threshold {thr:.3f}')
print(f'{len(cues)} cues')
print('seconds:', [round(c / fps, 2) for c in cues])
print('frames :', cues)
