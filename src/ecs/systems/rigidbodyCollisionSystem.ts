import {query, System} from "@typeonce/ecs";
import {SystemTags} from "../systemTags.ts";
import {GameEventMap} from "../gameEventMap.ts";
import {CircularRigidbodyComponent} from "../components/rigidbodyComponent.ts";
import {ColliderComponent} from "../components/colliderComponent.ts";
import {vec2} from "gl-matrix";
import {v2h} from "../../utils/vec2helper.ts";
import {clamp} from "../../utils/math.ts";
import {PoolContext} from "../../utils/poolContext.ts";
import {BoundsComponent} from "../components/boundsComponent.ts";
import {QueryResponse} from "../../utils/queryResponse.ts";

const gravity = vec2.fromValues(0, 0.1);
const drag = 0.0001;
const kE = 0.9; //Coefficient of restitution (elastic collision)

const rigidbodyQueryMap = {
    bounds: BoundsComponent,
    collider: ColliderComponent,
    rigidbody: CircularRigidbodyComponent,
};
type RigidbodyQueryResponse = QueryResponse<typeof rigidbodyQueryMap>;

const staticBodyQueryMap = {
    bounds: BoundsComponent,
    collider: ColliderComponent,
};
type StaticBodyQueryResponse = QueryResponse<typeof staticBodyQueryMap>;

const rigidbodies = query(rigidbodyQueryMap);

const SystemFactory = System<SystemTags, GameEventMap>();

class CircleBody {
    readonly Speed: vec2;
    readonly Mass: number;
    readonly Radius: number;
    readonly Bounds: BoundsComponent;

    constructor(obj: RigidbodyQueryResponse) {
        this.Speed = obj.rigidbody.velocity;
        this.Mass = obj.rigidbody.mass;
        this.Radius = obj.rigidbody.radius;
        this.Bounds = obj.bounds;
    }
}

class RectangleBody {
    readonly Bounds: BoundsComponent;

    constructor(obj: StaticBodyQueryResponse) {
        this.Bounds = obj.bounds;
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
                if (bAsCircle) {
                    handleCircleCircleCollision(body, new CircleBody(bAsCircle));
                }
                else {
                    handleCircleRectangleCollision(
                        body,
                        new RectangleBody(args.getComponentRequired(staticBodyQueryMap)(other)),
                        args.deltaTime
                    )
                }
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
    vec2.scaleAndAdd(rb.Bounds.position, rb.Bounds.position, rb.Speed, deltaTime);
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
            const scalarImpulse = ((1 + kE) * speedAlongNormal) / ((1 / a.Mass) + (1 / b.Mass));
            vec2.scaleAndAdd(a.Speed, a.Speed, normal, -scalarImpulse * (1 / a.Mass))
            vec2.scaleAndAdd(b.Speed, b.Speed, normal, scalarImpulse * (1 / b.Mass))
        }

        const overlap = -Math.abs(collision.signedDistance);                
        vec2.scaleAndAdd(a.Bounds.position, a.Bounds.position, normal, overlap);        
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
        vec2.scaleAndAdd(a.Bounds.position, a.Bounds.position, normal, overlap);
    });
}

function circleCircleCollision(a: CircleBody, b: CircleBody, vec2pool: PoolContext<vec2>) {
    const aPosition = a.Bounds.position;
    const bPosition = b.Bounds.position;
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
    
    const hitPosition = vec2pool.get();
    vec2.scaleAndAdd(hitPosition, aPosition, normal, a.Radius);
    const signedDistance = distance - rSum;

    return {
        position: hitPosition,
        normal: normal,
        signedDistance: signedDistance
    };
}

function circleRectangleCollision(a: CircleBody, b: RectangleBody, vec2pool: PoolContext<vec2>): CollisionData {
    const aPosition = a.Bounds.position;
    const bBounds = b.Bounds.getBounds();
    let edgeX = clamp(aPosition[0], bBounds.minX, bBounds.maxX);
    let edgeY = clamp(aPosition[1], bBounds.minY, bBounds.maxY);
    let signedDistance = Math.sqrt((aPosition[0] - edgeX) ** 2 + (aPosition[1] - edgeY) ** 2);
    if (signedDistance > a.Radius)
        return null;
    if (bBounds.containsPoint(aPosition[0], aPosition[1])) {
        const dist_l = Math.abs(aPosition[0] - bBounds.minX);
        const dist_r = Math.abs(aPosition[0] - bBounds.maxX);
        const dist_b = Math.abs(aPosition[1] - bBounds.minY);
        const dist_t = Math.abs(aPosition[1] - bBounds.minY);
        const dist_min = Math.min(dist_l, dist_r, dist_b, dist_t);
        switch (dist_min) {
            case dist_l:
                edgeX = bBounds.minX;
                break;
            case dist_r:
                edgeX = bBounds.maxX;
                break;
            case dist_b:
                edgeY = bBounds.minY;
                break;
            case dist_t:
                edgeY = bBounds.maxY;
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