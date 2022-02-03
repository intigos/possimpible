import {System} from "../system";
import {INSProxy} from "../ns/ns";
import {IPath} from "../vfs/path";
import {IProtoTask, Task, ITaskStatus} from "./task";

export type pid = number;

interface IChildTask{
    pid: pid;
    task: Task
}

export class PidNS {
    parent: PidNS | null;
    private current: pid;
    pool: Map<pid, Task>;
    pools: Map<Task, pid[]>;
    children: PidNS[];

    constructor(parent: PidNS|null) {
        this.parent =  parent;
        this.current =  1;
        this.pool = new Map<pid, Task>();
        this.pools = new Map<Task, pid[]>();
        this.children =  [];
    }

    getPid(){
        return this.current++;
    }

    attach(task: Task) {
        task.pid = this.getPid();
        this.pool.set(task.pid, task);
        if(this.parent){
            this.parent.attachChild(task, [task.pid]);
        }
    }

    dettach(task: Task){
        this.pool.delete(task.pid);
        if(this.parent){
            this.parent.deattachChild(task);
        }
    }


    attachChild(task: Task, pids: pid[]){
        const pid = this.getPid();
        this.pool.set(pid, task);
        const npids = [pid].concat(Array.from(pids));
        this.pools.set(task, npids);
        if(this.parent){
            this.parent.attachChild(task, npids);
        }
    }


    deattachChild(task: Task){
        const p = this.pools.get(task)!;
        this.pool.delete(p[0]);
        this.pools.delete(task);
        if(this.parent){
            this.parent.deattachChild(task);
        }
    }

    get(pid: pid) {
        return this.pool.get(pid);
    }
}

export class PidManager{
    #system: System;

    constructor(system: System) {
        this.#system = system;
    }

    createNS(parent: PidNS|null):PidNS{
        const ns:PidNS = new PidNS(parent);

        if(parent){
            parent.children.push(ns);
        }

        return ns;
    }

    deleteNS(ns: PidNS){
        if (ns.parent){
            const index = ns.children.indexOf(ns);
            if (index > -1) {
                ns.children.splice(index, 1);
            }
        }
    }
}
