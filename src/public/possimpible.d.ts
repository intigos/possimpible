import {ISystemCalls} from "./api";


declare global {
    interface Window {
        proc: {
            argv: string[],
            sys: ISystemCalls
            entrypoint(ep: (...args: any) => any, p?: string)
        };
    }
}
