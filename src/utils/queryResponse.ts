import {ComponentClassMap, ComponentInstanceMap, EntityId} from "@typeonce/ecs";

export type QueryResponse<T extends ComponentClassMap> = { entityId: EntityId } & ComponentInstanceMap<T>;