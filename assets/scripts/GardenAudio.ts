import { Node, AudioSource, AudioClip, assetManager } from 'cc';
import { audioAllowed } from './AudioPolicy';
export class GardenAudio {
    enabled=false;
    private hasCats=false;
    private music:AudioSource;
    private sfx:AudioSource;
    private clips=new Map<string,AudioClip>();
    private lastHiss=-1;
    constructor(parent:Node){
        const m=new Node('Replaceable background music');parent.addChild(m);this.music=m.addComponent(AudioSource);this.music.loop=true;this.music.volume=0.12;
        const n=new Node('Replaceable cat sounds');parent.addChild(n);this.sfx=n.addComponent(AudioSource);this.sfx.volume=0.18;
        assetManager.loadBundle('audio-pack',(bundleError,bundle)=>{
            if(bundleError||!bundle){console.warn('Audio bundle unavailable',bundleError);return;}
            for(const name of ['music','fight','place','laowu1','laowu2','laowu3','laowu4','laowu5'])bundle.load(name,AudioClip,(error,clip)=>{if(error){console.warn('Audio unavailable',name);return;}this.clips.set(name,clip);if(name==='music'){this.music.clip=clip;if(audioAllowed(this.enabled,this.hasCats))this.music.play();}});
        });
    }
    toggle(){this.enabled=!this.enabled;if(audioAllowed(this.enabled,this.hasCats)){if(this.music.clip)this.music.play();}else{this.music.stop();this.sfx.stop();}}
    setCatsPresent(present:boolean){this.hasCats=present;if(!audioAllowed(this.enabled,this.hasCats)){this.music.stop();this.sfx.stop();}else if(this.music.clip&&!this.music.playing)this.music.play();}
    play(name:string){const clip=this.clips.get(name);if(audioAllowed(this.enabled,this.hasCats)&&clip)this.sfx.playOneShot(clip,0.25);}
    playRandomConfrontation(){
        if(!audioAllowed(this.enabled,this.hasCats))return;
        const available:number[]=[];for(let i=1;i<=5;i++)if(this.clips.has('laowu'+i))available.push(i);
        if(!available.length)return;
        let candidates=available.filter(i=>i!==this.lastHiss);if(!candidates.length)candidates=available;
        const chosen=candidates[Math.floor(Math.random()*candidates.length)];this.lastHiss=chosen;
        this.sfx.stop();this.sfx.playOneShot(this.clips.get('laowu'+chosen)!,0.38);
    }
}
