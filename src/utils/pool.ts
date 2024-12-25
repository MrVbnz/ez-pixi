export class Pool<T> {
    private readonly pool: (T | null)[];
    private top: number = -1;
    private readonly factory: () => T;
    private readonly reset: (item: T) => void | null;

    constructor(factory: () => T, reset: (item: T) => void | null, capacity: number) {
        this.factory = factory;
        this.reset = reset;
        this.pool = Array(capacity).fill(null);
        for (let i = 0; i < capacity; i++) {
            this.pool[i] = this.factory();
        }
        this.top = capacity - 1;
    }

    get(): T {
        if (this.top < 0) {
            throw new Error('Pool exhausted');
        }
        const obj = this.pool[this.top];
        this.pool[this.top] = null;
        this.top--;
        if (!obj)
            throw new Error('Null object found in pool');
        if (this.reset)
            this.reset(obj);
        return obj;
    }

    release(obj: T): void {
        if (this.top >= this.pool.length - 1) {
            throw new Error('Pool overflow');
        }
        this.top++;
        this.pool[this.top] = obj;        
    }

    size(): number {
        return this.top + 1;
    }
}
