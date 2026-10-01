"""Render the Haki walkthrough from actual UI captures, narration and licensed music.

Requirements: Pillow, numpy; ffmpeg in PATH or HAKI_FFMPEG.
Run with --preview for a storyboard, or without arguments for the complete MP4.
"""
import argparse
import functools
import json
import math
import os
import shutil
import subprocess
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'export'
OUT.mkdir(exist_ok=True)
FF = os.environ.get('HAKI_FFMPEG') or shutil.which('ffmpeg')
if not FF:
    raise SystemExit('Set HAKI_FFMPEG to your ffmpeg binary.')
PLAN = json.loads((ROOT / 'plan.json').read_text())
META = json.loads((ROOT / 'captures-portrait/shots.json').read_text())['shots']
W, H, FPS, SR = 1080, 1920, PLAN['fps'], 48000
BLUE, WHITE, MUTED, GREEN = '#4bcaff', '#eef4ff', '#94a9bd', '#00E676'
FONT_DIR = Path(os.environ.get('HAKI_FONT_DIR', '/System/Library/Fonts/Supplemental'))

@functools.lru_cache(None)
def font(size, bold=False):
    return ImageFont.truetype(str(FONT_DIR / ('Arial Bold.ttf' if bold else 'Arial.ttf')), size)

def decode(path, channels=1, offset=0, duration=None):
    args = [FF, '-v', 'error', '-ss', str(offset), '-i', str(path)]
    if duration:
        args += ['-t', str(duration)]
    raw = subprocess.check_output(args + ['-f', 'f32le', '-ac', str(channels), '-ar', str(SR), '-'])
    return np.frombuffer(raw, dtype='<f4').reshape(-1, channels).copy()

def ease(x):
    x = max(0, min(1, x))
    return x*x*(3-2*x)

def lerp(a, b, t):
    return a + (b-a)*t

scenes = []
total = 0
for entry in PLAN['scenes']:
    s = entry.copy()
    s['audio'] = decode(ROOT / 'audio' / (s['id'] + '.mp3'))[:,0]
    s['duration'] = math.ceil(max(s['min_duration'], len(s['audio'])/SR + .85)*FPS)/FPS
    s['start'] = total
    total += s['duration']
    s['words'] = json.loads((ROOT / 'audio' / (s['id'] + '.json')).read_text())
    scenes.append(s)

def click_times(s):
    d, k = s['duration'], s['id']
    return {
      'welcome': [(d-.48,'next')],
      'rules': [(1.1,'field'),(d-.48,'next')],
      'platform': [(2.5,'toggle'),(d-.48,'next')],
      'frequency': [(d-.48,'next')],
      'ready': [(2.5,'toggle'),(d-.48,'next')],
      'gate': [(4.0,'rule0'),(5.1,'rule1'),(6.2,'rule2'),(7.3,'rule3'),(d-.48,'confirm')],
      'newtab': [(2.6,'rule')]
    }.get(k, [])

def shot_key(s, t):
    k = s['id']
    if k=='welcome': return '01-welcome'
    if k=='rules': return '02-rules-before' if t<1.65 else '03-rules-edited'
    if k=='platform': return '04-platform-search' if t<2.5 else '05-platform-saved'
    if k=='frequency': return '06-frequency'
    if k=='ready': return '07-ready-before' if t<2.5 else '08-ready-enabled'
    if k=='gate':
        count=sum(t>=v for v,_ in click_times(s)[:-1])
        return '09-gate-0' if not count else f'10-gate-{count}'
    if k=='success': return '11-confirmed' if t<2.25 else '12-workspace'
    if k=='newtab': return '13-newtab' if t<2.6 else '14-newtab-checked'

def text(draw, xy, value, size=36, fill=WHITE, bold=False, anchor=None):
    draw.text(xy,value,font=font(size,bold),fill=fill,anchor=anchor,stroke_width=0)

def fit_text(draw, xy, value, size, width, fill=WHITE, bold=False):
    while draw.textlength(value,font=font(size,bold))>width:
        size-=1
    text(draw,xy,value,size,fill,bold)

def wrap(value, size=42, width=900):
    result, line=[], ''
    for word in value.split():
        candidate=(line+' '+word).strip()
        if font(size).getlength(candidate)>width and line:
            result.append(line);line=word
        else: line=candidate
    if line: result.append(line)
    return result

BASE = Image.new('RGB',(W,H),'#060d16')
bd=ImageDraw.Draw(BASE)
for y in range(H):
    t=y/H
    bd.line((0,y,W,y),fill=(6+int(3*t),13+int(3*t),22+int(6*t)))
