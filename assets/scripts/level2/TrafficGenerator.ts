import {
    GeneratedTrafficVehicle,
    SafeCorridorNode,
    TrafficVehicleKind,
    TRAFFIC_CAT_FORWARD_SPEED,
    TRAFFIC_LANE_Y,
    TRAFFIC_LEVEL_LENGTH,
    TRAFFIC_SAFE_START_END,
    TRAFFIC_ZONES,
    closedTrafficLanesAt,
    openTrafficLanesAt,
    trafficLaneDirection,
    trafficZoneAt,
    vehicleDimensions,
} from './TrafficTypes';

function clamp(value:number,min:number,max:number){return Math.max(min,Math.min(max,value));}
function smoothstep(value:number){const t=clamp(value,0,1);return t*t*(3-2*t);}

export class SeededRandom{
    private state:number;
    constructor(seed:number){this.state=seed>>>0;}
    next(){
        let a=this.state|0;a=a+0x6D2B79F5|0;
        let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;
        this.state=a;
        return ((t^t>>>14)>>>0)/4294967296;
    }
    range(min:number,max:number){return min+(max-min)*this.next();}
    pick<T>(values:T[]){return values[Math.min(values.length-1,Math.floor(this.next()*values.length))];}
}

export class SafeCorridor{
    readonly nodes:SafeCorridorNode[]=[];
    constructor(private rng:SeededRandom){this.build();}

    private build(){
        this.nodes.length=0;
        let lane=this.rng.pick([1,2]);
        let worldX=160;
        while(worldX<TRAFFIC_LEVEL_LENGTH+900){
            const open=openTrafficLanesAt(worldX+520);
            if(this.nodes.length){
                let candidates=[lane];
                if(lane>0)candidates.push(lane-1);
                if(lane<TRAFFIC_LANE_Y.length-1)candidates.push(lane+1);
                candidates=candidates.filter(candidate=>open.includes(candidate));
                if(!candidates.length)candidates=open.slice().sort((a,b)=>Math.abs(a-lane)-Math.abs(b-lane)).slice(0,2);
                lane=this.rng.pick(candidates.concat(candidates.includes(lane)?[lane,lane]:[]));
            }else if(!open.includes(lane))lane=this.rng.pick(open);
            this.nodes.push({x:worldX,lane});
            const zone=trafficZoneAt(worldX);
            worldX+=['jam','construction','accident'].includes(zone.kind)?this.rng.range(360,470):this.rng.range(500,680);
        }
    }

    laneFloatAt(worldX:number){
        if(worldX<=this.nodes[0].x)return this.nodes[0].lane;
        for(let i=0;i<this.nodes.length-1;i++){
            const a=this.nodes[i],b=this.nodes[i+1];
            if(worldX<a.x||worldX>b.x)continue;
            let t=(worldX-a.x)/(b.x-a.x);
            t=smoothstep(clamp((t-.20)/.60,0,1));
            return a.lane+(b.lane-a.lane)*t;
        }
        return this.nodes[this.nodes.length-1].lane;
    }

    yAt(worldX:number){
        const lane=this.laneFloatAt(worldX),lo=Math.floor(lane),hi=Math.ceil(lane),t=lane-lo;
        if(lo===hi)return TRAFFIC_LANE_Y[clamp(lo,0,TRAFFIC_LANE_Y.length-1)];
        return TRAFFIC_LANE_Y[lo]+(TRAFFIC_LANE_Y[hi]-TRAFFIC_LANE_Y[lo])*t;
    }
}

export interface TrafficGenerationResult{
    seed:number;
    corridor:SafeCorridor;
    vehicles:GeneratedTrafficVehicle[];
}

export class TrafficGenerator{
    private rng!:SeededRandom;
    private corridor!:SafeCorridor;
    private vehicles:GeneratedTrafficVehicle[]=[];
    private nextId=1;

    generate(seed=Math.floor(Math.random()*900000)+100000):TrafficGenerationResult{
        this.rng=new SeededRandom(seed);
        this.corridor=new SafeCorridor(this.rng);
        this.vehicles=[];
        this.nextId=1;
        for(const zone of TRAFFIC_ZONES){
            if(zone.kind==='start')continue;
            let worldX=Math.max(TRAFFIC_SAFE_START_END+220,zone.start+180);
            while(worldX<Math.min(zone.end,TRAFFIC_LEVEL_LENGTH-260)){
                this.generateAt(worldX,zone.kind);
                const dense=['jam','construction','accident'].includes(zone.kind);
                worldX+=dense?this.rng.range(135,195):this.rng.range(235,315);
            }
        }
        this.forceMerge(3380,0,1,'car');
        this.forceMerge(3520,0,1,'van');
        this.forceMerge(3650,0,1,'bus');
        this.forceMerge(9820,1,0,'car');
        this.forceMerge(9940,1,0,'suv');
        this.forceMerge(9860,2,3,'van');
        this.forceMerge(10020,2,3,'bus');
        this.forceTrucks([2500,4700,7600,12600]);
        return {seed,corridor:this.corridor,vehicles:this.vehicles};
    }

