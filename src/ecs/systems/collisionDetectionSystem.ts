import {query, System} from "@typeonce/ecs";
import {SystemTags} from "../systemTags.ts";
import {GameEventMap} from "../gameEventMap.ts";
import {ColliderComponent} from "../components/colliderComponent.ts";
import {groupBy} from "../../utils/groupBy.ts";
import {QueryResponse} from "../../utils/queryResponse.ts";
import {BoundsComponent} from "../components/boundsComponent.ts";

export type CollisionLayer =
    | "Level"
    | "Player";

const collisionMatrix = new Map<CollisionLayer, CollisionLayer[]>([
    ["Player", ["Level"]],
    ["Level", ["Level", "Player"]],
]);

const colliderQueryMap = {
    bounds: BoundsComponent,
    collider: ColliderComponent
};
type CollidersQueryResponse = QueryResponse<typeof colliderQueryMap>;

const colliders = query(colliderQueryMap);

const SystemFactory = System<SystemTags, GameEventMap>();

function handle_collision(a: CollidersQueryResponse, b: CollidersQueryResponse): void {
    const bounds1 = a.bounds.getBounds();
    const bounds2 = b.bounds.getBounds();

    const isColliding = (
        bounds1.x < bounds2.x + bounds2.width
        && bounds1.x + bounds1.width > bounds2.x
        && bounds1.y < bounds2.y + bounds2.height
        && bounds1.y + bounds1.height > bounds2.y
    );

    if (isColliding) {
        if (!a.collider.collidingEntities.has(b.entityId))
            a.collider.collidingEntities.add(b.entityId)
        if (!b.collider.collidingEntities.has(a.entityId))
            b.collider.collidingEntities.add(a.entityId)
    } else {
        if (a.collider.collidingEntities.has(b.entityId))
            a.collider.collidingEntities.delete(b.entityId)
        if (b.collider.collidingEntities.has(a.entityId))
            b.collider.collidingEntities.delete(a.entityId)
    }
}

export class CollisionDetectionSystem extends SystemFactory<{}>
("CollisionDetectionSystem", {
    execute: ({world}) => {
        const colliderEntities = colliders(world);
        
        colliderEntities.forEach(obj => {
           obj.collider.collidingEntities.clear();
        });
        
        const byLayer = groupBy(colliderEntities, e => e.collider.layer);
        
        byLayer.forEach((entitiesA, layerA) => {
            const layers = collisionMatrix.get(layerA);
            if (!layers)
                return;
            layers.forEach(layerB => {
                const entitiesB = byLayer.get(layerB);
                if (!entitiesB)
                    return;
                entitiesA.forEach(a => {
                    entitiesB.forEach(b => {
                        if (a == b)
                            return;
                        handle_collision(a, b);
                    });
                });
            });
        });
    },
}) {}