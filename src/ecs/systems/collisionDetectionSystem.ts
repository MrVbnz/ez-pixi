import {ComponentClassMap, ComponentInstanceMap, EntityId, query, System} from "@typeonce/ecs";
import {SystemTags} from "../systemTags.ts";
import {GameEventMap} from "../gameEventMap.ts";
import {SpriteWrapperComponent} from "../components/spriteComponent.ts";
import {ColliderComponent} from "../components/colliderComponent.ts";
import {groupBy} from "../../utils/groupBy.ts";

export type CollisionLayer =
    | "Level"
    | "Player";

const collisionMatrix = new Map<CollisionLayer, CollisionLayer[]>([
    ["Player", ["Level"]],
    ["Level", ["Level"]]
]);

const queryMap: ComponentClassMap = {
    spriteWrapper: SpriteWrapperComponent,
    collider: ColliderComponent
};

const colliders = query(queryMap);

type CollidersQueryResponse = ComponentInstanceMap<typeof queryMap>;
    

const SystemFactory = System<SystemTags, GameEventMap>();

function handle_collision(a: CollidersQueryResponse, b: CollidersQueryResponse): void {
    const bounds1 = a.spriteWrapper.sprite.getBounds();
    const bounds2 = b.spriteWrapper.sprite.getBounds();

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