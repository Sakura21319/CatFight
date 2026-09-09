import { Node, AudioSource, AudioClip, resources } from 'cc';
export class GardenAudio {
    enabled=false;
    private music:AudioSource;
    private sfx:AudioSource;
    private clips=new Map<string,AudioClip>();
    constructor(parent:Node){
        const m=new Node('Replaceable background music');parent.addChild(m);this.music=m.addComponent(AudioSource);this.music.loop=true;this.music.volume=0.12;
        const n=new Node('Replaceable cat sounds');parent.addChild(n);this.sfx=n.addComponent(AudioSource);this.sfx.volume=0.18;
        for(const name of ['music','hiss','fight','place'])resources.load('audio/'+name,AudioClip,(error,clip)=>{if(error){console.warn('Audio unavailable',name);return;}this.clips.set(name,clip);if(name==='music'){this.music.clip=clip;if(this.enabled)this.music.play();}});
    }
    toggle(){this.enabled=!this.enabled;if(this.enabled){if(this.music.clip)this.music.play();}else{this.music.stop();this.sfx.stop();}}
    play(name:string){const clip=this.clips.get(name);if(this.enabled&&clip)this.sfx.playOneShot(clip,0.25);}
}
