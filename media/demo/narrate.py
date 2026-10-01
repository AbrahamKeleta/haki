"""Generate requested narration and timing data using edge-tts."""
import asyncio
import json
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parent
PLAN = json.loads((ROOT / 'plan.json').read_text())

async def main():
    (ROOT / 'audio').mkdir(exist_ok=True)
    semaphore = asyncio.Semaphore(2)
    async def generate(scene):
        async with semaphore:
            output = ROOT / 'audio' / (scene['id'] + '.mp3')
            timings = output.with_suffix('.json')
            if output.exists() and output.stat().st_size > 1000 and timings.exists():
                return
            boundaries = []
            communicate = edge_tts.Communicate(scene['speech'], PLAN['voice'], rate='+0%', boundary='WordBoundary')
            with output.open('wb') as media:
                async for item in communicate.stream():
                    if item['type'] == 'audio':
                        media.write(item['data'])
                    elif item['type'] == 'WordBoundary':
                        boundaries.append({k:v for k,v in item.items() if k != 'type'})
            timings.write_text(json.dumps(boundaries, indent=2))
            print('Narrated', scene['id'], flush=True)
    await asyncio.gather(*(generate(s) for s in PLAN['scenes']))

asyncio.run(main())
