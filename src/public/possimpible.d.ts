import {IStat, ISystemCalls} from "./api";


declare global {
    interface Window {
        proc: {
            argv: string[],
            sys: ISystemCalls
            packStat: (stat: IStat) => Uint8Array;
            unpackStat: (s: Uint8Array) => IStat;
            packAStat:(stat: IStat[]) => Uint8Array;
            unpackAStat:(s: Uint8Array) => IStat[]
            entrypoint(ep: (...args: any) => any, p?: string)
        };
    }
}
