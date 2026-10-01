HAKI VERTICAL WALKTHROUGH

Deliverable: export/haki-walkthrough-9x16.mp4
1080 x 1920, 9:16, 30 fps, approximately 67 seconds.
H.264 video, AAC stereo audio. Narration, music, soft clicks and burned-in captions.
Includes a poster, SRT captions and an exact scene timeline.

CONTENT
Actual extension setup, editing a rule, protecting Tradovate, choosing reminder
frequency, opting into the new-tab page, checking all four example rules,
the real HAKI CONFIRMED state, release to a sample workspace, and the new-tab view.
Closing card and spoken line: Powered by joinmirra.app, copy trade your prop firm accounts!

CAPTURE METHOD
The extension UI is captured with its existing browser-test harness in an isolated
Chrome profile. Frames are editorially held and panned; the visible cursor and soft
clicks are added in the edit and synchronized to captured state changes. The trading
workspace is a simulated response, labeled as a sample. No account data or real
orders are used. Site permission is pre-granted in this disposable profile; the
narration tells viewers to allow access when their own browser asks. Setup begins
after the extension is installed. This is a walkthrough of the installed extension.

MUSIC
Happy Trails by Purrple Cat (Oasis, 2021)
https://freelofi.com/track/happy-trails
Audio source: https://lofi.radio/songs/Happy%20Trails.mp3
License: https://freelofi.com/license
Saved copy: licenses/FreeLofi-LICENSE.txt (v1.1, effective May 20, 2026).
The license permits synchronization and commercial audiovisual distribution.
Music is embedded in the video; the standalone track is not committed.
Suggested optional credit when posting: Music by Purrple Cat.

VOICE AND BRAND ASSETS
Synthetic narration: Microsoft en-US-JennyNeural, generated via edge-tts 7.2.8.
Haki icon: assets/icon128.png from the Haki project.
MIRRA logo: original static/img/logo.png from the MIRRA project.
The MIRRA end-card accent is exactly #00E676.

REBUILD
Dependencies: Python 3, Pillow, numpy, edge-tts, Node.js, Chrome and FFmpeg.
Install dependencies in an isolated environment. Set HAKI_FFMPEG if FFmpeg is not
on PATH. The renderer defaults to macOS Arial fonts; set HAKI_FONT_DIR to an
equivalent folder containing Arial.ttf and Arial Bold.ttf on another platform.

1. Run node media/demo/capture.mjs from the Haki checkout (or pass repo/output paths).
2. Place the licensed music at media/demo/audio/happy-trails-purrple-cat.mp3.
3. Run python3 media/demo/narrate.py (requires the online speech service).
4. Run python3 media/demo/render.py --preview to inspect the storyboard.
5. Run python3 media/demo/render.py to render the final video and audio mix.

Generated intermediate audio, screenshots and uncompressed media are ignored.
The final MP4, poster, captions, timeline, source scripts and license are retained.
