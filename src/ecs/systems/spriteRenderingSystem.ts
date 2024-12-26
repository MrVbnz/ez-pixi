import {query, System} from "@typeonce/ecs";
import {SystemTags} from "../systemTags.ts";
import {GameEventMap} from "../gameEventMap.ts";
import {BoundsComponent} from "../components/boundsComponent.ts";
import {SpriteWrapperComponent} from "../components/spriteWrapperComponent.ts";
import {v2h} from "../../utils/vec2helper.ts";


const sprites = query({
    bounds: BoundsComponent,
    spriteWrapper: SpriteWrapperComponent,
});

const SystemFactory = System<SystemTags, GameEventMap>();

export class SpriteRenderingSystem extends SystemFactory<{}>
("SpriteRenderingSystem", {
    execute: ({world}) => {
        sprites(world).forEach(obj => {
            v2h.v2p(obj.bounds.position, obj.spriteWrapper.sprite.position);
        });
    },
}) {
}