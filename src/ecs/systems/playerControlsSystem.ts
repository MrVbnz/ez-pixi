import {query, System} from "@typeonce/ecs";
import {SystemTags} from "../systemTags.ts";
import {GameEventMap} from "../gameEventMap.ts";
import {PlayerComponent} from "../components/playerComponent.ts";
import {CircularRigidbodyComponent} from "../components/rigidbodyComponent.ts";
import {BoundsComponent} from "../components/boundsComponent.ts";
import {FederatedPointerEvent} from "pixi.js";

export type MouseData = {
    lastEvent: FederatedPointerEvent | null
    pressed: boolean;
    x: number;
    y: number;
}

const players = query({
    bounds: BoundsComponent,
    player: PlayerComponent,
    rigidbody: CircularRigidbodyComponent,
});

const SystemFactory = System<SystemTags, GameEventMap>();

export class PlayerControlsSystem extends SystemFactory<{
    mouseData: MouseData
}>
("PlayerControlsSystem", {
    execute: ({world, input}) => {
        players(world).forEach(obj => {
            if (!input.mouseData.pressed)
                return;
            
            const dx = obj.bounds.position[0] - input.mouseData.x;
            const dy = obj.bounds.position[1] - input.mouseData.y;
            obj.rigidbody.velocity[0] = -dx * 0.05;
            obj.rigidbody.velocity[1] = -dy * 0.05;
        });
    },
}) {}