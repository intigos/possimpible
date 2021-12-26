import {ISystemCalls} from "./api";


declare global {
    interface Window {
        proc: {
            argv: string[],
            sys: ISystemCalls
        };
    }
}
