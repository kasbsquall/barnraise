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
    # The cold open holds on the pause. The first two seconds are the page
    # loading and its entry choreography, which belong to nothing.
    's1': ('s1_raw.webm', [(2.6, 14.0)]),
    # Each card opens on the sentence that names its organization. The beats
    # landed within a tenth of a second of the recorded narration, so the cut is
    # just the page-load head trimmed off.
    's2': ('s2_raw.webm', [(4.3, 29.7)]),
    # Three directors, one per beat. The card changes landed on 3.0 and 6.4,
    # which is where the narration wants them, so the cut is the head trim.
    's3': ('s3_raw.webm', [(4.5, 15.34)]),
    # The funding call read from the top down: the amount, the requirements, what
    # each organization covers alone, the whole neighborhood, and held on the
    # collaboration requirement where the last three sentences land.
    's7': ('s7_raw.webm', [(6.0, 38.76)]),
    # Two windows out of a round that ran 117s, most of it the agent waiting on
    # neighbors with a still column on screen. The first window is the discovery
    # sweep, which is what "the agents reach each other over A2A" is about, and
    # it ends on COMPLEMENTARITY FOUND naming the van and the Tuesday out loud,
    # which is where the narration says the food bank needs one and the library
    # has one idle. The second is the pair of messages where the two agents
    # strike terms. Both windows are the same panel over the same map, so the
    # join is concealed rather than felt.
    's4': ('s4_raw.webm', [(46.0, 62.0), (78.0, 94.0)]),
    's5': ('s5_raw.webm', [(12.4, 44.6)]),
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
