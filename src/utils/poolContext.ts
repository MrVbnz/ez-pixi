import {Pool} from "./pool.ts";

export class PoolContext<T> {
    private pool: Pool<T>;
    private acquiredObjects: T[] = [];

    constructor(pool: Pool<T>) {
        this.pool = pool;
    }

    get(): T {
        const obj = this.pool.get();
        this.acquiredObjects.push(obj);
        return obj;
    }

    release(): void {
        for (const obj of this.acquiredObjects) {
            this.pool.release(obj);
        }
        this.acquiredObjects.length = 0;
    }
}