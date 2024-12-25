export function groupBy<T, K>(array: T[], keyGetter: (item: T) => K): Map<K, T[]> {
    const map = new Map<K, T[]>();
    for (const item of array) {
        const key = keyGetter(item);
        const group = map.get(key);
        if (group) {
            group.push(item);
        } else {
            map.set(key, [item]);
        }
    }
    return map;
}