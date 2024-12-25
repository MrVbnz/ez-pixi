import {Component} from "@typeonce/ecs";
import { vec2 } from "gl-matrix";

export class CircularRigidbodyComponent extends Component("CircularRigidbodyComponent")<{
    mass: number;
    radius: number;
    velocity: vec2;
}> {}