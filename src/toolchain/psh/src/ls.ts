import {print} from "libts";
import {IStat, Type} from "../../../public/api";


export enum Colors {
    HEADER =  '\u001b[95m',
    BLUE =  '\u001b[94m',
    CYAN =  '\u001b[96m',
    GREEN =  '\u001b[92m',
    YELLOW =  '\u001b[93m',
    RED =  '\u001b[91m',
    ENDC =  '\u001b[0m',
    BOLD =  '\u001b[1m',
    UNDERLINE =  '\u001b[4m',
}

export const red = (s: string) => Colors.RED + s + Colors.ENDC;
export const yellow = (s: string) => Colors.YELLOW + s + Colors.ENDC;
export const cyan = (s: string) => Colors.CYAN + s + Colors.ENDC;
export const green = (s: string) => Colors.GREEN + s + Colors.ENDC;


interface T{
    location: string,
    list: boolean
}

function parseArgs(argv:string[], pref: T){
    for (const arg of argv) {
        if(arg == "-l"){
            pref.list = true;
        }else{
            pref.location = arg;
        }
    }
}

export async function ls(argv: string[], cwd: string) {

    const pref = {location: cwd, list: false}
    parseArgs(argv.slice(1), pref);

    let fd = await self.proc.sys.open(pref.location, 0);
    let dirents = self.proc.unpackAStat(await self.proc.sys.read(fd, -1))
    if (pref.list) {
        listed(dirents);
    } else {
        for (let x of dirents.slice(2)) {
            print(x.name + "\n\r")
        }
    }
}

function genperm(val:number): string{
    let result = "";
    let i = val;
    for(let k = 0; k < 9 ; k++){
        let l;
        switch (k % 3){
            case 0: l = "x"; break
            case 1: l = "w"; break
            case 2: l = "r"; break
        }
        result = ((i & 0x1) ? l : "-") + result;
        i = i >> 1;
    }
    return result;
}

function paintName(s: IStat, name?: string){
    if(s.type == Type.DIR){
        return cyan(name || s.name);
    }else if(s.type == Type.FILE && s.srv == "s"){
        return green(name || s.name)
    }else if(s.type == Type.FILE && s.srv == "C"){
        return red(name || s.name)
    }
}

function lprint(s: IStat, name?:string){
    const d = new Date(s.atime * 1000);
    const z = d.toLocaleDateString('en-us', { year:"numeric", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit"})
    print(`${(s.type == Type.DIR ? "d": "-")}${genperm(s.mode)} ${s.srv} ${s.subsrv} ${s.uid} ${s.gid} ${s.length} ${z} ${paintName(s, name)}\n\r`)
}

function listed(stats: IStat[]) {
    lprint(stats[0], ".");
    lprint(stats[0], "..");
    for (const s of stats.slice(2)) {
        lprint(s);
    }
}
