import {
    _decorator, assetManager, Color, Component, Graphics, Label, Layers, Node,
    Rect, Size, Sprite, SpriteFrame, Texture2D, UITransform,
} from 'cc';

const { ccclass } = _decorator;

type SheetKey = 'catBase' | 'catReact' | 'cars' | 'service' | 'heavy' | 'road' | 'props' | 'ui';

/**
 * Presentation-only skin for level 2.
 *
 * Gameplay remains in Level2Traffic / TrafficGenerator. This component only
 * replaces placeholder art with the dedicated level-2 pixel assets and adds
 * event decoration. Keeping it separate makes later art iteration safe.
 */
@ccclass('Level2ArtSkin')
export class Level2ArtSkin extends Component {
    private texture: Texture2D | null = null;
    private loading = false;
    private loaded = false;

    private overlay: Node | null = null;
    private world: Node | null = null;
    private vehicleLayer: Node | null = null;
    private catNode: Node | null = null;
    private statusLabel: Label | null = null;
    private resultPanel: Node | null = null;
    private resultTitle: Label | null = null;
    private dangerFill: Node | null = null;

    private catBase: SpriteFrame[][] = [];
    private catReact: SpriteFrame[][] = [];
    private cars: SpriteFrame[][] = [];
    private service: SpriteFrame[][] = [];
    private heavy: SpriteFrame[][] = [];
    private props: SpriteFrame[][] = [];
    private dryRoad: SpriteFrame | null = null;
    private wetRoad: SpriteFrame | null = null;
    private puddleLarge: SpriteFrame | null = null;
    private puddleSmall: SpriteFrame | null = null;

    private roadArtLayer: Node | null = null;
    private roadTiles: Sprite[] = [];
    private propsLayer: Node | null = null;
    private propNodes: Node[] = [];
    private puddleNodes: Node[] = [];

    update() {
        if (!this.attach()) return;
        if (!this.loaded && !this.loading) this.loadAtlas();
        if (!this.loaded) return;

        this.updateRoadTexture();
        this.updateCatSkin();
        this.updateVehicleSkins();
        this.updateEventDecor();
    }

    private attach() {
        const ui = this.node.getChildByName('Garden UI');
        this.overlay = ui?.getChildByName('Level2 Traffic Overlay') ?? null;
        if (!this.overlay) return false;

        this.world = this.overlay.getChildByName('Level2 World');
        this.vehicleLayer = this.world?.getChildByName('Traffic Vehicles') ?? null;
        this.catNode = this.world?.getChildByName('Level2 Cat') ?? null;
        this.statusLabel = this.find(this.overlay, 'Road state')?.getComponent(Label) ?? null;
        this.resultPanel = this.find(this.overlay, 'Traffic result');
        this.resultTitle = this.find(this.overlay, 'Result title')?.getComponent(Label) ?? null;
        this.dangerFill = this.find(this.overlay, 'Danger fill');
        return !!this.world;
    }

    private loadAtlas() {
        this.loading = true;
        const bundleName = 'level2-art';
        const load = (bundle: any) => {
            bundle.load('level2-atlas/texture', Texture2D, (error: Error | null, texture: Texture2D) => {
                this.loading = false;
                if (error || !texture) {
                    console.warn('Level2 art atlas unavailable; keeping fallback graphics.', error);
                    return;
                }
                this.texture = texture;
                this.buildFrames();
                this.buildRoadArt();
                this.buildEventDecor();
                this.loaded = true;
            });
        };

        const cached = assetManager.getBundle(bundleName);
        if (cached) {
            load(cached);
            return;
        }
        assetManager.loadBundle(bundleName, (error, bundle) => {
            if (error || !bundle) {
                this.loading = false;
                console.warn('Level2 art bundle unavailable; keeping fallback graphics.', error);
                return;
            }
            load(bundle);
        });
    }

    private buildFrames() {
        if (!this.texture) return;
        this.catBase = this.grid('catBase', 2, 4);
        this.catReact = this.grid('catReact', 2, 4);
        this.cars = this.grid('cars', 4, 2);
        this.service = this.grid('service', 4, 2);
        this.heavy = this.grid('heavy', 3, 2);
        this.props = this.grid('props', 2, 5);

        this.dryRoad = this.localFrame('road', 0, 0, 160, 105);
        this.wetRoad = this.localFrame('road', 160, 0, 160, 105);
        this.puddleLarge = this.localFrame('road', 160, 160, 110, 80);
        this.puddleSmall = this.localFrame('road', 260, 170, 60, 65);
    }

    private sheetOrigin(key: SheetKey) {
        const index: Record<SheetKey, number> = {
            catBase: 0,
            catReact: 1,
            cars: 2,
            service: 3,
            heavy: 4,
            road: 5,
            props: 6,
            ui: 7,
        };
        const i = index[key];
        return { x: (i % 2) * 320, top: Math.floor(i / 2) * 240, width: 320, height: 240 };
    }

