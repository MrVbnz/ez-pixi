import {Component} from "@typeonce/ecs";
import {Sprite, TilingSprite} from "pixi.js";

export class SpriteWrapperComponent extends Component("SpriteWrapperComponent")<{
    sprite: Sprite | TilingSprite
}> {}