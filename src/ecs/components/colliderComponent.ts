import {Component, EntityId} from "@typeonce/ecs";
import {CollisionLayer} from "../systems/collisionDetectionSystem.ts";

export class ColliderComponent extends Component("ColliderComponent")<{
    layer: CollisionLayer;
    collidingEntities: Set<EntityId>;
}> {}