    private grid(key: SheetKey, rows: number, cols: number) {
        if (!this.texture) return [] as SpriteFrame[][];
        const sheet = this.sheetOrigin(key);
        const fw = sheet.width / cols;
        const fh = sheet.height / rows;
        const result: SpriteFrame[][] = [];
        for (let row = 0; row < rows; row++) {
            const frames: SpriteFrame[] = [];
            for (let col = 0; col < cols; col++) {
                frames.push(this.localFrame(key, col * fw, row * fh, fw, fh)!);
            }
            result.push(frames);
        }
        return result;
    }

    /** local coordinates use top-left origin inside one 320x240 source sheet. */
    private localFrame(key: SheetKey, localX: number, localTop: number, width: number, height: number) {
        if (!this.texture) return null;
        const sheet = this.sheetOrigin(key);
        const x = sheet.x + localX;
        const y = this.texture.height - (sheet.top + localTop + height);
        const frame = new SpriteFrame();
        frame.texture = this.texture;
        frame.rect = new Rect(x, y, width, height);
        frame.originalSize = new Size(width, height);
        return frame;
    }

    private buildRoadArt() {
        if (!this.world || this.roadArtLayer) return;
        this.roadArtLayer = new Node('Level2 Road Art');
        this.roadArtLayer.layer = Layers.Enum.UI_2D;
        this.world.addChild(this.roadArtLayer);
        this.roadArtLayer.setSiblingIndex(0);
        this.roadArtLayer.addComponent(UITransform).setContentSize(1280, 440);

        const xs = [-480, -160, 160, 480];
        const ys = [-110, 110];
        for (const y of ys) {
            for (const x of xs) {
                const node = new Node('Road texture tile');
                node.layer = Layers.Enum.UI_2D;
                this.roadArtLayer.addChild(node);
                node.setPosition(x, y);
                node.addComponent(UITransform).setContentSize(390, 245);
                const sprite = node.addComponent(Sprite);
                sprite.type = Sprite.Type.SIMPLE;
                sprite.sizeMode = Sprite.SizeMode.CUSTOM;
                sprite.spriteFrame = this.dryRoad;
                sprite.color = new Color(255, 255, 255, 92);
                this.roadTiles.push(sprite);
            }
        }
    }

    private updateRoadTexture() {
        const status = this.statusLabel?.string ?? '';
        const wet = status.includes('雨') || status.includes('湿滑');
        const frame = wet ? this.wetRoad : this.dryRoad;
        if (frame) for (const tile of this.roadTiles) tile.spriteFrame = frame;
        for (const puddle of this.puddleNodes) puddle.active = wet;
    }

    private updateCatSkin() {
        if (!this.catNode || !this.catBase.length) return;
        const sprite = this.catNode.getComponent(Sprite) ?? this.catNode.addComponent(Sprite);
        sprite.type = Sprite.Type.SIMPLE;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.catNode.getComponent(UITransform)?.setContentSize(92, 148);

        const resultVisible = !!this.resultPanel?.activeInHierarchy;
        if (resultVisible) {
            const success = (this.resultTitle?.string ?? '').includes('穿过车流');
            sprite.spriteFrame = success ? this.catReact[1]?.[2] : this.catReact[1]?.[1];
            return;
        }

        const danger = Math.abs(this.dangerFill?.scale.x ?? 0);
        if (danger > .72) {
            sprite.spriteFrame = this.catReact[0]?.[2] ?? this.catBase[1]?.[3];
            return;
        }
        if (danger > .38) {
            sprite.spriteFrame = this.catReact[0]?.[0] ?? this.catBase[1]?.[3];
            return;
        }

        // Upright two-beat walk that keeps the real-cat meme posture recognizable.
        const phase = Math.floor(performance.now() / 150) % 4;
        const cycle = [this.catBase[0]?.[1], this.catBase[0]?.[2], this.catBase[1]?.[0], this.catBase[0]?.[2]];
        sprite.spriteFrame = cycle[phase] ?? this.catBase[0]?.[0];
    }

    private updateVehicleSkins() {
        if (!this.vehicleLayer || !this.cars.length) return;
        for (const vehicle of this.vehicleLayer.children) {
            const kind = this.kindFromName(vehicle.name);
            if (!kind) continue;

            const directionCol = vehicle.position.y >= 0 ? 0 : 1; // upper lanes +X, lower lanes -X
            const variant = this.hash(vehicle.name);
            let frame: SpriteFrame | null | undefined = null;

            if (kind === 'suv') frame = this.cars[2]?.[directionCol];
            else if (kind === 'van') frame = this.service[variant % 2 === 0 ? 0 : 3]?.[directionCol];
            else if (kind === 'bus') frame = this.service[variant % 2 === 0 ? 1 : 2]?.[directionCol];
            else if (kind === 'truck') frame = this.heavy[variant % 3]?.[directionCol];
            else frame = this.cars[variant % 3 === 0 ? 3 : variant % 2]?.[directionCol];

            if (!frame) continue;
            let sprite = vehicle.getComponent(Sprite);
            if (!sprite) sprite = vehicle.addComponent(Sprite);
            sprite.type = Sprite.Type.SIMPLE;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.spriteFrame = frame;
            sprite.color = Color.WHITE;

            for (const graphics of vehicle.getComponents(Graphics)) graphics.enabled = false;
            vehicle.setRotationFromEuler(0, 0, 0);
            vehicle.setScale(1, 1, 1);
            const size = this.vehicleVisualSize(kind);
            vehicle.getComponent(UITransform)?.setContentSize(size.width, size.height);

            if (!vehicle.getChildByName('L2 Art Marker')) {
                const marker = new Node('L2 Art Marker');
                vehicle.addChild(marker);
            }
        }
    }

