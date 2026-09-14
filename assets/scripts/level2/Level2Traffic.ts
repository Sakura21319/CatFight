import {
    _decorator, assetManager, BlockInputEvents, Canvas, Color, Component, EventKeyboard, EventMouse, EventTouch,
    Graphics, input, Input, KeyCode, Label, Layers, Node, Rect, Size, Sprite, SpriteFrame, Texture2D, UITransform, Vec3
} from 'cc';
import { TrafficGenerator } from './TrafficGenerator';
import {
    GeneratedTrafficVehicle, TRAFFIC_CAT_FORWARD_SPEED, TRAFFIC_LANE_Y, TRAFFIC_LEVEL_LENGTH,
    closedTrafficLanesAt, trafficLaneDirection, trafficZoneAt,
} from './TrafficTypes';

const { ccclass } = _decorator;

type RuntimeVehicle = GeneratedTrafficVehicle & {
    node: Node;
    sprite: Sprite | null;
    changing: boolean;
    changeStartRuntime: number;
    brakeTimer: number;
    closeWarned: boolean;
};

@ccclass('Level2Traffic')
export class Level2Traffic extends Component {
    private ui: Node | null = null;
    private canvas: Canvas | null = null;
    private overlay: Node | null = null;
    private worldLayer: Node | null = null;
    private roadGraphics: Graphics | null = null;
    private eventGraphics: Graphics | null = null;
    private rainGraphics: Graphics | null = null;
    private vehicleLayer: Node | null = null;
    private catNode: Node | null = null;
    private catSprite: Sprite | null = null;
    private forceTrack: Node | null = null;
    private forceKnob: Node | null = null;
    private statusLabel: Label | null = null;
    private progressLabel: Label | null = null;
    private messageLabel: Label | null = null;
    private dangerFill: Node | null = null;
    private resultPanel: Node | null = null;
    private resultTitle: Label | null = null;
    private resultHint: Label | null = null;

    private carFrames: SpriteFrame[][] = [];
    private truckFrames: SpriteFrame[][] = [];
    private catNormal: SpriteFrame | null = null;
    private catHiss: SpriteFrame | null = null;
    private catHit: SpriteFrame | null = null;

    private vehicles: RuntimeVehicle[] = [];
    private seed = 0;
    private active = false;
    private boundMenu = false;
    private elapsed = 0;
    private progress = 0;
    private catY = 0;
    private catVY = 0;
    private control = 0;
    private keyboardControl = 0;
    private dragging = false;
    private pointerId = -1;
    private failed = false;
    private won = false;
    private lastZoneKey = '';
    private messageTimer = 0;
    private attractionStrength = 0;

    private readonly catScreenX = -430;
    private readonly roadTop = 220;
    private readonly roadBottom = -220;
    private readonly forceRange = 145;

