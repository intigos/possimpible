import {IChannel} from "./channel";
import {IMount} from "./mount";

export interface IPath{
    channel: IChannel;
    mount: IMount|null;
}