    private generateAt(worldX:number,eventKind:GeneratedTrafficVehicle['eventKind']){
        const safeLane=this.corridor.laneFloatAt(worldX);
        const reserved=new Set([Math.floor(safeLane),Math.ceil(safeLane)].map(value=>clamp(value,0,3)));
        const available=openTrafficLanesAt(worldX).filter(lane=>!reserved.has(lane));
        if(!available.length)return;
        const dense=['jam','construction','accident'].includes(eventKind);
        const wanted=Math.min(available.length,dense?(this.rng.next()<.75?available.length:Math.max(1,available.length-1)):(this.rng.next()<.48?2:1));
        const shuffled=available.slice().sort(()=>this.rng.next()-.5);
        for(let i=0;i<wanted;i++){
            for(let attempt=0;attempt<34;attempt++){
                const candidate=this.makeCandidate(worldX+this.rng.range(-65,65),shuffled[i],eventKind);
                if(candidate.changePlanned&&closedTrafficLanesAt(candidate.encounterX+160).has(candidate.targetLane))candidate.changePlanned=false;
                if(!this.respectsSafeCorridor(candidate)||this.overlapsExisting(candidate))continue;
                this.vehicles.push(candidate);break;
            }
        }
    }

    private chooseKind():TrafficVehicleKind{
        const roll=this.rng.next();
        if(roll<.10)return 'truck';
        if(roll<.19)return 'bus';
        if(roll<.36)return 'van';
        if(roll<.60)return 'suv';
        return 'car';
    }

    private makeCandidate(encounterX:number,lane:number,eventKind:GeneratedTrafficVehicle['eventKind']){
        const kind=this.chooseKind(),dims=vehicleDimensions(kind),direction=trafficLaneDirection(lane);
        const congested=['jam','construction','accident'].includes(eventKind);
        const speed=congested?(direction>0?this.rng.range(16,48):-this.rng.range(26,58)):(direction>0?this.rng.range(70,112):-this.rng.range(125,168));
        const encounterTime=encounterX/TRAFFIC_CAT_FORWARD_SPEED;
        const vehicle:GeneratedTrafficVehicle={
            id:this.nextId++,kind,lane,targetLane:lane,worldX:0,startWorldX:encounterX-speed*encounterTime+this.rng.range(-60,60),
            speed,baseSpeed:speed,...dims,encounterX,encounterTime,changePlanned:false,changeStartTime:0,
            changeDuration:congested?this.rng.range(1.45,2.1):this.rng.range(1.15,1.7),eventKind,
            jamPhase:this.rng.range(0,Math.PI*2),jamRate:this.rng.range(.55,.95),frameIndex:Math.floor(this.rng.range(0,4)),
        };
        const chance=eventKind==='jam'?.58:eventKind==='construction'?.62:eventKind==='accident'?.66:.34;
        if(kind!=='truck'&&this.rng.next()<chance){
            const options:number[]=[];
            if(lane>0&&trafficLaneDirection(lane-1)===direction)options.push(lane-1);
            if(lane<3&&trafficLaneDirection(lane+1)===direction)options.push(lane+1);
            const valid=options.filter(target=>!closedTrafficLanesAt(encounterX+speed*1.2).has(target));
            if(valid.length){vehicle.targetLane=this.rng.pick(valid);vehicle.changePlanned=true;vehicle.changeStartTime=Math.max(.45,encounterTime-this.rng.range(1,2.4));}
        }
        vehicle.worldX=vehicle.startWorldX;
        return vehicle;
    }

    private trajectoryY(vehicle:GeneratedTrafficVehicle,time:number){
        const from=TRAFFIC_LANE_Y[vehicle.lane];
        if(!vehicle.changePlanned||time<vehicle.changeStartTime)return from;
        if(time>vehicle.changeStartTime+vehicle.changeDuration)return TRAFFIC_LANE_Y[vehicle.targetLane];
        const t=smoothstep((time-vehicle.changeStartTime)/vehicle.changeDuration);
        return from+(TRAFFIC_LANE_Y[vehicle.targetLane]-from)*t;
    }
    private trajectoryX(vehicle:GeneratedTrafficVehicle,time:number){return vehicle.startWorldX+vehicle.baseSpeed*time;}

