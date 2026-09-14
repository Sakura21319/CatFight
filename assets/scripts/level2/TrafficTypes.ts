export type TrafficVehicleKind='car'|'suv'|'van'|'bus'|'truck';
export type TrafficEventKind='start'|'clear'|'construction'|'jam'|'rain'|'accident';

export interface TrafficZone{
    start:number;
    end:number;
    kind:TrafficEventKind;
    label:string;
    wet:boolean;
}

export interface SafeCorridorNode{
    x:number;
    lane:number;
}

export interface GeneratedTrafficVehicle{
    id:number;
    kind:TrafficVehicleKind;
    lane:number;
    targetLane:number;
    worldX:number;
    startWorldX:number;
    speed:number;
    baseSpeed:number;
    width:number;
    height:number;
    attractionRadius:number;
    attractionPower:number;
    encounterX:number;
    encounterTime:number;
    changePlanned:boolean;
    changeStartTime:number;
    changeDuration:number;
    eventKind:TrafficEventKind;
    jamPhase:number;
    jamRate:number;
    frameIndex:number;
}

export const TRAFFIC_LEVEL_LENGTH=14500;
export const TRAFFIC_SAFE_START_END=1500;
export const TRAFFIC_CAT_FORWARD_SPEED=195;
export const TRAFFIC_LANE_Y=[156,52,-52,-156] as const;

export const TRAFFIC_ZONES:TrafficZone[]=[
    {start:0,end:TRAFFIC_SAFE_START_END,kind:'start',wet:false,label:'安全起步区'},
    {start:TRAFFIC_SAFE_START_END,end:3200,kind:'clear',wet:false,label:'道路畅通'},
    {start:3200,end:5250,kind:'construction',wet:false,label:'施工并道'},
    {start:5250,end:6700,kind:'jam',wet:false,label:'道路拥堵'},
    {start:6700,end:8550,kind:'rain',wet:true,label:'雨天湿滑'},
    {start:8550,end:9900,kind:'clear',wet:false,label:'道路畅通'},
    {start:9900,end:11900,kind:'accident',wet:false,label:'事故封路'},
    {start:11900,end:13300,kind:'jam',wet:false,label:'事故后拥堵'},
    {start:13300,end:TRAFFIC_LEVEL_LENGTH+500,kind:'clear',wet:false,label:'道路畅通'},
];

export function trafficZoneAt(worldX:number){
    return TRAFFIC_ZONES.find(zone=>worldX>=zone.start&&worldX<zone.end)??TRAFFIC_ZONES[TRAFFIC_ZONES.length-1];
}

export function closedTrafficLanesAt(worldX:number){
    const zone=trafficZoneAt(worldX);
    if(zone.kind==='construction'&&worldX>3500&&worldX<5050)return new Set<number>([0]);
    if(zone.kind==='accident'&&worldX>10150&&worldX<11680)return new Set<number>([1,2]);
    return new Set<number>();
}

export function openTrafficLanesAt(worldX:number){
    const closed=closedTrafficLanesAt(worldX);
    return [0,1,2,3].filter(lane=>!closed.has(lane));
}

export function trafficLaneDirection(lane:number){return lane<=1?1:-1;}

export function vehicleDimensions(kind:TrafficVehicleKind){
    switch(kind){
        case 'truck':return {width:242,height:94,attractionRadius:285,attractionPower:455};
        case 'bus':return {width:218,height:82,attractionRadius:245,attractionPower:335};
        case 'van':return {width:174,height:72,attractionRadius:205,attractionPower:260};
        case 'suv':return {width:160,height:70,attractionRadius:200,attractionPower:258};
        default:return {width:146,height:66,attractionRadius:195,attractionPower:238};
    }
}
