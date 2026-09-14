import { _decorator, Component, Node } from 'cc';
import { Level2ArtSkin } from './Level2ArtSkin';
const { ccclass } = _decorator;

/**
 * Fallback orientation for the legacy level-1 road vehicle sprites.
 * The dedicated Level2ArtSkin replaces those sprites with horizontal assets.
 */
@ccclass('Level2VehicleOrientation')
export class Level2VehicleOrientation extends Component {
    private vehicleLayer: Node | null = null;

    start() {
        if (!this.node.getComponent(Level2ArtSkin)) this.node.addComponent(Level2ArtSkin);
    }

    update() {
        if (!this.vehicleLayer || !this.vehicleLayer.isValid) {
            const ui = this.node.getChildByName('Garden UI');
            const overlay = ui?.getChildByName('Level2 Traffic Overlay');
            const world = overlay?.getChildByName('Level2 World');
            this.vehicleLayer = world?.getChildByName('Traffic Vehicles') ?? null;
        }
        if (!this.vehicleLayer || !this.vehicleLayer.activeInHierarchy) return;

        for (const vehicle of this.vehicleLayer.children) {
            if (vehicle.getChildByName('L2 Art Marker')) {
                vehicle.setRotationFromEuler(0, 0, 0);
                continue;
            }
            // Until the new bundle is ready, keep the old level-1 art readable.
            if (vehicle.name.startsWith('Traffic bus')) {
                vehicle.setRotationFromEuler(0, 0, vehicle.position.y >= 0 ? 0 : 180);
            } else {
                vehicle.setRotationFromEuler(0, 0, vehicle.position.y >= 0 ? -90 : 90);
            }
        }
    }
}
