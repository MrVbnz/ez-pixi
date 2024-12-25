import {Component} from "@typeonce/ecs";
import { vec2 } from "gl-matrix";

export class RigidbodyComponent extends Component("RigidbodyComponent")<{
    mass: number;
    velocity: vec2;
}> {}