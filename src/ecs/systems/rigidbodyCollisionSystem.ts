import {query, System} from "@typeonce/ecs";
import {SystemTags} from "../systemTags.ts";
import {GameEventMap} from "../gameEventMap.ts";
import {SpriteWrapperComponent} from "../components/spriteComponent.ts";
import {RigidbodyComponent} from "../components/rigidbodyComponent.ts";
import {ColliderComponent} from "../components/colliderComponent.ts";
import {vec2} from "gl-matrix";
import {v2h} from "../../utils/vec2helper.ts";

const rigidbodies = query({
    spriteWrapper: SpriteWrapperComponent,
    collider: ColliderComponent,
    rigidbody: RigidbodyComponent,
});

const SystemFactory = System<SystemTags, GameEventMap>();

function calculateOverlap(minA: number, maxA: number, minB: number, maxB: number): number {
    if (maxA > minB && minA < maxB) {
        const centerA = (minA + maxA) / 2;
        const centerB = (minB + maxB) / 2;
        if (centerA < centerB) {
            return maxA - minB;
        } else {
            return minA - maxB;
        }
    }
    return 0;
}

export class RigidbodyCollisionSystem extends SystemFactory<{}>
("RigidbodyCollisionSystem", {
    dependencies: ["CollisionDetectionSystem"],
    execute: ({world, getComponent, getComponentRequired, deltaTime}) => {
        rigidbodies(world).forEach(obj => {
            const ourSprite = obj.spriteWrapper.sprite;
            const ourSpeed = obj.rigidbody.velocity;
            
            ourSpeed[1] += 0.1 * deltaTime;
            vec2.scale(ourSpeed, ourSpeed, 0.99);
            
            const ourMass = obj.rigidbody.mass;
            const ourBounds = ourSprite.getBounds();

            const vec2pool = v2h.getPoolCtx();
            const velocity = vec2pool.get();
            vec2.scale(velocity, obj.rigidbody.velocity, deltaTime);
            const position = vec2pool.get();
            v2h.p2v(ourSprite.position, position);
            vec2.add(position, position, velocity);

            // console.log("Id: " + obj.entityId + "   Collisions: " + obj.collider.collidingEntities.size);

            obj.collider.collidingEntities.forEach(other => {
                const otherSpriteWrapper = getComponentRequired({
                    spriteWrapper: SpriteWrapperComponent
                })(other);
                const otherRigidbody = getComponent({
                    rigidbody: RigidbodyComponent
                })(other);

                const otherSprite = otherSpriteWrapper.spriteWrapper.sprite;
                const otherMass = otherRigidbody ? otherRigidbody.rigidbody.mass : Infinity;
                const otherSpeed = otherRigidbody ? otherRigidbody.rigidbody.velocity : vec2pool.get();
                const otherBounds = otherSprite.getBounds();
                const otherPosition = vec2pool.get();
                v2h.p2v(otherSprite.position, otherPosition);
                
                const normal = vec2pool.get();
                v2h.p2v(otherSprite.position, normal);
                vec2.sub(normal, normal, position);
                vec2.normalize(normal, normal);

                const relativeV = vec2pool.get();
                vec2.sub(relativeV, otherSpeed, ourSpeed);
                const normalV = vec2.dot(relativeV, normal);
                if (normalV > 0)
                    return; // TODO: DO NOT return, preform position solve
                const kE = 0.8; //Coefficient of restitution (elastic collision)
                const scalarImpulse = (-(1 + kE) * normalV) / (1 / ourMass + 1 / otherMass);
                const impulse = vec2pool.get();
                vec2.scale(impulse, normal, scalarImpulse * (1 / ourMass) * deltaTime);
                vec2.sub(ourSpeed, ourSpeed, impulse); // handle only our speed. other will handle its itself
                vec2.add(otherSpeed, otherSpeed, impulse);

                const overlapX = calculateOverlap(
                    ourBounds.minX, ourBounds.maxX, otherBounds.minX, otherBounds.maxX
                );
                const overlapY = calculateOverlap(
                    ourBounds.minY, ourBounds.maxY, otherBounds.minY, otherBounds.maxY
                );

                if (Math.abs(overlapX) < Math.abs(overlapY)) {
                    position[0] -= overlapX;
                } else {
                    position[1] -= overlapY;
                }
            });

            v2h.v2p(position, ourSprite.position);
            vec2pool.release();
        });
    },
}) {
}