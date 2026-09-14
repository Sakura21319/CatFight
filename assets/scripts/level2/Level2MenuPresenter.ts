import { _decorator, Component, Label, Node } from 'cc';
const { ccclass } = _decorator;

@ccclass('Level2MenuPresenter')
export class Level2MenuPresenter extends Component {
    private applied = false;

    update() {
        if (this.applied) return;
        const ui = this.node.getChildByName('Garden UI');
        if (!ui) return;
        const hint = this.find(ui, '第二关 hint');
        if (!hint) return;
        const label = hint.getComponent(Label);
        if (!label) return;
        label.string = '城市车流 · 抵抗自动吸附';
        this.applied = true;
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
