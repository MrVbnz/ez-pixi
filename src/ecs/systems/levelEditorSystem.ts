import {EntityId, query, System} from "@typeonce/ecs";
import {SystemTags} from "../systemTags.ts";
import {GameEventMap} from "../gameEventMap.ts";
import {BoundsComponent} from "../components/boundsComponent.ts";
import {MapObjectComponent} from "../components/mapObjectComponent.ts";
import {vec2} from "gl-matrix";
import {roundWithStep} from "../../utils/math.ts";
import {QueryResponse} from "../../utils/queryResponse.ts";
import {SpriteWrapperComponent} from "../components/spriteWrapperComponent.ts";
import {ColliderComponent} from "../components/colliderComponent.ts";
import {Container, Graphics, Texture, TilingSprite} from "pixi.js";
import {MouseData} from "./playerControlsSystem.ts";

const gridSize: number = 48;

const mapObjectsQueryMap = {
    bounds: BoundsComponent,
    levelObject: MapObjectComponent,
};
type MapObjectsQueryResponse = QueryResponse<typeof mapObjectsQueryMap>;

const objectsWithBoundsQueryMap = {
    bounds: BoundsComponent,
};

const mapObjectsQuery = query(mapObjectsQueryMap);
const objectsWithBoundsQuery = query(objectsWithBoundsQueryMap);

const SystemFactory = System<SystemTags, GameEventMap>();

const lastInputState: MouseData = {
    lastEvent: null,
    pressed: false,
    x: 0,
    y: 0,
}

export class LevelEditorSystem extends SystemFactory<{
    mouseData: MouseData,
    appStage: Container
    debug: Graphics
}>
("LevelEditorSystem", {
    execute: ({world, getComponent, addComponent, createEntity, destroyEntity, input}) => {
        const mapObjects: MapObjectsQueryResponse[] = mapObjectsQuery(world);
        const shouldToggle = !lastInputState.pressed && input.mouseData.pressed;
        Object.assign(lastInputState, input.mouseData);

        objectsWithBoundsQuery(world).forEach(obj => {
            const bounds = obj.bounds.getBounds();
            input.debug
                .moveTo(bounds.minX, bounds.minY)
                .lineTo(bounds.maxX, bounds.minY)
                .lineTo(bounds.maxX, bounds.maxY)
                .lineTo(bounds.minX, bounds.maxY)
                .lineTo(bounds.minX, bounds.minY)
                .stroke({ width: 8, color: 0x00d9FF });
        });
        
        if (shouldToggle) {
            const blockingObjects = mapObjects
                .filter(obj => onIsOnTile(input.mouseData, obj.bounds.position, gridSize));
            blockingObjects
                .forEach(obj => {
                    const spriteWrapperResponse = getComponent({
                        spriteWrapper: SpriteWrapperComponent
                    })(obj.entityId);
                    console.log("Destroyed");
                    destroyEntity(obj.entityId);
                    if (spriteWrapperResponse)
                        spriteWrapperResponse.spriteWrapper.sprite.destroy();                    
                });
            if (blockingObjects.length > 0 || input.mouseData.lastEvent?.ctrlKey)
                return;
            
            const newObject = createEntity();
            const sp = new TilingSprite(Texture.from("Stone_Bricks.png"));
            sp.position = {
                x: roundWithStep(input.mouseData.x, gridSize),
                y: roundWithStep(input.mouseData.y, gridSize)
            };
            sp.width = gridSize;
            sp.height = gridSize;
            sp.anchor = {x: 0.5, y: 0.5};
            input.appStage.addChild(sp);
            addComponent(
                newObject,
                new MapObjectComponent(),
                new SpriteWrapperComponent({sprite: sp}),
                new BoundsComponent({
                    position: vec2.fromValues(sp.position.x, sp.position.y),
                    size: vec2.fromValues(sp.getSize().width, sp.getSize().height)
                }),
                new ColliderComponent({layer: "Level", collidingEntities: new Set<EntityId>()})
            );
            console.log("Created");
        }
    },
}) {
}

function onIsOnTile(mouse: MouseData, position: vec2, gridSize: number): boolean {
    return (roundWithStep(mouse.x, gridSize) == roundWithStep(position[0], gridSize))
        && (roundWithStep(mouse.y, gridSize) == roundWithStep(position[1], gridSize))
}

