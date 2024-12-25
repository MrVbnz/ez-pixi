import {query, System} from "@typeonce/ecs";
import {SystemTags} from "../systemTags.ts";
import {GameEventMap} from "../gameEventMap.ts";
import {SpriteWrapperComponent} from "../components/spriteComponent.ts";
import {PlayerComponent} from "../components/playerComponent.ts";
import {RigidbodyComponent} from "../components/rigidbodyComponent.ts";

const players = query({
    spriteWrapper: SpriteWrapperComponent,
    player: PlayerComponent,
    rigidbody: RigidbodyComponent,
});

const SystemFactory = System<SystemTags, GameEventMap>();

export class PlayerControlsSystem extends SystemFactory<{
    mousePosition: { x: number; y: number; }
}>
("PlayerControlsSystem", {
    execute: ({world, input}) => {
        players(world).forEach(obj => {
            const dx = obj.spriteWrapper.sprite.x - input.mousePosition.x;
            const dy = obj.spriteWrapper.sprite.y - input.mousePosition.y;
            obj.rigidbody.velocity[0] = -dx * 0.05;
            obj.rigidbody.velocity[1] = -dy * 0.05;
        });
    },
}) {}