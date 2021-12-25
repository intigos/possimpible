import {IProcMessage, MessageType} from "../../shared/proc";
import {v4 as UUID } from 'uuid';
import {Kernel} from "../kernel";


export enum ContainerStatus{
    PENDING,
    WAITING,
    RUNNING,
    STOPPED
}

interface IOrchestrator{
    name: string
    getcontainer: () => Promise<IContainer>;
}

export interface IContainerOperations {
    send: (container: IContainer, message:IProcMessage) => void,
    run: (container: IContainer, code: string, listener: (message:IProcMessage, container: IContainer) => void) => void
    kill: (container: IContainer) => void
}

export interface IContainer{
    id: UUID
    status: ContainerStatus,
    operations: IContainerOperations
}

export class OrchestratorManagement {
    private orchestrator = new Map<string, IOrchestrator>();
    private kernel: Kernel;

    constructor(kernel: Kernel) {
        this.kernel = kernel;
    }

    registerOrchestrator(orchestrator: IOrchestrator){
        this.kernel.printk("Registering Orchestrator " + orchestrator.name);
        this.orchestrator.set(orchestrator.name, orchestrator);
    }

    getOrchestrator(name: string){
        return this.orchestrator.get(name);
    }

    async getContainer(orchestrator: IOrchestrator){
        return orchestrator.getcontainer();
    }

}
