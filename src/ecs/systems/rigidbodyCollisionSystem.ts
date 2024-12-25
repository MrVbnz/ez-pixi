import {ComponentInstanceMap, query, System} from "@typeonce/ecs";
import {SystemTags} from "../systemTags.ts";
import {GameEventMap} from "../gameEventMap.ts";
import {SpriteWrapperComponent} from "../components/spriteComponent.ts";
import {CircularRigidbodyComponent} from "../components/rigidbodyComponent.ts";
import {ColliderComponent} from "../components/colliderComponent.ts";
import {vec2} from "gl-matrix";
import {v2h} from "../../utils/vec2helper.ts";
import {Bounds, Sprite} from "pixi.js";
import {clamp} from "../../utils/math.ts";
import {PoolContext} from "../../utils/poolContext.ts";

const gravity = vec2.fromValues(0, 0.1);
const drag = 0.0001;
const kE = 0.9; //Coefficient of restitution (elastic collision)

const rigidbodyQueryMap = {
    spriteWrapper: SpriteWrapperComponent,
    collider: ColliderComponent,
    rigidbody: CircularRigidbodyComponent,
};
type RigidbodyQueryResponse = ComponentInstanceMap<typeof rigidbodyQueryMap>;

const staticBodyQueryMap = {
    spriteWrapper: SpriteWrapperComponent,
    collider: ColliderComponent,
};
type StaticBodyQueryResponse = ComponentInstanceMap<typeof staticBodyQueryMap>;

const rigidbodies = query(rigidbodyQueryMap);

const SystemFactory = System<SystemTags, GameEventMap>();

class CircleBody {
    readonly Sprite: Sprite;
    readonly Speed: vec2;
    readonly Mass: number;
    readonly Radius: number;
    readonly Bounds: Bounds;

    constructor(obj: RigidbodyQueryResponse) {
        this.Sprite = obj.spriteWrapper.sprite;
        this.Speed = obj.rigidbody.velocity;
        this.Mass = obj.rigidbody.mass;
        this.Radius = obj.rigidbody.radius;
        this.Bounds = this.Sprite.getBounds();
    }
}

class RectangleBody {
    readonly Sprite: Sprite;
    readonly Bounds: Bounds;

    constructor(obj: StaticBodyQueryResponse) {
        this.Sprite = obj.spriteWrapper.sprite;
        this.Bounds = this.Sprite.getBounds();
    }
}

export class RigidbodyCollisionSystem extends SystemFactory<{}>
("RigidbodyCollisionSystem", {
    dependencies: ["CollisionDetectionSystem"],
    execute: (args) => {
        rigidbodies(args.world).forEach(obj => {
            const body = new CircleBody(obj);

            applyBaseForces(body, args.deltaTime);
            applyMovement(body, args.deltaTime);

            obj.collider.collidingEntities.forEach(other => {
                const bAsCircle = args.getComponent(rigidbodyQueryMap)(other);
                if (bAsCircle)
                    handleCircleCircleCollision(body, new CircleBody(bAsCircle));
                else
                    handleCircleRectangleCollision(
                        body,
                        new RectangleBody(args.getComponentRequired(staticBodyQueryMap)(other)),
                        args.deltaTime
                    )
            });
        });
    }
}) {
}


function applyBaseForces(rb: CircleBody, deltaTime: number): void {
    vec2.scaleAndAdd(rb.Speed, rb.Speed, gravity, deltaTime);
    vec2.scale(rb.Speed, rb.Speed, 1 - drag);

}

function applyMovement(rb: CircleBody, deltaTime: number) {
    v2h.usingVec2Pool(vec2pool => {
        const position = vec2pool.get();
        v2h.p2v(rb.Sprite.position, position);
        vec2.scaleAndAdd(position, position, rb.Speed, deltaTime);
        v2h.v2p(position, rb.Sprite.position);
    });
}

type CollisionData = {
    position: vec2;
    normal: vec2;
    signedDistance: number;
} | null;