    private vehicleVisualSize(kind: string) {
        if (kind === 'truck') return { width: 300, height: 120 };
        if (kind === 'bus') return { width: 250, height: 96 };
        if (kind === 'van') return { width: 184, height: 88 };
        if (kind === 'suv') return { width: 175, height: 84 };
        return { width: 164, height: 78 };
    }

    private buildEventDecor() {
        if (!this.world || this.propsLayer || !this.props.length) return;
        this.propsLayer = new Node('Level2 Event Art');
        this.propsLayer.layer = Layers.Enum.UI_2D;
        this.world.addChild(this.propsLayer);
        this.propsLayer.setSiblingIndex(Math.min(2, this.world.children.length - 1));
        this.propsLayer.addComponent(UITransform).setContentSize(1280, 440);

        // top-row props: cone, cone cluster, barricade, merge sign, roadwork sign
        const defs = [
            { frame: this.props[0]?.[0], x: 170, y: 165, w: 72, h: 90 },
            { frame: this.props[0]?.[1], x: 330, y: 160, w: 120, h: 90 },
            { frame: this.props[0]?.[2], x: 500, y: 150, w: 145, h: 95 },
            { frame: this.props[0]?.[3], x: 430, y: 112, w: 105, h: 120 },
            { frame: this.props[0]?.[4], x: 545, y: 80, w: 105, h: 120 },
            // bottom-row: LED, flasher, damaged car, police barrier, fence
            { frame: this.props[1]?.[0], x: 440, y: -150, w: 135, h: 105 },
            { frame: this.props[1]?.[1], x: 300, y: -150, w: 80, h: 80 },
            { frame: this.props[1]?.[2], x: 250, y: 0, w: 180, h: 110 },
            { frame: this.props[1]?.[3], x: 445, y: -55, w: 145, h: 95 },
            { frame: this.props[1]?.[4], x: 510, y: 65, w: 150, h: 110 },
        ];
        for (let i = 0; i < defs.length; i++) {
            const def = defs[i];
            const node = new Node(`Event art ${i}`);
            node.layer = Layers.Enum.UI_2D;
            this.propsLayer.addChild(node);
            node.setPosition(def.x, def.y);
            node.addComponent(UITransform).setContentSize(def.w, def.h);
            const sprite = node.addComponent(Sprite);
            sprite.type = Sprite.Type.SIMPLE;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.spriteFrame = def.frame ?? null;
            node.active = false;
            this.propNodes.push(node);
        }

        if (this.puddleLarge && this.puddleSmall) {
            const puddles = [
                { frame: this.puddleLarge, x: -120, y: 135, w: 190, h: 100 },
                { frame: this.puddleSmall, x: 280, y: -110, w: 125, h: 75 },
                { frame: this.puddleLarge, x: 480, y: 120, w: 165, h: 90 },
            ];
            for (const def of puddles) {
                const node = new Node('Rain puddle');
                node.layer = Layers.Enum.UI_2D;
                this.propsLayer.addChild(node);
                node.setPosition(def.x, def.y);
                node.addComponent(UITransform).setContentSize(def.w, def.h);
                const sprite = node.addComponent(Sprite);
                sprite.type = Sprite.Type.SIMPLE;
                sprite.sizeMode = Sprite.SizeMode.CUSTOM;
                sprite.spriteFrame = def.frame;
                node.active = false;
                this.puddleNodes.push(node);
            }
        }
    }

    private updateEventDecor() {
        if (!this.propsLayer) return;
        const status = this.statusLabel?.string ?? '';
        const construction = status.includes('施工');
        const accident = status.includes('事故');

        for (const node of this.propNodes) node.active = false;
        if (construction) {
            for (const i of [0, 1, 2, 3, 4, 5, 6]) if (this.propNodes[i]) this.propNodes[i].active = true;
        } else if (accident) {
            for (const i of [0, 1, 2, 7, 8, 9]) if (this.propNodes[i]) this.propNodes[i].active = true;
        }
    }

    private kindFromName(name: string) {
        for (const kind of ['truck', 'bus', 'van', 'suv', 'car']) {
            if (name.startsWith(`Traffic ${kind} `)) return kind;
        }
        return null;
    }

    private hash(value: string) {
        let hash = 0;
        for (let i = 0; i < value.length; i++) hash = ((hash * 31) + value.charCodeAt(i)) >>> 0;
        return hash;
    }

    private find(root: Node, name: string): Node | null {
        if (root.name === name) return root;
        for (const child of root.children) {
            const found = this.find(child, name);
            if (found) return found;
        }
        return null;
    }
}
