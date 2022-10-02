import {System} from "../system";
import {IChannel} from "../vfs/channel";
import {ForkMode2, OpenMode} from "../../public/api";
import {IProtoTask} from "./task";
import {packBytearray} from "../../shared/struct";

export interface LinkedBinary{
    module: WebAssembly.Module
}

export class LinkerManager{
    private system: System;

    constructor(system: System) {
        this.system = system;
    }

    public async link(path: string, parent: IProtoTask): Promise<Uint8Array> {
        const entry = (await this.system.vfs.lookup(path, parent))!;
        const file = await this.system.vfs.open(entry, OpenMode.EXEC | OpenMode.READ);
        const binary = await file.channel.operations.read!(file.channel, -1, 0);
        const module = await WebAssembly.compile(binary);

        return binary;
    }
}
