
import {ContainerStatus, IContainer, IContainerOperations} from "../orchestrator";
import {v4 as UUID} from 'uuid';
// @ts-ignore
import workerImage from '&/worker.img';
import {debug, MessageType, MPStart, peak} from "../../../shared/proc";
import {System} from "../../system";
import {ISystemModule} from "../../modules";

interface WorkerBucket{
    id: UUID,
    worker: Worker,
    container?: IContainer,
    resolve: (container: IContainer | PromiseLike<IContainer>) => void;
    handler?: (type: MessageType, message: Uint8Array, container: IContainer) => void;
}
const workers = new Map<string, WorkerBucket>();
const DEBUG = true;
function init(system: System){
    system.orchestrators.registerOrchestrator({
        name: "lorch",
        getcontainer: () => new Promise<IContainer>(resolve => {
            const id = UUID();
            const wrk = new Worker(workerImage, {
                name: "" + id
            });
            const buck = {
                id: id,
                worker: wrk,
                resolve,
            }
            workers.set(id, buck)
            wrk.addEventListener("message", async ev => {
                await handleMessage(ev, buck)
            });
        })
    })
}

const containerOperations: IContainerOperations = {
    run:(container, params) =>{
        const buck = workers.get(container.id)!;
        buck.handler = params.listener;
        container.status = ContainerStatus.RUNNING;
        buck.worker.postMessage(MPStart("", params.code, params.argv))
    },
    kill: container => {
        const buck = workers.get(container.id)!;
        buck.worker.terminate();
        workers.delete(buck.id);
        container.status = ContainerStatus.STOPPED;
    },
    send:(container, message) => {
        const buck = workers.get(container.id)!;
        buck.worker.postMessage(message, [message.buffer]);
    }
}


async function handleMessage(message: MessageEvent<Uint8Array>, bucket: WorkerBucket) {
    const [type, id] = peak(message.data);
    console.log(debug(message.data));
    if (type == MessageType.READY) {
        bucket.container = {
            id: bucket.id,
            status: ContainerStatus.WAITING,
            operations: containerOperations
        };
        bucket.resolve(bucket.container)
    } else {
        if (bucket.handler) {
            await bucket.handler(type, message.data, bucket.container!);
        }
    }
}

function cleanup(){

}

const m: ISystemModule = {
    name: "lorch",
    init: init,
    cleanup: cleanup
}

export default m;
