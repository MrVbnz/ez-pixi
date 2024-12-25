import {query, System} from "@typeonce/ecs";
import {SystemTags} from "../systemTags.ts";
import {GameEventMap} from "../gameEventMap.ts";
import {SpriteWrapperComponent} from "../components/spriteComponent.ts";
import {PlayerComponent} from "../components/playerComponent.ts";
import {CircularRigidbodyComponent} from "../components/rigidbodyComponent.ts";

export type MouseData = {
    pressed: boolean; x: number; y: number;
}

const players = query({
    spriteWrapper: SpriteWrapperComponent,
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
            
            const dx = obj.spriteWrapper.sprite.x - input.mouseData.x;
            const dy = obj.spriteWrapper.sprite.y - input.mouseData.y;
            obj.rigidbody.velocity[0] = -dx * 0.05;
            obj.rigidbody.velocity[1] = -dy * 0.05;
        });
    },
}) {}