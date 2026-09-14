import {
    _decorator, assetManager, Color, Component, Graphics, Label, Layers, Node,
    Rect, Size, Sprite, SpriteFrame, Texture2D, UITransform,
} from 'cc';

const { ccclass } = _decorator;

type ArtKey = 'catBase' | 'catReact' | 'cars' | 'service' | 'heavy' | 'props';

const ART_PATHS: Record<ArtKey, string> = {
    catBase: 'cat-base/texture',
    catReact: 'cat-reactions/texture',
    cars: 'vehicles-cars/texture',
    service: 'vehicles-service/texture',
    heavy: 'vehicles-heavy/texture',
    props: 'event-props/texture',
};

/**
 * Level 2 presentation layer.
 *
 * Gameplay / spawning stays in Level2Traffic + TrafficGenerator; this component
 * only maps the dedicated level-2 sprites onto the runtime nodes.
 */
@ccclass('Level2ArtSkin')
export class Level2ArtSkin extends Component {
    private loading = false;
    private loaded = false;
    private textures: Partial<Record<ArtKey, Texture2D>> = {};

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

    private propsLayer: Node | null = null;
    private propNodes: Node[] = [];

    update() {
        if (!this.attach()) return;
        if (!this.loaded && !this.loading) this.loadAssets();
        if (!this.loaded) return;

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

    private loadAssets() {
        this.loading = true;
        const bundleName = 'level2-art';
        const onBundle = (bundle: any) => {
            const keys = Object.keys(ART_PATHS) as ArtKey[];
            let pending = keys.length;
            let failed = false;

            for (const key of keys) {
                bundle.load(ART_PATHS[key], Texture2D, (error: Error | null, texture: Texture2D) => {
                    if (error || !texture) {
                        failed = true;
                        console.warn(`Level2 art missing: ${ART_PATHS[key]}`, error);
                    } else {
                        this.textures[key] = texture;
                    }
                    pending--;
                    if (pending > 0) return;

                    this.loading = false;
                    if (failed) {
                        console.warn('Level2 art bundle incomplete; fallback art remains available.');
                        return;
                    }
                    this.buildFrames();
                    this.buildEventDecor();
                    this.loaded = true;
                });
            }
        };

        const cached = assetManager.getBundle(bundleName);
        if (cached) return onBundle(cached);

        assetManager.loadBundle(bundleName, (error, bundle) => {
            if (error || !bundle) {
                this.loading = false;
                console.warn('Level2 art bundle unavailable; keeping fallback art.', error);
                return;
            }
            onBundle(bundle);
        });
    }

    private buildFrames() {
        this.catBase = this.grid(this.textures.catBase!, 2, 4);
        this.catReact = this.grid(this.textures.catReact!, 2, 4);
        this.cars = this.grid(this.textures.cars!, 4, 2);
        this.service = this.grid(this.textures.service!, 4, 2);
        this.heavy = this.grid(this.textures.heavy!, 3, 2);
        this.props = this.grid(this.textures.props!, 2, 5);
    }

    private grid(texture: Texture2D, rows: number, cols: number) {
        const frameWidth = texture.width / cols;
        const frameHeight = texture.height / rows;
        const result: SpriteFrame[][] = [];

        // Texture rect coordinates use bottom-left origin. Generated sheets are
        // authored top-to-bottom, so rows are flipped here.
        for (let row = 0; row < rows; row++) {
            const frames: SpriteFrame[] = [];
            const y = texture.height - (row + 1) * frameHeight;
            for (let col = 0; col < cols; col++) {
                const frame = new SpriteFrame();
                frame.texture = texture;
                frame.rect = new Rect(col * frameWidth, y, frameWidth, frameHeight);
                frame.originalSize = new Size(frameWidth, frameHeight);
                frames.push(frame);
            }
            result.push(frames);
        }
        return result;
    }

    private updateCatSkin() {
        if (!this.catNode || !this.catBase.length) return;
        const sprite = this.catNode.getComponent(Sprite) ?? this.catNode.addComponent(Sprite);
        sprite.type = Sprite.Type.SIMPLE;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.catNode.getComponent(UITransform)?.setContentSize(96, 144);

        if (this.resultPanel?.activeInHierarchy) {
            const success = (this.resultTitle?.string ?? '').includes('穿过车流');
            sprite.spriteFrame = success ? this.catReact[1]?.[2] : this.catReact[1]?.[1];
            return;
        }

        const danger = Math.abs(this.dangerFill?.scale.x ?? 0);
        if (danger > 0.72) {
            sprite.spriteFrame = this.catReact[0]?.[2] ?? this.catBase[1]?.[3];
            return;
        }
        if (danger > 0.38) {
            sprite.spriteFrame = this.catReact[0]?.[0] ?? this.catBase[1]?.[3];
            return;
        }

        const phase = Math.floor(Date.now() / 150) % 4;
        const cycle = [
            this.catBase[0]?.[1],
            this.catBase[0]?.[2],
            this.catBase[1]?.[0],
            this.catBase[0]?.[2],
        ];
        sprite.spriteFrame = cycle[phase] ?? this.catBase[0]?.[0];
    }

    private updateVehicleSkins() {
        if (!this.vehicleLayer || !this.cars.length) return;
        for (const vehicle of this.vehicleLayer.children) {
            const kind = this.kindFromName(vehicle.name);
            if (!kind) continue;

            // Upper two lanes travel to the right, lower two travel to the left.
            const directionCol = vehicle.position.y >= 0 ? 0 : 1;
            const variant = this.hash(vehicle.name);
            let frame: SpriteFrame | undefined;

            if (kind === 'suv') frame = this.cars[2]?.[directionCol];
            else if (kind === 'van') frame = this.service[variant % 2 === 0 ? 0 : 3]?.[directionCol];
            else if (kind === 'bus') frame = this.service[variant % 2 === 0 ? 1 : 2]?.[directionCol];
            else if (kind === 'truck') frame = this.heavy[variant % 3]?.[directionCol];
            else frame = this.cars[variant % 3 === 0 ? 3 : variant % 2]?.[directionCol];

            if (!frame) continue;
            const sprite = vehicle.getComponent(Sprite) ?? vehicle.addComponent(Sprite);
            sprite.type = Sprite.Type.SIMPLE;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.spriteFrame = frame;
            sprite.color = Color.WHITE;

            for (const graphics of vehicle.getComponents(Graphics)) graphics.enabled = false;
            vehicle.setRotationFromEuler(0, 0, 0);
            vehicle.setScale(1, 1, 1);

            const size = this.vehicleVisualSize(kind);
            vehicle.getComponent(UITransform)?.setContentSize(size.width, size.height);
            if (!vehicle.getChildByName('L2 Art Marker')) vehicle.addChild(new Node('L2 Art Marker'));
        }
    }

    private vehicleVisualSize(kind: string) {
        if (kind === 'truck') return { width: 300, height: 120 };
        if (kind === 'bus') return { width: 260, height: 100 };
        if (kind === 'van') return { width: 190, height: 90 };
        if (kind === 'suv') return { width: 180, height: 86 };
        return { width: 168, height: 80 };
    }

    private buildEventDecor() {
        if (!this.world || this.propsLayer || !this.props.length) return;
        this.propsLayer = new Node('Level2 Event Art');
        this.propsLayer.layer = Layers.Enum.UI_2D;
        this.world.addChild(this.propsLayer);
        this.propsLayer.setSiblingIndex(Math.min(2, this.world.children.length - 1));
        this.propsLayer.addComponent(UITransform).setContentSize(1280, 440);

        const defs = [
            { frame: this.props[0]?.[0], x: 160, y: 165, w: 70, h: 82 },
            { frame: this.props[0]?.[1], x: 315, y: 160, w: 115, h: 88 },
            { frame: this.props[0]?.[2], x: 480, y: 150, w: 145, h: 95 },
            { frame: this.props[0]?.[3], x: 420, y: 105, w: 100, h: 115 },
            { frame: this.props[0]?.[4], x: 545, y: 82, w: 105, h: 115 },
            { frame: this.props[1]?.[0], x: 430, y: -150, w: 135, h: 105 },
            { frame: this.props[1]?.[1], x: 300, y: -150, w: 78, h: 78 },
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
