"""Builds the film's audio bed: narration over music that gets out of its way.

Everything stays PCM until the final encode. The chain used to be mp3 at every
stage and four generations of loss are audible as grit in the highs.
"""
import json, subprocess, sys
from pathlib import Path

AQUI = Path(__file__).parent
FPS = 30
MUS_VOL   = 0.416    # the bed, before ducking. Was 0.52; down a fifth on a
                     # listen of the finished film, where the music sat close
                     # enough to the voice to compete with it. This is the gain
                     # BEFORE the sidechain, so it comes down by the same fifth
                     # under the narration and in the gaps between sentences.
VO_VOL    = 0.5      # -6 dB: the TTS comes back at about -0.2 dBFS with no headroom
RATIO     = 6        # 9 crushed the mix on an earlier film; 6 ducks without pumping
THRESHOLD = 0.02
ATTACK, RELEASE = 20, 400    # slow enough to lift back into the gaps between sentences


def construir(salida: Path, solo_musica: bool = False) -> float:
    esc = json.loads((AQUI / 'scene_timing.json').read_text(encoding='utf-8'))
    dur = max(e['end'] for e in esc)

    ins = ['-i', str(AQUI / 'music_raw.wav')]
    partes, et = [], []
    for i, e in enumerate(esc):
        ins += ['-i', str(AQUI / 'vo' / f"{e['id']}.wav")]
        ms = int(round(e['voStart'] * 1000))
        partes.append(f"[{i+1}:a]adelay={ms}|{ms},volume={VO_VOL}[v{i}]")
        et.append(f"[v{i}]")

    f = ';'.join(partes) + ';'
    f += ''.join(et) + f"amix=inputs={len(esc)}:normalize=0,apad=whole_dur={dur}[vo];"
    f += "[vo]asplit=2[voOut][voKey];"
    f += (f"[0:a]atrim=0:{dur},asetpts=N/SR/TB,volume={MUS_VOL},"
          f"afade=t=in:st=0:d=3,afade=t=out:st={dur-5:.2f}:d=5[mus];")
    f += (f"[mus][voKey]sidechaincompress=threshold={THRESHOLD}:ratio={RATIO}"
          f":attack={ATTACK}:release={RELEASE}:makeup=1:level_sc=1[duck]")
    if solo_musica:
        f += ";[voOut]anullsink"
        mapa = '[duck]'
    else:
        f += ";[duck][voOut]amix=inputs=2:normalize=0[out]"
        mapa = '[out]'

    subprocess.run(['ffmpeg', '-y', '-v', 'error'] + ins + ['-filter_complex', f,
                    '-map', mapa, '-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '2',
                    str(salida)], check=True)
    return dur


if __name__ == '__main__':
    d = construir(AQUI / 'mix.wav')
    print(f'mix.wav  {d:.2f}s')
