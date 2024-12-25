import {Pool} from "./pool.ts";
import {Disposable} from "./disposable.ts";

export class PoolContext<T> implements Disposable {
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

    dispose(): void {
        for (const obj of this.acquiredObjects) {
            this.pool.release(obj);
        }
        this.acquiredObjects.length = 0;
    }
}