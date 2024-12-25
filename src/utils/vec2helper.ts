import {vec2} from "gl-matrix";
import {PointLike} from "pixi.js";
import {Pool} from "./pool.ts";
import {PoolContext} from "./poolContext.ts";
import {usingDisposabe} from "./disposable.ts";

function vec2Reset(vector: vec2): void {
    vec2.zero(vector);
}

export class v2h {    
    static readonly pool: Pool<vec2> = new Pool(vec2.create, vec2Reset, 256);
    
    static usingVec2Pool(func: (resource: PoolContext<vec2>) => void): void {
        usingDisposabe(this.getPoolCtx(), func);
    }
    
    static getPoolCtx(): PoolContext<vec2> {
        return new PoolContext<vec2>(v2h.pool);
    }
    
    static p2v(point: PointLike, vector: vec2): void {
        vector[0] = point.x;
        vector[1] = point.y;
    }

    static v2p(vector: vec2, point: PointLike): void {
        point.x = vector[0];
        point.y = vector[1];
    }
}