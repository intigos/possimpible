import {ISystemModule} from "../modules";
import {System} from "../system";
import {getstat, IDirtab, mkdirtabA, read, walk} from "../dirtab";
import {MType, Type} from "../../public/api";
import {channeldevpath, IChannel} from "../vfs/channel";
import {ITaskStatus, Task} from "../proc/task";



function init(system: System){
    const rootdir = (): IDirtab[] => {
        const result:IDirtab[] = []
        for(const task of system.current!.ns.pid.pool.values()){
            result.push({name: "" + task.pid, id:1, type:Type.DIR, l:0, mode: 0, uid: system.sysUser, dirtab: () => {
                    const p: IDirtab[] = [
                        {name: "root", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
                            read:async (c, count, offset) => {
                                return system.encoder.encode(system.vfs.path(task.root, task));
                            }
                        },
                        {name: "cwd", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
                            read:async (c, count, offset) => {
                                return system.encoder.encode(system.vfs.path(task.pwd, task));
                            }
                        },
                        {name: "start", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
                            read:async (c, count, offset) => {
                                return system.encoder.encode("" + task.startTime);
                            }
                        },
                        {name: "cpu", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
                            read:async (c, count, offset) => {
                                return system.encoder.encode(system.vfs.path(task.cpu.path, task));
                            }
                        },
                        {name: "status", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
                            read:async (c, count, offset) => {
                                const t = task as Task;
                                return system.encoder.encode(ITaskStatus[t.status]);
                            }
                        },
                        {name: "user", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
                            read:async (c, count, offset) => {
                                const t = task as Task;
                                return system.encoder.encode(t.user);
                            }
                        },
                        {name: "status", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
                            read:async (c, count, offset) => {
                                const t = task as Task;
                                return system.encoder.encode(ITaskStatus[t.status]);
                            }
                        },
                        {name: "args", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
                            read:async (c, count, offset) => {
                                const t = task as Task;
                                return system.encoder.encode(system.vfs.path(task.path, task) + " " + t.argv.reduce((x, y) => x + " " + y, ""));
                            }
                        }
                    ]
                    return p;
                }
            })
        }

        result.push({name: "mounts", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
                    read:(async (c:IChannel, count, offset) => {
                        const task = system.current;
                        let result = "";
                        for (let i = task?.ns.mnt.mounts.length! - 1; i >= 0; i--) {
                            const mnt = task?.ns.mnt.mounts[i]!;
                            if(mnt.mount.bind){
                                result += "bind";
                            }else{
                                result += "mount";
                            }
                            if(MType.REPL & mnt.mount.flags){

                            }
                            if(MType.AFTER & mnt.mount.flags){
                                result += " -c";
                            }
                            if(MType.BEFORE & mnt.mount.flags){
                                result += " -b";
                            }
                            if(MType.CREATE & mnt.mount.flags){
                                result += " -c";
                            }
                            if(!mnt.mount.root.mount) {
                                if(mnt.mount.root.channel.srv == "M" && !mnt.mount.bind){
                                    result += " " + "<mountpoint>"
                                }else{
                                    result += " " + channeldevpath(mnt.mount.root.channel);
                                }
                            } else
                                result += " " + system.vfs.path(mnt.mount.root, task!);

                            result += " " + system.vfs.path({
                                channel: mnt.mount.mountpoint,
                                mount: mnt.mount.parent
                            }, task!);

                            result += "\n";
                        }

                        return system.encoder.encode(result);
                    }).bind(system)
        })
        return result;
    }

    system.dev.registerDevice({
        id: "p",
        name: "proc",
        operations: {
            attach: async (options, system1) => {
                let c = system.channels.mkchannel();
                c.srv = "p";
                c.map = mkdirtabA(rootdir, system);
                c.type = Type.DIR;
                c.operations = {
                    read: read,
                    walk: walk,
                    getstat: getstat
                }
                return c;
            }
        }
    });
}

function cleanup(){

}

const module: ISystemModule = {
    name: "proc",
    init: init,
    cleanup: cleanup
}

export default module;