for x in range(0,W,120): bd.line((x,0,x,H),fill='#101e2b',width=1)
for y in range(0,H,120): bd.line((0,y,W,y),fill='#101e2b',width=1)

HAKI = Image.open(ROOT/'assets/haki.png').convert('RGBA')
MIRRA = Image.open(ROOT/'assets/mirra.png').convert('RGB')

@functools.lru_cache(None)
def screenshot(key):
    return Image.open(ROOT/'captures-portrait'/META[key]['file']).convert('RGB')

def pan_value(s,t,maxpan):
    k=s['id']; d=s['duration']
    if k=='rules': return lerp(90,maxpan,ease((t-2.7)/(d-4)))
    if k=='platform': return lerp(min(230,maxpan),maxpan,ease((t-4)/(d-5)))
    if k=='frequency': return lerp(40,maxpan,ease((t-2.7)/(d-3.6)))
    if k=='ready': return lerp(min(200,maxpan),maxpan,ease((t-1.5)/2.0))
    if k=='gate': return lerp(0,maxpan,ease((t-1.6)/2.1))
    if k=='newtab': return maxpan*.5
    return 0

def cursor(im, x,y, pulse=0, opacity=255):
    layer=Image.new('RGBA',im.size)
    d=ImageDraw.Draw(layer)
    if pulse:
        r=18+pulse*44; a=int((1-pulse)*210)
        d.ellipse((x-r,y-r,x+r,y+r),outline=(75,202,255,a),width=5)
    # Small, crisp pointer. No OS/computer-use cursor is recorded.
    pts=[(x,y),(x+3,y+47),(x+15,y+35),(x+26,y+53),(x+37,y+47),(x+25,y+29),(x+42,y+26)]
    d.polygon([(a+3,b+4) for a,b in pts],fill=(0,0,0,90))
    d.polygon(pts,fill=(246,250,255,opacity),outline=(6,18,31,opacity),width=2)
    im.paste(layer,(0,0),layer)

def ui_card(im,s,t):
    key=shot_key(s,t); source=screenshot(key)
    x,y,cw,ch=60,408,960,1135
    d=ImageDraw.Draw(im)
    d.rounded_rectangle((x,y+14,x+cw,y+ch+14),32,fill='#03070d')
    d.rounded_rectangle((x,y,x+cw,y+ch),30,fill='#101e2d',outline='#2a3c50',width=2)
    label='HAKI / SETUP'
    if s['id']=='gate': label='trader.tradovate.com'
    elif s['id']=='success': label='HAKI / CONFIRMED' if t<2.25 else 'SAMPLE WORKSPACE'
    elif s['id']=='newtab':label='HAKI / NEW TAB'
    d.ellipse((x+26,y+25,x+37,y+36),fill=BLUE)
    text(d,(x+53,y+18),label,24,MUTED)
    text(d,(x+cw-37,y+16),'•••',23,MUTED,anchor='ra')
    ix,iy,iw,ih=x+14,y+62,cw-28,ch-78
    scale=iw/source.width
    # Preserve the real UI; pan within the narrow editorial window.
    resized=source.resize((iw,round(source.height*scale)),Image.Resampling.LANCZOS)
    maxpan=max(0,resized.height-ih)
    pan=min(maxpan,max(0,pan_value(s,t,maxpan)))
    viewport=Image.new('RGB',(iw,ih),'#050d15')
    yoffset=round((ih-resized.height)/2) if resized.height<ih else -round(pan)
    viewport.paste(resized,(0,yoffset))
    mask=Image.new('L',(iw,ih));ImageDraw.Draw(mask).rounded_rectangle((0,0,iw,ih),18,fill=255)
    im.paste(viewport,(ix,iy),mask)
    events=click_times(s)
    points=META[key]['points']
    if not points or not events:return
    def pos(name):
        p=points.get(name) or next(iter(points.values()))
        return ix+p['x']*iw,iy+p['y']*resized.height+yoffset
    initial=(ix+iw*.78,iy+ih*.8)
    prev_time,prev_point=0,initial
    active=initial
    for when,name in events:
        target=pos(name)
        if t<when:
            move=ease((t-max(prev_time+.3,when-.95))/.7)
            active=tuple(lerp(a,b,move) for a,b in zip(prev_point,target))
            break
        prev_time,prev_point=when,target
        active=target
    pulse=0
    for when,_ in events:
        if 0<t-when<.45:pulse=(t-when)/.45
    if iy+8<=active[1]<=iy+ih-55:
        cursor(im,*active,pulse=pulse)

