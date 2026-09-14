export function audioAllowed(enabled:boolean,hasCats:boolean){return enabled&&hasCats;}
export function backgroundMusicAllowed(enabled:boolean,hasCats:boolean,inGallery:boolean){return audioAllowed(enabled,hasCats)&&!inGallery;}
export function soundEffectAllowed(enabled:boolean,hasCats:boolean,inGallery:boolean,name:string){return audioAllowed(enabled,hasCats)&&!(inGallery&&(name==='fight'||name==='confrontation'));}
