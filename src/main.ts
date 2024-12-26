import {Application, Assets, Graphics, PointData, Sprite, Texture, TilingSprite} from 'pixi.js';
import {SystemTags} from "./ecs/systemTags.ts";
import {GameEventMap} from "./ecs/gameEventMap.ts";
import {ECS, EntityId, InitFunctions} from "@typeonce/ecs";
import {SpriteWrapperComponent} from "./ecs/components/spriteWrapperComponent.ts";
import {ColliderComponent} from "./ecs/components/colliderComponent.ts";
import {PlayerComponent} from "./ecs/components/playerComponent.ts";
import {CollisionDetectionSystem} from "./ecs/systems/collisionDetectionSystem.ts";
import {MouseData, PlayerControlsSystem} from "./ecs/systems/playerControlsSystem.ts";
import {RigidbodyCollisionSystem} from "./ecs/systems/rigidbodyCollisionSystem.ts";
import {CircularRigidbodyComponent} from "./ecs/components/rigidbodyComponent.ts";
import {vec2} from "gl-matrix";
import {SpriteRenderingSystem} from "./ecs/systems/spriteRenderingSystem.ts";
import {BoundsComponent} from "./ecs/components/boundsComponent.ts";
import {LevelEditorSystem} from "./ecs/systems/levelEditorSystem.ts";

(async () => {
    const app = new Application();
    await app.init({background: '#1099bb', resizeTo: window});
    document.body.appendChild(app.canvas);

    const circleTexture = await Assets.load('/assets/textures/circle.png');
    await Assets.load('/assets/sprites/blocks.json');

    const mouseData: MouseData = {
        lastEvent: null,
        pressed: false,
        x: 0,
        y: 0
    };
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage
        .on('mousemove', e => {
            mouseData.x = e.global.x;
            mouseData.y = e.global.y;
            mouseData.lastEvent = e;
        })
        .on('pointerdown', e => {
            mouseData.lastEvent = e;
            mouseData.pressed = true;
        })
        .on('pointerup', e => {
            mouseData.lastEvent = e;
            mouseData.pressed = false;
        });

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

    function createWall(pos: PointData, size: PointData): TilingSprite {
        const sp = new TilingSprite(Texture.from("Stone_Bricks.png"));
        sp.position = pos;
        sp.width = size.x;
        sp.height = size.y;
        sp.tint = 0xFFFFFF;
        sp.anchor = {x: 0.5, y: 0.5};
        app.stage.addChild(sp);

        return sp;
    }

    function createWalls(state: InitFunctions<SystemTags, GameEventMap>) {
        const thickness = 48 * 2;
        let wall = createWall(
            {x: app.screen.width / 2, y: 0},
            {x: app.screen.width, y: thickness}
        );
        state.addComponent(
            state.createEntity(),
            new SpriteWrapperComponent({sprite: wall}),
            new BoundsComponent({
                position: vec2.fromValues(wall.position.x, wall.position.y),
                size: vec2.fromValues(wall.getSize().width, wall.getSize().height)
            }),
            new ColliderComponent({layer: "Level", collidingEntities: new Set<EntityId>()})
        );

        wall = createWall(
            {x: app.screen.width / 2, y: app.screen.height},
            {x: app.screen.width, y: thickness}
        );
        state.addComponent(
            state.createEntity(),
            new SpriteWrapperComponent({sprite: wall}),
            new BoundsComponent({
                position: vec2.fromValues(wall.position.x, wall.position.y),
                size: vec2.fromValues(wall.getSize().width, wall.getSize().height)
            }),
            new ColliderComponent({layer: "Level", collidingEntities: new Set<EntityId>()})
        )

        wall = createWall(
            {x: 0, y: app.screen.height / 2},
            {x: thickness, y: app.screen.height}
        );
        state.addComponent(
            state.createEntity(),
            new SpriteWrapperComponent({sprite: wall}),
            new BoundsComponent({
                position: vec2.fromValues(wall.position.x, wall.position.y),
                size: vec2.fromValues(wall.getSize().width, wall.getSize().height)
            }),
            new ColliderComponent({layer: "Level", collidingEntities: new Set<EntityId>()})
        )

        wall = createWall(
            {x: app.screen.width, y: app.screen.height / 2},
            {x: thickness, y: app.screen.height}
        );
        state.addComponent(
            state.createEntity(),
            new SpriteWrapperComponent({sprite: wall}),
            new BoundsComponent({
                position: vec2.fromValues(wall.position.x, wall.position.y),
                size: vec2.fromValues(wall.getSize().width, wall.getSize().height)
            }),
            new ColliderComponent({layer: "Level", collidingEntities: new Set<EntityId>()})
        )
    }

    const graphics = new Graphics();
    
    const world = ECS.create<SystemTags, GameEventMap>(
        (state) => {
            createWalls(state);

            const blockV = createWall(
                {x: app.screen.width / 2, y: app.screen.height / 2},
                {x: 48, y: 48 * 8}
            );
            state.addComponent(
                state.createEntity(),
                new SpriteWrapperComponent({sprite: blockV}),
                new BoundsComponent({
                    position: vec2.fromValues(blockV.position.x, blockV.position.y),
                    size: vec2.fromValues(blockV.getSize().width, blockV.getSize().height)
                }),
                new ColliderComponent({layer: "Level", collidingEntities: new Set<EntityId>()})
            )
            const blockH = createWall(
                {x: app.screen.width / 2, y: app.screen.height / 2},
                {x: 48 * 8, y: 48}
            );
            state.addComponent(
                state.createEntity(),
                new SpriteWrapperComponent({sprite: blockH}),
                new BoundsComponent({
                    position: vec2.fromValues(blockH.position.x, blockH.position.y),
                    size: vec2.fromValues(blockH.getSize().width, blockH.getSize().height)
                }),
                new ColliderComponent({layer: "Level", collidingEntities: new Set<EntityId>()})
            )

            for (let i = 0; i < 20; i++) {
                const random = 0.5 + Math.random();
                const mass = random * 2;
                const r = random * 50;
                const sprite = createBaseSprite(0x676767, r);
                state.addComponent(
                    state.createEntity(),
                    new CircularRigidbodyComponent({mass: mass, radius: 50 * random, velocity: vec2.create()}),
                    new SpriteWrapperComponent({sprite: sprite}),
                    new BoundsComponent({
                        position: vec2.fromValues(sprite.position.x, sprite.position.y),
                        size: vec2.fromValues(r * 2, r * 2)
                    }),
                    new ColliderComponent({layer: "Level", collidingEntities: new Set<EntityId>()})
                )
            }


            state.addComponent(
                state.createEntity(),
                new PlayerComponent(),
                new BoundsComponent({position: vec2.fromValues(50, 50), size: vec2.fromValues(100, 100)}),
                new CircularRigidbodyComponent({mass: 1, radius: 50, velocity: vec2.create()}),
                new SpriteWrapperComponent({sprite: createBaseSprite(0x995555, 50)}),
                new ColliderComponent({layer: "Player", collidingEntities: new Set<EntityId>()})
            );

            
            app.stage.addChild(graphics);
            
            state.addSystem(
                new LevelEditorSystem({mouseData: mouseData, appStage: app.stage, debug: graphics}),
                new CollisionDetectionSystem(),
                new RigidbodyCollisionSystem(),
                new SpriteRenderingSystem(),
                new PlayerControlsSystem({mouseData: mouseData})
            );
        }
    );

    app.ticker.add(({deltaTime}) => {
        graphics.clear();
        world.update(deltaTime);
    });
})();
