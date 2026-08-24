# Publishing the film

Everything needed to put the video up and paste the link into the submission.
Timings come from `video/remotion/src/data/scene_timing.json`, so if the narration
is ever re-recorded they move and this file is regenerated with it.

---

## The file

`video/remotion/out/barnraise_master.mp4`

2:52.9 · 1920x1080 at 30fps · h264, limited range BT.709 · AAC 48kHz stereo
-14.06 LUFS integrated, -1.33 dBTP true peak · faststart · 105 MB

The rules allow up to five minutes, so there is room and no need to cut.

## Thumbnails

`video/remotion/out/thumbnail_16x9.png` — 1280x720, for YouTube
`video/remotion/out/thumbnail_3x4.png` — 1200x1600, for the Devpost gallery card

Both are authored at their own size rather than cropped from one another, and both
show agreement #19, which is the row the film signs on camera.

---

## YouTube title

    Barnraise — agents that negotiate between neighboring organizations (AWS Agents for Humans)

Alternates, if the first reads long in the sidebar:

    Barnraise: six community organizations, six agents, one shared ledger
    Barnraise — the first agent that works between organizations, not inside one

## YouTube description

    Every AI tool in the nonprofit sector automates the inside of one organization.
    Barnraise works between them.

    Six neighboring community organizations each run their own agent over their own
    private data. The agents reach each other over A2A, the agent-to-agent protocol,
    across process boundaries, and negotiate concrete exchanges: this resource, that
    day, these conditions. Then they stop. Nothing is written until a human on each
    side signs.

    Every closed agreement lands in a shared ledger, and that ledger is the asset.
    When a funding call appears, the coalition can show documented prior
    collaboration instead of asserting it.

    Built with the Strands Agents SDK for the AWS Agents for Humans Hackathon,
    Good Neighbor Agents track.

    Code, ledger and guards: https://github.com/kasbsquall/barnraise

    Chapters
    0:00 The pause
    0:10 Six organizations, seven hundred metres apart
    0:35 Who it is for
    0:45 The agents talk over A2A
    1:17 Two signatures
    1:48 What it refuses
    2:09 The funding call
    2:41 Close

    What is real and what is not
    The streets and the driving distances are real, from OpenStreetMap and OSRM.
    The organizations are invented and the notice saying so is on screen throughout.
    Four of the eight ledger rows are seeded history; the other four were negotiated
    by the agents. Every figure spoken in the film is computed from the ledger by a
    deterministic scan, not by a model.

    Built with: python · strands-agents · a2a · amazon-bedrock · google-gemini ·
    ollama · fastapi · sqlite · maplibre · openstreetmap · osrm · remotion

## YouTube settings

- Visibility **public**. The rules require it.
- Category: Science & Technology
- Language: English
- "Altered or synthetic content": the narration is text-to-speech, so answer yes
  where YouTube asks about synthetic voice.

---

## The links you need

- **AWS Builder ID**: https://profile.aws.amazon.com/ (sign in or create; the
  "Create AWS Builder ID" flow is the same page). It is a required deliverable and
  is separate from an AWS account.
- **AWS promotional credits**, $50, form closes 11 Sep 2026 at 12pm PT:
  https://forms.gle/6sjzKiX6bKUMA5NEA
- **builder.aws.com**, where the bonus posts go: https://builder.aws.com
- Submission page: https://agentsforhumans.devpost.com

---

## Chapters, with scene durations

| Start | Chapter | Length |
|---|---|---|
| 0:00 | The pause | 10.6s |
| 0:10 | Six organizations, seven hundred metres apart | 24.9s |
| 0:35 | Who it is for | 10.2s |
| 0:45 | The agents talk over A2A | 31.4s |
| 1:17 | Two signatures | 31.5s |
| 1:48 | What it refuses | 20.5s |
| 2:09 | The funding call | 32.2s |
| 2:41 | Close | 11.7s |

YouTube's rules for chapters are met: the first starts at 0:00, there are at least
three, and none is shorter than ten seconds.
