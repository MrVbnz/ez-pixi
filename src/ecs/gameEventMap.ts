import type { EntityId, EventMap } from "@typeonce/ecs";

export const CollisionEnter = Symbol("CollisionEnter");
export const CollisionExit = Symbol("CollisionExit");

export interface GameEventMap extends EventMap {
    [CollisionEnter]: { entities: Set<EntityId> };
    [CollisionExit]: { entities: Set<EntityId> };
}