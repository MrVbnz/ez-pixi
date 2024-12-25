import {Component} from "@typeonce/ecs";
import {Sprite} from "pixi.js";

export class SpriteWrapperComponent extends Component("SpriteWrapperComponent")<{
    sprite: Sprite
}> {}