    private respectsSafeCorridor(vehicle:GeneratedTrafficVehicle){
        for(let time=Math.max(0,vehicle.encounterTime-2);time<=vehicle.encounterTime+2;time+=.38){
            const worldX=this.trajectoryX(vehicle,time),vehicleY=this.trajectoryY(vehicle,time);
            const nearest=TRAFFIC_LANE_Y.reduce((best,value,index)=>Math.abs(value-vehicleY)<Math.abs(TRAFFIC_LANE_Y[best]-vehicleY)?index:best,0);
            if(closedTrafficLanesAt(worldX).has(nearest))return false;
            const margin=vehicle.kind==='truck'?92:vehicle.kind==='bus'?82:72;
            if(Math.abs(vehicleY-this.corridor.yAt(worldX))<margin)return false;
        }
        return true;
    }

    private overlapsExisting(vehicle:GeneratedTrafficVehicle){
        for(const other of this.vehicles){
            const lo=Math.max(0,vehicle.encounterTime-3.7,other.encounterTime-3.7),hi=Math.min(vehicle.encounterTime+3.7,other.encounterTime+3.7);
            if(lo>hi)continue;
            for(let time=lo;time<=hi;time+=.38){
                const dx=Math.abs(this.trajectoryX(vehicle,time)-this.trajectoryX(other,time));
                const dy=Math.abs(this.trajectoryY(vehicle,time)-this.trajectoryY(other,time));
                if(dx<(vehicle.width+other.width)*.5+28&&dy<(vehicle.height+other.height)*.5+12)return true;
            }
        }
        return false;
    }

    private forceMerge(encounterX:number,lane:number,targetLane:number,kind:TrafficVehicleKind){
        const zone=trafficZoneAt(encounterX),dims=vehicleDimensions(kind),direction=trafficLaneDirection(lane);
        const speed=['construction','accident'].includes(zone.kind)?(direction>0?34:-42):(direction>0?78:-140);
        const encounterTime=encounterX/TRAFFIC_CAT_FORWARD_SPEED;
        const vehicle:GeneratedTrafficVehicle={
            id:this.nextId++,kind,lane,targetLane,worldX:0,startWorldX:encounterX-speed*encounterTime,speed,baseSpeed:speed,
            ...dims,encounterX,encounterTime,changePlanned:true,changeStartTime:Math.max(.4,encounterTime-2),changeDuration:1.65,
            eventKind:zone.kind,jamPhase:this.rng.range(0,Math.PI*2),jamRate:.7,frameIndex:Math.floor(this.rng.range(0,4)),
        };
        vehicle.worldX=vehicle.startWorldX;
        if(this.respectsSafeCorridor(vehicle)&&!this.overlapsExisting(vehicle))this.vehicles.push(vehicle);
    }

    private forceTrucks(points:number[]){
        for(const encounterX of points){
            const zone=trafficZoneAt(encounterX),open=openTrafficLanesAt(encounterX),safeY=this.corridor.yAt(encounterX);
            const lanes=open.slice().sort((a,b)=>Math.abs(TRAFFIC_LANE_Y[b]-safeY)-Math.abs(TRAFFIC_LANE_Y[a]-safeY));
            for(const lane of lanes){
                const direction=trafficLaneDirection(lane),congested=['jam','construction','accident'].includes(zone.kind),speed=congested?(direction>0?30:-40):(direction>0?80:-140);
                const encounterTime=encounterX/TRAFFIC_CAT_FORWARD_SPEED,dims=vehicleDimensions('truck');
                const vehicle:GeneratedTrafficVehicle={
                    id:this.nextId++,kind:'truck',lane,targetLane:lane,worldX:0,startWorldX:encounterX-speed*encounterTime,speed,baseSpeed:speed,
                    ...dims,encounterX,encounterTime,changePlanned:false,changeStartTime:0,changeDuration:1,eventKind:zone.kind,
                    jamPhase:this.rng.range(0,Math.PI*2),jamRate:.7,frameIndex:Math.floor(this.rng.range(0,4)),
                };
                vehicle.worldX=vehicle.startWorldX;
                if(this.respectsSafeCorridor(vehicle)&&!this.overlapsExisting(vehicle)){this.vehicles.push(vehicle);break;}
            }
        }
    }
}
