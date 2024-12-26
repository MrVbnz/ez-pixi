import {Component} from "@typeonce/ecs";
import {vec2} from "gl-matrix";
import {Bounds} from "pixi.js";

export class BoundsComponent extends Component("BoundsComponent")<{
    position: vec2;
    size: vec2;
}> {
    getBounds(): Bounds {
        return new Bounds(
            this.position[0] - this.size[0] * 0.5,
            this.position[1] - this.size[1] * 0.5,
            this.position[0] + this.size[0] * 0.5,
            this.position[1] + this.size[1] * 0.5,
        );
    }
}