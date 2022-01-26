import {System} from "./system";

export enum LogLevel{

    INFO,
    WARNING,
    ERROR,
    DEBUG
}

export class LogManager{
    private system: System;
    private kmesg = "";
    private loglevel: LogLevel;

    constructor(system: System) {
        this.system = system;
        this.loglevel = LogLevel.INFO;
    }

    log(s: string, l: LogLevel){
        this.kmesg += s;
        if(l <= this.loglevel){
            this.system.printk(s);
        }
    }

    setLogLevel(l: LogLevel){
        this.loglevel = l;
    }
}