def captions(s):
    phrases={
      'intro':['Your rules.','Before your emotions.','Meet Haki.'],
      'welcome':['After installing Haki,','select Get Started.'],
      'rules':['Make these rules your own.','Edit a rule, or add another.','Then continue.'],
      'platform':['Find your trading platform','and turn protection on.','Allow site access','when your browser asks.'],
      'frequency':['Choose how often Haki appears.','Here, we’re using','every new trading tab.'],
      'ready':['Want your rules on every new tab?','Turn this on,','then finish setup.'],
      'gate':['Open your trading platform.','Haki brings up your rules.','Read and check each one,','then select Ready to Trade.'],
      'success':['Confirmed.','Now you’re back to','your trading workspace.'],
      'newtab':['And your new tab keeps','those same rules within reach.'],
      'end':['Powered by join Mirra dot app.','Copy trade your prop firm accounts!']
    }[s['id']]
    words=s['words'];chunks=[];index=0
    for phrase in phrases:
        first=index;index+=len(phrase.split())
        assert index<=len(words),(s['id'],phrase,len(words))
        start=words[first]['offset']/1e7+.35
        last=words[index-1]
        end=last['offset']/1e7+last['duration']/1e7+.65
        chunks.append({'start':start,'end':end,'text':phrase})
    assert index==len(words),(s['id'],index,len(words))
    for a,b in zip(chunks,chunks[1:]):a['end']=min(a['end'],b['start']-.025)
    if s['id']=='end':
        chunks[0]['text']='Powered by joinmirra.app'
    return chunks

for s in scenes:s['captions']=captions(s)

def render(s,t):
    k=s['id'];d=s['duration'];im=BASE.copy();dr=ImageDraw.Draw(im)
    progress=(s['start']+t)/total
    dr.rounded_rectangle((76,1810,1004,1814),2,fill='#223347')
    dr.rounded_rectangle((76,1810,76+928*progress,1814),2,fill=BLUE)
    if k not in ('intro','end'):
        icon=HAKI.resize((62,62),Image.Resampling.LANCZOS);im.paste(icon,(76,100),icon)
        text(dr,(154,111),'H A K I',31,WHITE,True)
        text(dr,(1004,119),'YOUR PRE-TRADE RITUAL',20,MUTED,anchor='ra')
        text(dr,(76,226),s['label'],25,BLUE,True)
        fit_text(dr,(74,275),s['title'][0],60,940,WHITE,True)
        ui_card(im,s,t)
        dr=ImageDraw.Draw(im)
    elif k=='intro':
        icon=HAKI.resize((116,116),Image.Resampling.LANCZOS);im.paste(icon,(76,185),icon)
        text(dr,(217,218),'H A K I',48,WHITE,True)
        text(dr,(76,354),'WILLPOWER BEFORE EXECUTION',25,BLUE,True)
        slide=round((1-ease(t/.65))*32)
        text(dr,(72,455+slide),'Your rules.',98,WHITE,True)
        text(dr,(72,573+slide),'Before your',87,WHITE,True)
        text(dr,(72,683+slide),'emotions.',98,BLUE,True)
        dr.line((78,856,220,856),fill=BLUE,width=5)
        text(dr,(76,906),'A small pause before you trade.',38,MUTED)
        # Preview a real checklist detail, with gentle editorial motion.
        card=screenshot('10-gate-4').crop((32,520,888,1110))
        card=card.resize((916,631),Image.Resampling.LANCZOS)
        im.paste(card,(82,1045-round(ease(t/4)*12)))
    elif k=='end':
        im=Image.new('RGB',(W,H),'#000000');dr=ImageDraw.Draw(im)
        # Original MIRRA logo, resized without redrawing its shape.
        logo=MIRRA.resize((205,205),Image.Resampling.LANCZOS)
        im.paste(logo,(438,383))
        text(dr,(540,655),'Powered by',48,'#bdc5cd',anchor='mm')
        text(dr,(540,794),'joinmirra.app',94,GREEN,True,anchor='mm')
        dr.line((451,914,629,914),fill=GREEN,width=4)
        text(dr,(540,1037),'Copy trade your',64,WHITE,True,anchor='mm')
        text(dr,(540,1125),'prop firm accounts!',64,WHITE,True,anchor='mm')
        dr.rounded_rectangle((333,1315,747,1407),46,fill='#0a2115',outline='#145e35',width=2)
        text(dr,(540,1361),'joinmirra.app  →',35,GREEN,True,anchor='mm')
        text(dr,(540,1710),'H A K I   ×   M I R R A',25,'#829b8c',anchor='mm')
    if k not in ('intro','end'):
        active=next((c for c in s['captions'] if c['start']<=t<c['end']),None)
        if active:
            lines=wrap(active['text'],42,900)
            top=1596+(2-len(lines))*27
            dr.rounded_rectangle((64,1572,1016,1767),24,fill='#07121e')
            for j,line in enumerate(lines):text(dr,(540,top+j*56),line,42,WHITE,anchor='ma')
    # Brief editorial dip avoids abrupt jumps between steps.
    fade=min(1,t/.18,(d-t)/.15)
    if k=='intro':fade=min(1,t/.35)
    if k=='end':fade=min(1,t/.35,(d-t)/.7)
    if fade<1:im=Image.blend(Image.new('RGB',(W,H),'#040911' if k!='end' else 'black'),im,max(0,fade))
    return im

