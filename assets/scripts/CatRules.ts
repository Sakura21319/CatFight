export type CatState = 'Idle' | 'Walk' | 'Hiss' | 'Fight' | 'Recover';
export interface Point { x: number; z: number }
/** Connected proximity groups prevent the end cats in a three-cat chain fighting. */
export function proximityGroups(points: Point[], radius: number): number[][] {
    const seen = new Set<number>();
    const groups: number[][] = [];
    for (let i = 0; i < points.length; i++) {
        if (seen.has(i)) continue;
        const group = [i]; seen.add(i);
        for (let q = 0; q < group.length; q++) {
            const a = points[group[q]];
            for (let j = 0; j < points.length; j++) {
                const b = points[j];
                if (!seen.has(j) && (a.x-b.x)**2 + (a.z-b.z)**2 <= radius**2) {
                    seen.add(j); group.push(j);
                }
            }
        }
        groups.push(group);
    }
    return groups;
}