function handleCircleCircleCollision(a: CircleBody, b: CircleBody): void {
    v2h.usingVec2Pool(vec2pool => {
        const collision = circleCircleCollision(a, b, vec2pool);
        if (!collision)
            return;
        const normal = collision.normal;

        const speedAlongNormal = vec2.dot(a.Speed, normal);
        if (speedAlongNormal > 0) {
            const scalarImpulse = ((1 + kE) * speedAlongNormal) / ((1 / a.Mass)+(1 / b.Mass));
            vec2.scaleAndAdd(a.Speed, a.Speed, normal, -scalarImpulse * (1 / a.Mass))
            vec2.scaleAndAdd(b.Speed, b.Speed, normal, scalarImpulse * (1 / b.Mass))
        }

        const overlap = -Math.abs(collision.signedDistance);
        const position = vec2pool.get();
        v2h.p2v(a.Sprite.position, position);
        vec2.scaleAndAdd(position, position, normal, overlap);
        v2h.v2p(position, a.Sprite.position);
    });
}

function handleCircleRectangleCollision(a: CircleBody, b: RectangleBody, _deltaTime: number): void {
    v2h.usingVec2Pool(vec2pool => {
        const collision = circleRectangleCollision(a, b, vec2pool);
        if (!collision)
            return;
        const normal = collision.normal;

        const speedAlongNormal = vec2.dot(a.Speed, normal);
        if (speedAlongNormal > 0) {
            const scalarImpulse = ((1 + kE) * speedAlongNormal) / (2 / a.Mass);
            vec2.scaleAndAdd(a.Speed, a.Speed, normal, -scalarImpulse * (2 / a.Mass))
        }

        const overlap = Math.abs(collision.signedDistance) - a.Radius;
        const position = vec2pool.get();
        v2h.p2v(a.Sprite.position, position);
        vec2.scaleAndAdd(position, position, normal, overlap);
        v2h.v2p(position, a.Sprite.position);
    });
}

function circleCircleCollision(a: CircleBody, b: CircleBody, vec2pool: PoolContext<vec2>) {
    const aPosition = vec2pool.get();
    v2h.p2v(a.Sprite.position, aPosition);
    const bPosition = vec2pool.get();
    v2h.p2v(b.Sprite.position, bPosition);
    const delta = vec2pool.get();
    vec2.sub(delta, bPosition, aPosition);
    const distance = vec2.len(delta);
    const rSum = a.Radius + b.Radius;
    if (distance > rSum)
        return null;
    if (distance === 0) {
        return {
            position: aPosition,
            normal: vec2.random(delta, 1),
            signedDistance: -rSum,
        };
    }
    const normal = vec2.normalize(delta, delta);
    vec2.scaleAndAdd(aPosition, aPosition, normal, a.Radius);
    const signedDistance = distance - rSum;

    return {
        position: aPosition,
        normal: normal,
        signedDistance: signedDistance
    };
}

function circleRectangleCollision(a: CircleBody, b: RectangleBody, vec2pool: PoolContext<vec2>): CollisionData {
    const aPosition = vec2pool.get();
    v2h.p2v(a.Sprite.position, aPosition);
    let edgeX = clamp(aPosition[0], b.Bounds.minX, b.Bounds.maxX);
    let edgeY = clamp(aPosition[1], b.Bounds.minY, b.Bounds.maxY);
    let signedDistance = Math.sqrt((aPosition[0] - edgeX) ** 2 + (aPosition[1] - edgeY) ** 2);
    if (signedDistance > a.Radius)
        return null;
    if (b.Bounds.containsPoint(aPosition[0], aPosition[1])) {
        const dist_l = Math.abs(aPosition[0] - b.Bounds.minX);
        const dist_r = Math.abs(aPosition[0] - b.Bounds.maxX);
        const dist_b = Math.abs(aPosition[1] - b.Bounds.minY);
        const dist_t = Math.abs(aPosition[1] - b.Bounds.minY);
        const dist_min = Math.min(dist_l, dist_r, dist_b, dist_t);
        switch (dist_min) {
            case dist_l:
                edgeX = b.Bounds.minX;
                break;
            case dist_r:
                edgeX = b.Bounds.maxX;
                break;
            case dist_b:
                edgeY = b.Bounds.minY;
                break;
            case dist_t:
                edgeY = b.Bounds.maxY;
                break;
        }
        signedDistance = -dist_min;
    }

    const closestOnB = vec2pool.get();
    vec2.set(closestOnB, edgeX, edgeY);
    const normal = vec2pool.get();
    vec2.sub(normal, closestOnB, aPosition);
    if (signedDistance < 0)
        vec2.scale(normal, normal, -1);
    vec2.normalize(normal, normal);

    return {
        position: closestOnB,
        normal: normal,
        signedDistance: signedDistance
    };
}