def timestamp(sec):
    ms=round(sec*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
    return f'{h:02}:{m:02}:{s:02},{ms:03}'

def write_outputs():
    timeline=[];subs=[];n=1
    for s in scenes:
        timeline.append({k:s[k] for k in ['id','start','duration','speech']})
        for c in s['captions']:
            subs.append(f"{n}\n{timestamp(s['start']+c['start'])} --> {timestamp(s['start']+c['end'])}\n{c['text']}\n")
            n+=1
    (OUT/'timeline.json').write_text(json.dumps({'width':W,'height':H,'fps':FPS,'duration':total,'scenes':timeline},indent=2))
    (OUT/'haki-walkthrough.srt').write_text('\n'.join(subs))
    render(scenes[0],2.5).save(OUT/'haki-poster.png')
    contact=Image.new('RGB',(1080,1920),'#080f18')
    for i,s in enumerate(scenes):
        frame=render(s,min(s['duration']-1,max(1,s['duration']*.65)))
        frame.thumbnail((270,480));contact.paste(frame,((i%4)*270,(i//4)*480))
    contact.save(OUT/'storyboard.jpg',quality=94)

def audio_mix():
    n=round(total*SR)
    music=decode(ROOT/'audio'/PLAN['music']['file'],2,offset=12,duration=total)
    if len(music)<n:music=np.pad(music,((0,n-len(music)),(0,0)))
    music=music[:n]
    # Low, steady lofi bed; brief lift in narration gaps.
    rms=np.sqrt(np.mean(music**2));music*=.025/max(rms,1e-6)
    voice=np.zeros(n,dtype=np.float32)
    effects=np.zeros(n,dtype=np.float32)
    for s in scenes:
        v=s['audio'].copy(); rms=np.sqrt(np.mean(v[np.abs(v)>.005]**2))
        v*=min(.125/max(rms,1e-6),.68/max(np.max(np.abs(v)),1e-6))
        begin=round((s['start']+.35)*SR);voice[begin:begin+len(v)]+=v
        for at,_ in click_times(s):
            tick=np.arange(round(.045*SR))/SR
            sound=(np.sin(2*np.pi*1650*tick)*.5+np.sin(2*np.pi*2400*tick)*.25)*np.exp(-tick*145)*.07
            j=round((s['start']+at)*SR);effects[j:j+len(sound)]+=sound
    final=music+voice[:,None]+effects[:,None]
    fadein=round(.8*SR);fadeout=round(1.35*SR)
    final[:fadein]*=np.linspace(0,1,fadein)[:,None]
    final[-fadeout:]*=np.linspace(1,0,fadeout)[:,None]
    assert np.max(np.abs(final))<1, 'Audio mix clipped'
    with wave.open(str(OUT/'mix.wav'),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((final*32767).astype('<i2').tobytes())

def video():
    silent=OUT/'silent.mp4'
    args=[FF,'-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(silent)]
    with subprocess.Popen(args,stdin=subprocess.PIPE) as p:
        for s in scenes:
            print('Rendering',s['id'],s['duration'],flush=True)
            for frame in range(round(s['duration']*FPS)):
                p.stdin.write(render(s,frame/FPS).tobytes())
        p.stdin.close();p.wait()
        if p.returncode:raise RuntimeError('Video encoding failed')
    audio_mix()
    target=OUT/'haki-walkthrough-9x16.mp4'
    subprocess.run([FF,'-v','error','-y','-i',str(silent),'-i',str(OUT/'mix.wav'),'-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','256k','-ar','48000','-af','loudnorm=I=-16:TP=-1.5:LRA=9','-movflags','+faststart','-metadata','title=Haki — Your rules before you trade','-metadata','comment=Actual Haki UI; isolated demonstration. Music: Happy Trails by Purrple Cat, FreeLofi License.','-shortest',str(target)],check=True)
    print('Exported',target,'duration',total,flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--preview',action='store_true');args=parser.parse_args()
    write_outputs()
    print('Duration:',total,'seconds',flush=True)
    if not args.preview:video()
