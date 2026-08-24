"""Cuts the raw captures to the exact scene slots in scene_timing.json.

The slots come out of the measured narration, so a re-recorded voiceover moves
them and this is re-run. Segments are declared as (start, end) in the raw take;
joining two of them skips a dead stretch, and both sides sit on the same panel
over the same map, so the cut is concealed rather than felt.
"""
import json, subprocess, sys
from pathlib import Path

AQUI = Path(__file__).resolve().parents[1]
FPS = 30

# S4 opens mid-discovery, lands COMPLEMENTARITY FOUND about 70% in, and ends on
# the two agents actually striking terms, which is the strongest material in the
# take. The stretch between is the agent waiting on neighbors and shows nothing.
# S5 is one continuous piece: the cream flip cannot survive a join.
CORTES = {
    # The round take runs 72s and two thirds of it is the agent waiting on
    # neighbors with nothing on screen. The first segment is the dense stretch of
    # messages arriving, the second is the two agents actually striking terms,
    # and the join skips eleven seconds of a still column. Both sides are the
    # same panel over the same map, so the cut is concealed rather than felt.
    's4': ('s4_raw.webm', [(24.0, 50.0), (62.0, 68.0)]),
    # One continuous piece: the cream flip cannot survive a join. Positioned so
    # the flip lands about two thirds in and the map ending is inside the scene,
    # because the narration says the line between them gets thicker.
    's5': ('s5_raw.webm', [(12.1, 44.3)]),
}

# The clip must outlast its slot. Remotion keeps a scene rendering through its
# outgoing cross-dissolve, so footage cut to exactly durF runs out part-way
# through and OffthreadVideo renders nothing: the shot dies to the background
# while it is still at high opacity.
MARGEN = 0.6


def cortar(sid: str) -> None:
    esc = json.loads((AQUI / 'audio/scene_timing.json').read_text(encoding='utf-8'))
    slot = next(e['dur'] for e in esc if e['id'] == sid)
    fuente, segs = CORTES[sid]
    src = AQUI / 'footage' / fuente
    bruto = sum(b - a for a, b in segs)

    partes, etiquetas = [], []
    for i, (a, b) in enumerate(segs):
        partes.append(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS[s{i}]")
        etiquetas.append(f"[s{i}]")
    f = ';'.join(partes) + ';' + ''.join(etiquetas) + f"concat=n={len(segs)}:v=1[j]"
    # Any residual difference is absorbed as a gentle uniform ramp rather than by
    # trimming a beat off the end.
    ratio = bruto / (slot + MARGEN)
    f += f";[j]setpts=PTS/{ratio:.6f}[out]"

    salida = AQUI / 'footage' / f'{sid}_cut.mp4'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(src), '-filter_complex', f,
                    '-map', '[out]', '-r', str(FPS), '-c:v', 'libx264', '-crf', '16',
                    '-preset', 'slow', '-pix_fmt', 'yuv420p', '-an', str(salida)], check=True)
    d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                              '-of', 'csv=p=0', str(salida)], capture_output=True, text=True).stdout)
    holgura = d - slot
    print(f'{sid}: {bruto:.2f}s of take -> {d:.2f}s   slot {slot:.2f}s   '
          f'margin {holgura:+.2f}s   ramp {ratio:.3f}x')
    if holgura < 0.3:
        print(f'  WARNING: {sid} does not outlast its slot by enough to survive a dissolve')


if __name__ == '__main__':
    for sid in (sys.argv[1:] or CORTES):
        cortar(sid)
