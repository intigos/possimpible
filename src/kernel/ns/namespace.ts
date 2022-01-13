import {Kernel} from "../kernel";

export interface INamespaceProxy {

}

export enum NSOperation {
    NEW_MOUNT = 0x000001,
    NEW_PROC = 0x000002,
}

export class NamespaceManager{
    private kernel: Kernel;

    constructor(kernel: Kernel) {
        this.kernel = kernel;
    }

    create(options: NSOperation): INamespaceProxy {
        return {}
    }
}
