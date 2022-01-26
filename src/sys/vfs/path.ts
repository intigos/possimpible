import {IChannel} from "./channel";
import {IMount} from "./mount";

export interface IPath{
    entry: IChannel;
    mount: IMount|null;
}
