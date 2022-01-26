import {CreateMode, OpenMode, Type} from "./api";
import {FileDescriptor} from "../shared/proc";

enum Protocol9P{
    Tversion = 100,
    Rversion = 101,
    Tattach = 104,
    Rattach = 105,
    Rerror = 107,
    Tflush = 108,
    Rflush = 109,
    Twalk = 110,
    Rwalk = 111,
    Topen = 112,
    Ropen = 113,
    Tcreate = 114,
    Rcreate = 115,
    Tread = 116,
    Rread = 117,
    Twrite = 118,
    Rwrite = 119,
    Tclunk = 120,
    Rclunk = 121,
    Tremove = 122,
    Tstat = 124,
    Rstat = 125,
    Twstat = 126
}

type Qid = [number,number,Type]

type I9PRQid = [Qid]
type IStat = any;
type Fid = number;

interface IOperations9P{
    attach: (fid: Fid, aname: string) => Promise<I9PRQid>
    open: (fid: Fid, mode: OpenMode) => Promise<I9PRQid>,
    clunk: (fid: Fid) => Promise<void>,
    create: (fid: Fid, name:string, mode:CreateMode) => Promise<I9PRQid>,
    remove: (fid: Fid) => Promise<void>,
    wstat: (fid: Fid, s: IStat) => Promise<void>,
    stat: (fid: Fid) => Promise<IStat>,
    wattr: (fid: Fid, l:string, s: string) => Promise<void>,
    attr: (fid: Fid, l:string) => Promise<string>,
    read: (fid: Fid, offset:number, count:number) => Promise<Uint8Array>,
    write: (fid: Fid, buf:Uint8Array, offset:number) => Promise<void>,
    walk: (fid: Fid, newfid: Fid, name: string) => Promise<void>,
}

class Service9P{
    private fd: FileDescriptor;
    private ops: IOperations9P;

    constructor(fd: FileDescriptor, ops: IOperations9P){
        this.fd = fd;
        this.ops = ops;
    }

    accept(x: any){

    }

    async run() {
        while (true) {
            const message = await self.proc.sys.read(this.fd, -1);


        }
    }
}
