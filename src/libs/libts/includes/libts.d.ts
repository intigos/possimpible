declare module "libts" {
    export function print(s: string): void;

    export async function wait(pid: number): Promise<string>;

    export async function exit(code: number): Promise<void>;

    export async function readline(): Promise<string>;

    export async function slurp(path: string): Promise<string>;
}
