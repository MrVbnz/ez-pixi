import {Application, Sprite, Texture} from 'pixi.js';
import {SystemTags} from "./ecs/systemTags.ts";
import {GameEventMap} from "./ecs/gameEventMap.ts";
import {ECS, EntityId} from "@typeonce/ecs";
import {SpriteWrapperComponent} from "./ecs/components/spriteComponent.ts";
import {ColliderComponent} from "./ecs/components/colliderComponent.ts";
import {PlayerComponent} from "./ecs/components/playerComponent.ts";
import {CollisionDetectionSystem} from "./ecs/systems/collisionDetectionSystem.ts";
import {PlayerControlsSystem} from "./ecs/systems/playerControlsSystem.ts";
import {RigidbodyCollisionSystem} from "./ecs/systems/rigidbodyCollisionSystem.ts";
import {RigidbodyComponent} from "./ecs/components/rigidbodyComponent.ts";
import {vec2} from "gl-matrix";

(async () => {
    const app = new Application();
    await app.init({background: '#1099bb', resizeTo: window});
    document.body.appendChild(app.canvas);

    const mouseCoords = {x: 0, y: 0};

    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('mousemove', (event) => {
        mouseCoords.x = event.global.x;
        mouseCoords.y = event.global.y;
    });

    function createBaseSprite(tint: number): Sprite {
        const sp = new Sprite(Texture.WHITE);
        sp.position.set(Math.random() * app.screen.width, Math.random() * app.screen.height - 200);
        sp.width = 100;
        sp.height = 100;
        sp.tint = tint;
        app.stage.addChild(sp);
        return sp;
    }

    function createFloor(x: number, size: number):  Sprite {
        const sp = new Sprite(Texture.WHITE);
        sp.position.set(x, app.screen.height- 100);
        sp.width = size;
        sp.height = 100;
        sp.tint = 0x111111;
        app.stage.addChild(sp);
        return sp;
    }

    const world = ECS.create<SystemTags, GameEventMap>(
        (worldState) => {

            const count = 5;
            const size = (app.screen.width / count);
            for (let i = 0; i < count; i++)
                worldState.addComponent(
                    worldState.createEntity(),
                    new SpriteWrapperComponent({sprite: createFloor(i * size, size - 3)}),
                    new ColliderComponent({layer: "Level", collidingEntities: new Set<EntityId>()})
                )

            for (let i = 0; i < 20; i++)
                worldState.addComponent(
                    worldState.createEntity(),
                    new RigidbodyComponent({mass: 1, velocity: vec2.create()}),
                    new SpriteWrapperComponent({sprite: createBaseSprite(0x676767)}),
                    new ColliderComponent({layer: "Level", collidingEntities: new Set<EntityId>()})
                )

            worldState.addComponent(
                worldState.createEntity(),
                new PlayerComponent(),
                new RigidbodyComponent({mass: 1, velocity: vec2.create()}),
                new SpriteWrapperComponent({sprite: createBaseSprite(0x995555)}),
                new ColliderComponent({layer: "Player", collidingEntities: new Set<EntityId>()})
            );

            worldState.addSystem(
                new CollisionDetectionSystem(),
                new RigidbodyCollisionSystem(),
                new PlayerControlsSystem({mousePosition: mouseCoords})
            );
        }
    );

    app.ticker.add(({deltaTime}) => {
        world.update(deltaTime);
    });
})();
