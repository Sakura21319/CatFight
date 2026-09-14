import { _decorator, Component, Node } from 'cc';
const { ccclass } = _decorator;

/**
 * Existing road-cars sprites were authored for level 1's vertical traffic.
 * Level 2 reuses them on a horizontal road, so presentation rotation stays
 * isolated here instead of leaking asset-specific rules into traffic AI.
 */
@ccclass('Level2VehicleOrientation')
export class Level2VehicleOrientation extends Component {
    private vehicleLayer: Node | null = null;

    update() {
        if (!this.vehicleLayer || !this.vehicleLayer.isValid) {
            const ui = this.node.getChildByName('Garden UI');
            const overlay = ui?.getChildByName('Level2 Traffic Overlay');
            const world = overlay?.getChildByName('Level2 World');
            this.vehicleLayer = world?.getChildByName('Traffic Vehicles') ?? null;
        }
        if (!this.vehicleLayer || !this.vehicleLayer.activeInHierarchy) return;

        for (const vehicle of this.vehicleLayer.children) {
            // Bus art is drawn horizontally by Level2Traffic itself.
            if (vehicle.name.startsWith('Traffic bus')) {
                vehicle.setRotationFromEuler(0, 0, vehicle.position.y >= 0 ? 0 : 180);
                continue;
            }
            // Existing road-cars sprites were authored vertically for level 1.
            // Upper two lanes move +X, lower two lanes move -X.
            vehicle.setRotationFromEuler(0, 0, vehicle.position.y >= 0 ? -90 : 90);
        }
    }
}