    start() {
        input.on(Input.EventType.KEY_DOWN, this.keyDown, this);
        input.on(Input.EventType.KEY_UP, this.keyUp, this);
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.keyDown, this);
        input.off(Input.EventType.KEY_UP, this.keyUp, this);
        this.clearVehicles();
    }

    update(dt: number) {
        dt = Math.min(dt, 0.05);
        if (!this.ensureAttached()) return;
        if (!this.boundMenu) this.bindLevel2Menu();
        if (!this.active) return;
        this.updateLevel(dt);
    }

    private ensureAttached() {
        if (this.overlay) return true;
        this.ui = this.node.getChildByName('Garden UI');
        if (!this.ui) return false;
        this.canvas = this.ui.getComponent(Canvas);
        if (!this.canvas) return false;
        this.buildUI();
        this.loadAssets();
        return true;
    }

    private findDescendant(root: Node, name: string): Node | null {
        if (root.name === name) return root;
        for (const child of root.children) {
            const found = this.findDescendant(child, name);
            if (found) return found;
        }
        return null;
    }

    private bindLevel2Menu() {
        if (!this.ui) return;
        const art = this.findDescendant(this.ui, '第二关 card background');
        if (!art) return;
        this.boundMenu = true;
        art.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            event.propagationStopped = true;
            this.startLevel();
        });
        art.on(Node.EventType.MOUSE_UP, (event: EventMouse) => {
            event.propagationStopped = true;
            this.startLevel();
        });
    }

    private buildUI() {
        if (!this.ui) return;

        this.overlay = new Node('Level2 Traffic Overlay');
        this.overlay.layer = Layers.Enum.UI_2D;
        this.ui.addChild(this.overlay);
        this.overlay.addComponent(UITransform).setContentSize(1280, 720);
        this.overlay.addComponent(BlockInputEvents);
        this.overlay.active = false;

        this.worldLayer = new Node('Level2 World');
        this.worldLayer.layer = Layers.Enum.UI_2D;
        this.overlay.addChild(this.worldLayer);
        this.worldLayer.addComponent(UITransform).setContentSize(1280, 720);
        this.roadGraphics = this.worldLayer.addComponent(Graphics);

        const eventNode = new Node('Road Events');
        eventNode.layer = Layers.Enum.UI_2D;
        this.worldLayer.addChild(eventNode);
        eventNode.addComponent(UITransform).setContentSize(1280, 720);
        this.eventGraphics = eventNode.addComponent(Graphics);

        this.vehicleLayer = new Node('Traffic Vehicles');
        this.vehicleLayer.layer = Layers.Enum.UI_2D;
        this.worldLayer.addChild(this.vehicleLayer);
        this.vehicleLayer.addComponent(UITransform).setContentSize(1280, 720);

        this.catNode = new Node('Level2 Cat');
        this.catNode.layer = Layers.Enum.UI_2D;
        this.worldLayer.addChild(this.catNode);
        this.catNode.addComponent(UITransform).setContentSize(116, 116);
        this.catSprite = this.catNode.addComponent(Sprite);
        this.catSprite.type = Sprite.Type.SIMPLE;
        this.catSprite.sizeMode = Sprite.SizeMode.CUSTOM;

        const rainNode = new Node('Rain Overlay');
        rainNode.layer = Layers.Enum.UI_2D;
        this.overlay.addChild(rainNode);
        rainNode.addComponent(UITransform).setContentSize(1280, 720);
        this.rainGraphics = rainNode.addComponent(Graphics);

        this.statusLabel = this.makeLabel(this.overlay, 'Road state', '安全起步区', -420, 316, 20, 300);
        this.progressLabel = this.makeLabel(this.overlay, 'Progress', '0%', 420, 316, 20, 150);
        this.messageLabel = this.makeLabel(this.overlay, 'Message', '', 0, 260, 21, 650);
        this.messageLabel.color = new Color(255, 239, 184);
        this.messageLabel.node.active = false;

        const danger = new Node('Danger bar');
        danger.layer = Layers.Enum.UI_2D;
        this.overlay.addChild(danger);
        danger.setPosition(0, 226);
        danger.addComponent(UITransform).setContentSize(300, 13);
        const dg = danger.addComponent(Graphics);
        dg.fillColor = new Color(22, 27, 29, 210);
        dg.roundRect(-150, -6, 300, 12, 6);
        dg.fill();

        this.dangerFill = new Node('Danger fill');
        this.dangerFill.layer = Layers.Enum.UI_2D;
        danger.addChild(this.dangerFill);
        this.dangerFill.setPosition(-150, 0);
        this.dangerFill.addComponent(UITransform).setContentSize(300, 12);
        const fill = this.dangerFill.addComponent(Graphics);
        fill.fillColor = new Color(239, 98, 75);
        fill.roundRect(0, -5, 300, 10, 5);
        fill.fill();
        this.dangerFill.setScale(0.001, 1, 1);

        this.makeForceSlider();
        this.makeButton(this.overlay, '返回', -555, 315, 120, 54, () => this.stopLevel());
        this.makeButton(this.overlay, '换一张', 515, -310, 145, 48, () => this.restart(true));
        this.makeResultPanel();
    }

    private makeForceSlider() {
        if (!this.overlay) return;
        this.forceTrack = new Node('Vertical force slider');
        this.forceTrack.layer = Layers.Enum.UI_2D;
        this.overlay.addChild(this.forceTrack);
        this.forceTrack.setPosition(550, 0);
        this.forceTrack.addComponent(UITransform).setContentSize(150, 390);
        const g = this.forceTrack.addComponent(Graphics);
        g.fillColor = new Color(19, 26, 29, 225);
        g.roundRect(-62, -190, 124, 380, 25);
        g.fill();
        g.lineWidth = 3;
        g.strokeColor = new Color(239, 225, 188, 210);
        g.roundRect(-62, -190, 124, 380, 25);
        g.stroke();
        g.fillColor = new Color(80, 91, 92);
        g.roundRect(-7, -150, 14, 300, 7);
        g.fill();
        g.fillColor = new Color(220, 230, 231, 150);
        g.roundRect(-28, -3, 56, 6, 3);
        g.fill();
        this.makeLabel(this.forceTrack, 'Up label', '↑ 上', 0, 166, 18, 90);
        this.makeLabel(this.forceTrack, 'Down label', '↓ 下', 0, -171, 18, 90);

        this.forceKnob = new Node('Force knob');
        this.forceKnob.layer = Layers.Enum.UI_2D;
        this.forceTrack.addChild(this.forceKnob);
        this.forceKnob.addComponent(UITransform).setContentSize(76, 76);
        const kg = this.forceKnob.addComponent(Graphics);
        kg.fillColor = new Color(232, 83, 59);
        kg.circle(0, 0, 34);
        kg.fill();
        kg.lineWidth = 3;
        kg.strokeColor = new Color(255, 239, 198);
        kg.circle(0, 0, 34);
        kg.stroke();

        const touchId = (event: EventTouch) => ((event as any).getID?.() ?? 0);
        this.forceTrack.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
            event.propagationStopped = true;
            this.pointerId = touchId(event);
            this.dragging = true;
            this.updateControlFromScreen(event.getLocation().y);
        });
        this.forceTrack.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => {
            event.propagationStopped = true;
            if (this.pointerId === touchId(event)) this.updateControlFromScreen(event.getLocation().y);
        });
        const release = (event: EventTouch) => {
            event.propagationStopped = true;
            if (this.pointerId === touchId(event)) {
                this.dragging = false;
                this.pointerId = -1;
            }
        };
        this.forceTrack.on(Node.EventType.TOUCH_END, release);
        this.forceTrack.on(Node.EventType.TOUCH_CANCEL, release);

        this.forceTrack.on(Node.EventType.MOUSE_DOWN, (event: EventMouse) => {
            event.propagationStopped = true;
            this.dragging = true;
            this.pointerId = -2;
            this.updateControlFromScreen(event.getLocation().y);
        });
        this.forceTrack.on(Node.EventType.MOUSE_MOVE, (event: EventMouse) => {
            event.propagationStopped = true;
            if (this.pointerId === -2) this.updateControlFromScreen(event.getLocation().y);
        });
        this.forceTrack.on(Node.EventType.MOUSE_UP, (event: EventMouse) => {
            event.propagationStopped = true;
            this.dragging = false;
            this.pointerId = -1;
        });
    }

    private updateControlFromScreen(screenY: number) {
        if (!this.forceTrack || !this.canvas?.cameraComponent) return;
        const center = this.canvas.cameraComponent.worldToScreen(this.forceTrack.worldPosition, new Vec3());
        this.control = Math.max(-1, Math.min(1, (screenY - center.y) / this.forceRange));
        this.forceKnob?.setPosition(0, this.control * this.forceRange);
    }

    private makeResultPanel() {
        if (!this.overlay) return;
        this.resultPanel = new Node('Traffic result');
        this.resultPanel.layer = Layers.Enum.UI_2D;
        this.overlay.addChild(this.resultPanel);
        this.resultPanel.addComponent(UITransform).setContentSize(1280, 720);
        const dim = this.resultPanel.addComponent(Graphics);
        dim.fillColor = new Color(0, 0, 0, 190);
        dim.rect(-640, -360, 1280, 720);
        dim.fill();

        const card = new Node('Result card');
        card.layer = Layers.Enum.UI_2D;
        this.resultPanel.addChild(card);
        card.addComponent(UITransform).setContentSize(620, 270);
        const cg = card.addComponent(Graphics);
        cg.fillColor = new Color(35, 44, 43, 252);
        cg.roundRect(-310, -135, 620, 270, 24);
        cg.fill();
        cg.lineWidth = 4;
        cg.strokeColor = new Color(255, 229, 141);
        cg.roundRect(-310, -135, 620, 270, 24);
        cg.stroke();

        this.resultTitle = this.makeLabel(card, 'Result title', '', 0, 58, 38, 560);
        this.resultHint = this.makeLabel(card, 'Result hint', '', 0, 7, 18, 540);
        this.makeButton(card, '重试', -145, -76, 210, 60, () => this.restart(false));
        this.makeButton(card, '返回关卡', 145, -76, 210, 60, () => this.stopLevel());
        this.resultPanel.active = false;
    }

    private makeLabel(parent: Node, name: string, text: string, x: number, y: number, size: number, width: number) {
        const node = new Node(name);
        node.layer = Layers.Enum.UI_2D;
        parent.addChild(node);
        node.setPosition(x, y);
        node.addComponent(UITransform).setContentSize(width, size + 16);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = size;
        label.lineHeight = size + 7;
        label.color = new Color(255, 248, 222);
        label.enableOutline = true;
        label.outlineColor = new Color(25, 33, 34);
        label.outlineWidth = 3;
        return label;
    }

    private makeButton(parent: Node, title: string, x: number, y: number, width: number, height: number, action: () => void) {
        const node = new Node(title);
        node.layer = Layers.Enum.UI_2D;
        parent.addChild(node);
        node.setPosition(x, y);
        node.addComponent(UITransform).setContentSize(width, height);
        const g = node.addComponent(Graphics);
        g.fillColor = new Color(37, 52, 55, 242);
        g.roundRect(-width / 2, -height / 2, width, height, 14);
        g.fill();
        g.lineWidth = 3;
        g.strokeColor = new Color(240, 187, 51);
        g.roundRect(-width / 2, -height / 2, width, height, 14);
        g.stroke();
        this.makeLabel(node, `${title} label`, title, 0, -1, 20, width - 12);
        node.on(Node.EventType.TOUCH_END, (event: EventTouch) => { event.propagationStopped = true; action(); });
        node.on(Node.EventType.MOUSE_UP, (event: EventMouse) => { event.propagationStopped = true; action(); });
        return node;
    }

    private makeFrame(texture: Texture2D, x: number, y: number, width: number, height: number) {
        const frame = new SpriteFrame();
        frame.texture = texture;
        frame.rect = new Rect(x, y, width, height);
        frame.originalSize = new Size(width, height);
        return frame;
    }

    private loadBundleAsset(bundleName: string, path: string, callback: (texture: Texture2D) => void) {
        const load = (bundle: any) => bundle.load(path, Texture2D, (error: Error | null, texture: Texture2D) => {
            if (error || !texture) { console.warn('Level2 asset unavailable', bundleName, path, error); return; }
            texture.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
            callback(texture);
        });
        const existing = assetManager.getBundle(bundleName);
        if (existing) { load(existing); return; }
        assetManager.loadBundle(bundleName, (error, bundle) => {
            if (error || !bundle) { console.warn('Level2 bundle unavailable', bundleName, error); return; }
            load(bundle);
        });
    }

    private loadAssets() {
        this.loadBundleAsset('road-cat', 'cat-road-normal/texture', texture => {
            this.catNormal = this.makeFrame(texture, 0, 0, texture.width, texture.height);
            if (this.catSprite) this.catSprite.spriteFrame = this.catNormal;
        });
        this.loadBundleAsset('road-cat', 'cat-road-hiss/texture', texture => this.catHiss = this.makeFrame(texture, 0, 0, texture.width, texture.height));
        this.loadBundleAsset('road-cat', 'cat-road-hit/texture', texture => this.catHit = this.makeFrame(texture, 0, 0, texture.width, texture.height));
        this.loadBundleAsset('road-cars', 'car-sprites/texture', texture => {
            this.carFrames = [];
            const fw = texture.width / 4, fh = texture.height / 2;
            for (let row = 0; row < 2; row++) {
                const frames: SpriteFrame[] = [];
                for (let col = 0; col < 4; col++) frames.push(this.makeFrame(texture, col * fw, texture.height - (row + 1) * fh, fw, fh));
                this.carFrames.push(frames);
            }
            this.refreshVehicleSprites();
        });
        this.loadBundleAsset('road-cars', 'truck-sprites/texture', texture => {
            this.truckFrames = [];
            const fw = texture.width / 4, fh = texture.height / 2;
            for (let row = 0; row < 2; row++) {
                const frames: SpriteFrame[] = [];
                for (let col = 0; col < 4; col++) frames.push(this.makeFrame(texture, col * fw, texture.height - (row + 1) * fh, fw, fh));
                this.truckFrames.push(frames);
            }
            this.refreshVehicleSprites();
        });
    }

    private startLevel() {
        if (!this.overlay) return;
        this.overlay.active = true;
        this.overlay.setSiblingIndex(this.overlay.parent!.children.length - 1);
        this.active = true;
        this.restart(true);
    }

    private stopLevel() {
        this.active = false;
        if (this.overlay) this.overlay.active = false;
        this.clearVehicles();
        this.resetControls();
    }

    private restart(newSeed: boolean) {
        if (!this.overlay) return;
        this.clearVehicles();
        this.failed = false;
        this.won = false;
        this.elapsed = 0;
        this.progress = 0;
        this.catY = 0;
        this.catVY = 0;
        this.lastZoneKey = '';
        this.messageTimer = 0;
        this.attractionStrength = 0;
        if (this.resultPanel) this.resultPanel.active = false;
        if (this.catSprite) this.catSprite.spriteFrame = this.catNormal;
        this.resetControls();

        const result = new TrafficGenerator().generate(newSeed ? undefined : (this.seed || undefined));
        this.seed = result.seed;
        this.vehicles = result.vehicles.map(data => this.createRuntimeVehicle(data));
        this.drawStaticRoad();
        this.drawEvents();
        this.updateVisuals();
        this.showMessage(`安全起步区 · Seed ${this.seed}`, 1.5);
    }

    private resetControls() {
        this.control = 0;
        this.keyboardControl = 0;
        this.dragging = false;
        this.pointerId = -1;
        this.forceKnob?.setPosition(0, 0);
    }

    private clearVehicles() {
        for (const vehicle of this.vehicles) vehicle.node.destroy();
        this.vehicles = [];
    }

    private createRuntimeVehicle(data: GeneratedTrafficVehicle): RuntimeVehicle {
        const node = new Node(`Traffic ${data.kind} ${data.id}`);
        node.layer = Layers.Enum.UI_2D;
        this.vehicleLayer!.addChild(node);
        node.addComponent(UITransform).setContentSize(data.width, data.height);
        let sprite: Sprite | null = null;
        if (data.kind === 'bus') this.drawBus(node, data.width, data.height);
        else {
            sprite = node.addComponent(Sprite);
            sprite.type = Sprite.Type.SIMPLE;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        }
        const runtime: RuntimeVehicle = { ...data, node, sprite, changing: false, changeStartRuntime: 0, brakeTimer: 0, closeWarned: false };
        this.applyVehicleSprite(runtime);
        return runtime;
    }

    private drawBus(node: Node, width: number, height: number) {
        const g = node.addComponent(Graphics);
        g.fillColor = new Color(204, 173, 70);
        g.roundRect(-width / 2, -height / 2, width, height, 12);
        g.fill();
        g.fillColor = new Color(39, 50, 55);
        g.roundRect(-width * .30, -height * .32, width * .52, height * .64, 8);
        g.fill();
        g.fillColor = new Color(143, 168, 181);
        for (let x = -width * .24; x < width * .19; x += 38) g.roundRect(x, -height * .25, 26, height * .5, 5);
        g.fill();
    }

    private refreshVehicleSprites() { for (const vehicle of this.vehicles) this.applyVehicleSprite(vehicle); }

    private applyVehicleSprite(vehicle: RuntimeVehicle) {
        if (!vehicle.sprite) return;
        const frames = vehicle.kind === 'truck' ? this.truckFrames : this.carFrames;
        if (!frames.length) return;
        const row = vehicle.baseSpeed > 0 ? 1 : 0;
        const frame = frames[row]?.[vehicle.frameIndex % 4];
        if (frame) vehicle.sprite.spriteFrame = frame;
        const sx = vehicle.kind === 'truck' ? 1.55 : vehicle.kind === 'van' ? 1.25 : vehicle.kind === 'suv' ? 1.12 : 1;
        const sy = vehicle.kind === 'truck' ? .82 : .72;
        vehicle.node.setScale(sx, sy, 1);
    }

    private updateLevel(dt: number) {
        if (this.failed || this.won) { this.updateRain(); return; }
        this.elapsed += dt;
        this.progress += TRAFFIC_CAT_FORWARD_SPEED * dt;
        const zone = trafficZoneAt(this.progress);
        const zoneKey = `${zone.kind}-${zone.start}`;
        if (zoneKey !== this.lastZoneKey) {
            this.lastZoneKey = zoneKey;
            this.showMessage(
                zone.kind === 'construction' ? '前方施工：车辆开始合流' :
                zone.kind === 'rain' ? '开始下雨：视野下降，路面湿滑' :
                zone.kind === 'accident' ? '前方事故：中间两车道封闭' :
                zone.kind === 'jam' ? '进入堵车：注意急刹和加塞' :
                zone.kind === 'start' ? '安全起步区' : '道路恢复畅通', 1.7
            );
        }
        if (this.statusLabel) this.statusLabel.string = zone.label;

        if (!this.dragging && Math.abs(this.keyboardControl) < .01) {
            this.control *= Math.pow(.12, dt);
            if (Math.abs(this.control) < .01) this.control = 0;
            this.forceKnob?.setPosition(0, this.control * this.forceRange);
        } else if (Math.abs(this.keyboardControl) > .01) {
            this.control = this.keyboardControl;
            this.forceKnob?.setPosition(0, this.control * this.forceRange);
        }

        this.updateVehicleAI(dt);
        this.updateAttractionAndCat(dt, zone.wet);
        this.updateVisuals();
        this.updateRain();
        if (this.messageTimer > 0) {
            this.messageTimer -= dt;
            if (this.messageTimer <= 0 && this.messageLabel) this.messageLabel.node.active = false;
        }
        if (this.progress >= TRAFFIC_LEVEL_LENGTH) this.finish(true);
    }

    private updateVehicleAI(dt: number) {
        for (const vehicle of this.vehicles) {
            let target = vehicle.baseSpeed;
            const dense = ['jam', 'construction', 'accident'].includes(vehicle.eventKind);
            if (dense) {
                const wave = .18 + .82 * ((Math.sin(this.elapsed * vehicle.jamRate + vehicle.jamPhase) + 1) / 2);
                target *= wave;
            }
            if (vehicle.brakeTimer > 0) {
                vehicle.brakeTimer -= dt;
                target = trafficLaneDirection(vehicle.lane) > 0 ? Math.min(target, 4) : Math.max(target, -7);
            }
            if (dense && vehicle.brakeTimer <= 0 && Math.random() < dt * .05) vehicle.brakeTimer = .6 + Math.random() * .8;

            const leader = this.findLeader(vehicle);
            if (leader) {
                const direction = trafficLaneDirection(vehicle.lane);
                const gap = direction > 0
                    ? leader.worldX - vehicle.worldX - (leader.width + vehicle.width) * .5
                    : vehicle.worldX - leader.worldX - (leader.width + vehicle.width) * .5;
                if (gap < 270) {
                    const rel = Math.max(0, gap - (dense ? 45 : 78)) * .22;
                    target = direction > 0
                        ? Math.min(target, Math.max(2, leader.speed + rel))
                        : Math.max(target, Math.min(-4, leader.speed - rel));
                }
            }

            vehicle.speed += (target - vehicle.speed) * Math.min(1, dt * 3.8);
            vehicle.worldX += vehicle.speed * dt;

            if (vehicle.changePlanned && !vehicle.changing && this.elapsed >= vehicle.changeStartTime && this.canChange(vehicle)) {
                vehicle.changing = true;
                vehicle.changeStartRuntime = this.elapsed;
                this.showMessage(
                    vehicle.eventKind === 'construction' ? '施工并道：前车正在合流' :
                    vehicle.eventKind === 'accident' ? '事故封路：车辆挤向开放车道' : '前车打灯变道', 1.05
                );
            }
            if (vehicle.changing) {
                const t = Math.min(1, (this.elapsed - vehicle.changeStartRuntime) / vehicle.changeDuration);
                if (t >= 1) {
                    vehicle.lane = vehicle.targetLane;
                    vehicle.changePlanned = false;
                    vehicle.changing = false;
                }
            }
        }
    }

    private currentVehicleY(vehicle: RuntimeVehicle) {
        if (!vehicle.changing) return TRAFFIC_LANE_Y[vehicle.lane];
        const t = Math.max(0, Math.min(1, (this.elapsed - vehicle.changeStartRuntime) / vehicle.changeDuration));
        const eased = t * t * (3 - 2 * t);
        return TRAFFIC_LANE_Y[vehicle.lane] + (TRAFFIC_LANE_Y[vehicle.targetLane] - TRAFFIC_LANE_Y[vehicle.lane]) * eased;
    }

    private findLeader(vehicle: RuntimeVehicle) {
        const direction = trafficLaneDirection(vehicle.lane);
        let leader: RuntimeVehicle | null = null;
        let best = Number.POSITIVE_INFINITY;
        for (const other of this.vehicles) {
            if (other === vehicle || trafficLaneDirection(other.lane) !== direction) continue;
            if (Math.abs(this.currentVehicleY(other) - this.currentVehicleY(vehicle)) > 42) continue;
            const delta = direction > 0 ? other.worldX - vehicle.worldX : vehicle.worldX - other.worldX;
            if (delta <= 0 || delta >= best) continue;
            best = delta;
            leader = other;
        }
        return leader;
    }

    private canChange(vehicle: RuntimeVehicle) {
        if (closedTrafficLanesAt(vehicle.worldX).has(vehicle.targetLane)) return false;
        const targetY = TRAFFIC_LANE_Y[vehicle.targetLane];
        for (const other of this.vehicles) {
            if (other === vehicle) continue;
            if (Math.abs(this.currentVehicleY(other) - targetY) > 42) continue;
            if (Math.abs(other.worldX - vehicle.worldX) < (other.width + vehicle.width) * .5 + 90) return false;
        }
        return true;
    }

    private updateAttractionAndCat(dt: number, wet: boolean) {
        let attraction = 0;
        let strongest = 0;
        for (const vehicle of this.vehicles) {
            const screenX = this.catScreenX + (vehicle.worldX - this.progress);
            const vehicleY = this.currentVehicleY(vehicle);
            if (screenX < -700 || screenX > 700) continue;

            const side = this.catY < vehicleY ? -1 : 1;
            const targetY = vehicleY + side * vehicle.height * .48;
            const dx = screenX - this.catScreenX;
            const dy = targetY - this.catY;
            const distance = Math.hypot(dx, dy);
            if (distance < vehicle.attractionRadius) {
                const k = 1 - distance / vehicle.attractionRadius;
                attraction += (Math.sign(dy) || 1) * vehicle.attractionPower * (.14 + .86 * k * k);
                strongest = Math.max(strongest, k);
                if (k > .76 && !vehicle.closeWarned) {
                    vehicle.closeWarned = true;
                    this.showMessage(vehicle.kind === 'truck' ? '大运吸力很强！反方向拉满！' : vehicle.kind === 'bus' ? '公交车吸附增强！' : '猫在往车底钻！', 1.0);
                }
                if (k < .40) vehicle.closeWarned = false;
            }

            if (Math.abs(screenX - this.catScreenX) < vehicle.width * .48 + 18 && Math.abs(this.catY - vehicleY) < vehicle.height * .55 + 14) {
                this.finish(false, vehicle.kind === 'truck' ? '被大运吸进去了' : vehicle.kind === 'bus' ? '钻到公交车底了' : '哈基米被自动吸附了');
                return;
            }
        }

        this.attractionStrength = strongest;
        const controlPower = wet ? 190 : 292;
        const response = wet ? 2.15 : 4.6;
        const targetVY = this.control * controlPower + attraction;
        this.catVY += (targetVY - this.catVY) * Math.min(1, dt * response);
        this.catY += this.catVY * dt;
        this.catY = Math.max(this.roadBottom + 25, Math.min(this.roadTop - 25, this.catY));
    }

    private updateVisuals() {
        if (!this.catNode) return;
        this.catNode.setPosition(this.catScreenX, this.catY + 8);
        this.dangerFill?.setScale(Math.max(.001, this.attractionStrength), 1, 1);
        if (this.catSprite) this.catSprite.spriteFrame = this.failed ? (this.catHit ?? this.catNormal) : this.attractionStrength > .62 ? (this.catHiss ?? this.catNormal) : this.catNormal;

        for (const vehicle of this.vehicles) {
            const x = this.catScreenX + (vehicle.worldX - this.progress);
            vehicle.node.setPosition(x, this.currentVehicleY(vehicle));
            vehicle.node.active = x > -760 && x < 780;
        }
        if (this.progressLabel) this.progressLabel.string = `${Math.min(100, Math.floor(this.progress / TRAFFIC_LEVEL_LENGTH * 100))}%`;
        this.drawEvents();
    }

    private drawStaticRoad() {
        if (!this.roadGraphics) return;
        const g = this.roadGraphics;
        g.clear();
        g.fillColor = new Color(51, 68, 57);
        g.rect(-640, -360, 1280, 720);
        g.fill();
        g.fillColor = new Color(84, 87, 89);
        g.rect(-640, this.roadBottom, 1280, this.roadTop - this.roadBottom);
        g.fill();
        g.fillColor = new Color(173, 170, 160);
        g.rect(-640, this.roadTop, 1280, 7);
        g.fill();
        g.rect(-640, this.roadBottom - 7, 1280, 7);
        g.fill();
        g.strokeColor = new Color(245, 245, 245, 120);
        g.lineWidth = 2;
        for (let lane = 0; lane < 3; lane++) {
            const laneY = (TRAFFIC_LANE_Y[lane] + TRAFFIC_LANE_Y[lane + 1]) / 2;
            for (let x = -640; x < 640; x += 54) { g.moveTo(x, laneY); g.lineTo(x + 26, laneY); }
            g.stroke();
        }
    }

    private drawCone(g: Graphics, x: number, y: number) {
        g.fillColor = new Color(240, 160, 40);
        g.circle(x, y, 10);
        g.fill();
        g.fillColor = new Color(250, 242, 218);
        g.rect(x - 8, y - 2, 16, 4);
        g.fill();
    }

    private drawEvents() {
        if (!this.eventGraphics) return;
        const g = this.eventGraphics;
        g.clear();
        const screenX = (worldX: number) => this.catScreenX + (worldX - this.progress);

        const constructionStart = Math.max(-640, screenX(3500));
        const constructionEnd = Math.min(640, screenX(5050));
        if (constructionEnd > constructionStart) {
            g.fillColor = new Color(230, 170, 55, 32);
            const split = (TRAFFIC_LANE_Y[0] + TRAFFIC_LANE_Y[1]) / 2;
            g.rect(constructionStart, split, constructionEnd - constructionStart, this.roadTop - split);
            g.fill();
            for (let wx = 3500; wx < 5050; wx += 120) {
                const x = screenX(wx);
                if (x > -660 && x < 660) this.drawCone(g, x, TRAFFIC_LANE_Y[0]);
            }
        }

        const accidentStart = Math.max(-640, screenX(10150));
        const accidentEnd = Math.min(640, screenX(11680));
        if (accidentEnd > accidentStart) {
            const upper = (TRAFFIC_LANE_Y[0] + TRAFFIC_LANE_Y[1]) / 2;
            const lower = (TRAFFIC_LANE_Y[2] + TRAFFIC_LANE_Y[3]) / 2;
            g.fillColor = new Color(190, 55, 45, 28);
            g.rect(accidentStart, lower, accidentEnd - accidentStart, upper - lower);
            g.fill();
            for (let wx = 10150; wx < 11680; wx += 115) {
                const x = screenX(wx);
                if (x > -660 && x < 660) {
                    this.drawCone(g, x, TRAFFIC_LANE_Y[1] - 38);
                    this.drawCone(g, x, TRAFFIC_LANE_Y[2] + 38);
                }
            }
            const crashX = screenX(10880);
            if (crashX > -800 && crashX < 800) {
                g.fillColor = new Color(126, 54, 49);
                g.roundRect(crashX - 85, -24, 150, 58, 14);
                g.fill();
                g.fillColor = new Color(54, 69, 79);
                g.roundRect(crashX + 35, -2, 135, 56, 14);
                g.fill();
            }
        }
    }

    private updateRain() {
        if (!this.rainGraphics) return;
        const zone = trafficZoneAt(this.progress);
        const g = this.rainGraphics;
        g.clear();
        if (zone.kind !== 'rain') return;
        g.strokeColor = new Color(184, 219, 245, 95);
        g.lineWidth = 2;
        for (let i = 0; i < 62; i++) {
            const x = ((i * 83 + this.elapsed * 420) % 1400) - 700;
            const y = ((i * 47 + this.elapsed * 620) % 820) - 410;
            g.moveTo(x, y);
            g.lineTo(x - 13, y - 28);
        }
        g.stroke();
        g.fillColor = new Color(38, 55, 68, 90);
        g.rect(80, this.roadBottom, 560, this.roadTop - this.roadBottom);
        g.fill();
    }

    private showMessage(text: string, duration = 1.2) {
        if (!this.messageLabel) return;
        this.messageLabel.string = text;
        this.messageLabel.node.active = true;
        this.messageTimer = duration;
    }

    private finish(success: boolean, title?: string) {
        if (success) {
            this.won = true;
            if (this.resultTitle) this.resultTitle.string = '穿过车流';
            if (this.resultHint) this.resultHint.string = '第二关通关：抵抗本能，安全穿过城市道路。';
        } else {
            this.failed = true;
            this.catVY = 0;
            if (this.catSprite) this.catSprite.spriteFrame = this.catHit ?? this.catNormal;
            if (this.resultTitle) this.resultTitle.string = title ?? '哈基米被自动吸附了';
            const zone = trafficZoneAt(this.progress);
            if (this.resultHint) this.resultHint.string =
                zone.kind === 'rain' ? '湿滑路面惯性更强，需要更早反打。' :
                zone.kind === 'construction' ? '施工区车流集中，注意提前留出并道空间。' :
                zone.kind === 'accident' ? '事故区只剩两条通路，提前观察车辆合流。' :
                '不要贴近车辆，越靠近吸附力增长越快。';
        }
        if (this.resultPanel) this.resultPanel.active = true;
    }

    private keyDown(event: EventKeyboard) {
        if (!this.active) return;
        if (event.keyCode === KeyCode.ESCAPE) { this.stopLevel(); return; }
        if (this.failed || this.won) return;
        if (event.keyCode === KeyCode.ARROW_UP || event.keyCode === KeyCode.KEY_W) this.keyboardControl = 1;
        else if (event.keyCode === KeyCode.ARROW_DOWN || event.keyCode === KeyCode.KEY_S) this.keyboardControl = -1;
    }

    private keyUp(event: EventKeyboard) {
        if (!this.active) return;
        if ((event.keyCode === KeyCode.ARROW_UP || event.keyCode === KeyCode.KEY_W) && this.keyboardControl > 0) this.keyboardControl = 0;
        else if ((event.keyCode === KeyCode.ARROW_DOWN || event.keyCode === KeyCode.KEY_S) && this.keyboardControl < 0) this.keyboardControl = 0;
    }
}
