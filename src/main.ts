import {Application, Assets, PointData, Sprite, Texture} from 'pixi.js';
import {SystemTags} from "./ecs/systemTags.ts";
import {GameEventMap} from "./ecs/gameEventMap.ts";
import {ECS, EntityId, InitFunctions} from "@typeonce/ecs";
import {SpriteWrapperComponent} from "./ecs/components/spriteComponent.ts";
import {ColliderComponent} from "./ecs/components/colliderComponent.ts";
import {PlayerComponent} from "./ecs/components/playerComponent.ts";
import {CollisionDetectionSystem} from "./ecs/systems/collisionDetectionSystem.ts";
import {MouseData, PlayerControlsSystem} from "./ecs/systems/playerControlsSystem.ts";
import {RigidbodyCollisionSystem} from "./ecs/systems/rigidbodyCollisionSystem.ts";
import {CircularRigidbodyComponent} from "./ecs/components/rigidbodyComponent.ts";
import {vec2} from "gl-matrix";

(async () => {
    const app = new Application();
    await app.init({background: '#1099bb', resizeTo: window});
    document.body.appendChild(app.canvas);

    const circleTexture = await Assets.load('/assets/textures/circle.png');


    const mouseData: MouseData = {pressed: false, x: 0, y: 0};
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage
        .on('mousemove', (event) => {
            mouseData.x = event.global.x;
            mouseData.y = event.global.y;
        })
        .on('pointerdown', _ => mouseData.pressed = true)
        .on('pointerup', _ => mouseData.pressed = false);

    function createBaseSprite(tint: number, r: number): Sprite {
        const sp = new Sprite(circleTexture);
        const offset = 100;
        sp.position.set(
            offset + Math.random() * (app.screen.width - offset),
            offset + Math.random() * (app.screen.height - offset)
        );
        sp.width = r * 2;
        sp.height = r * 2;
        sp.anchor = {x: 0.5, y: 0.5};
        sp.tint = tint;
        app.stage.addChild(sp);
        return sp;
    }

    function createWall(pos: PointData, size: PointData): Sprite {
        const sp = new Sprite(Texture.WHITE);
        sp.position = pos;
        sp.width = size.x;
        sp.height = size.y;
        sp.tint = 0x111111;
        sp.anchor = {x: 0.5, y: 0.5};
        app.stage.addChild(sp);
        return sp;
    }

    function createWalls(state: InitFunctions<SystemTags, GameEventMap>) {
        const thickness = 100;
        let wall = createWall(
            {x: app.screen.width / 2, y: 0},
            {x: app.screen.width, y: thickness}
        );
        state.addComponent(
            state.createEntity(),
            new SpriteWrapperComponent({sprite: wall}),
            new ColliderComponent({layer: "Level", collidingEntities: new Set<EntityId>()})
        );

        wall = createWall(
            {x: app.screen.width / 2, y: app.screen.height},
            {x: app.screen.width, y: thickness}
        );
        state.addComponent(
            state.createEntity(),
            new SpriteWrapperComponent({sprite: wall}),
            new ColliderComponent({layer: "Level", collidingEntities: new Set<EntityId>()})
        )

        wall = createWall(
            {x: 0, y: app.screen.height / 2},
            {x: thickness, y: app.screen.height}
        );
        state.addComponent(
            state.createEntity(),
            new SpriteWrapperComponent({sprite: wall}),
            new ColliderComponent({layer: "Level", collidingEntities: new Set<EntityId>()})
        )

        wall = createWall(
            {x: app.screen.width, y: app.screen.height / 2},
            {x: thickness, y: app.screen.height}
        );
        state.addComponent(
            state.createEntity(),
            new SpriteWrapperComponent({sprite: wall}),
            new ColliderComponent({layer: "Level", collidingEntities: new Set<EntityId>()})
        )
    }

    const world = ECS.create<SystemTags, GameEventMap>(
        (state) => {
            createWalls(state);

            const blockV = createWall(
                {x: app.screen.width / 2, y: app.screen.height / 2},
                {x: 50, y: 400}
            );
            state.addComponent(
                state.createEntity(),
                new SpriteWrapperComponent({sprite: blockV}),
                new ColliderComponent({layer: "Level", collidingEntities: new Set<EntityId>()})
            )
            const blockH = createWall(
                {x: app.screen.width / 2, y: app.screen.height / 2},
                {x: 400, y: 50}
            );
            state.addComponent(
                state.createEntity(),
                new SpriteWrapperComponent({sprite: blockH}),
                new ColliderComponent({layer: "Level", collidingEntities: new Set<EntityId>()})
            )

            for (let i = 0; i < 30; i++) {
                const random = 0.5 + Math.random();
                const mass = random * 2;
                const r = random * 50;
                state.addComponent(
                    state.createEntity(),
                    new CircularRigidbodyComponent({mass: mass, radius: 50 * random, velocity: vec2.create()}),
                    new SpriteWrapperComponent({sprite: createBaseSprite(0x676767, r)}),
                    new ColliderComponent({layer: "Level", collidingEntities: new Set<EntityId>()})
                )
            }


            state.addComponent(
                state.createEntity(),
                new PlayerComponent(),
                new CircularRigidbodyComponent({mass: 1, radius: 50, velocity: vec2.create()}),
                new SpriteWrapperComponent({sprite: createBaseSprite(0x995555, 50)}),
                new ColliderComponent({layer: "Player", collidingEntities: new Set<EntityId>()})
            );

            state.addSystem(
                new CollisionDetectionSystem(),
                new RigidbodyCollisionSystem(),
                new PlayerControlsSystem({mouseData: mouseData})
            );
        }
    );

    app.ticker.add(({deltaTime}) => {
        world.update(deltaTime);
    });
})();
