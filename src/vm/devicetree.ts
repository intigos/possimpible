import uaparser from 'ua-parser-js'

export interface IDeviceTree {
    id: string;
    label?: string;
    value?: any;
    children?: IDeviceTree[];
}

export function DSNode(id: string, label: string | IDeviceTree[], children?: IDeviceTree[]): IDeviceTree {
    if (children) {
        return {
            id: id,
            label: id,
            children: children,
        }
    } else {
        return {
            id: id,
            children: label as IDeviceTree[],
        }
    }
}

export function DSProperty(id: string, value: any): IDeviceTree {
    return {
        id: id,
        value: value,
    }
}

export interface DSDevice {
    attach(): IDeviceTree[];
}

export abstract class DSDisplay implements DSDevice {
    abstract attach(): IDeviceTree[];

}

export abstract class DSStorage implements DSDevice {
    abstract attach(): IDeviceTree[];

}

export abstract class DSKeyboard implements DSDevice {
    abstract attach(): IDeviceTree[];

}

export function discover(attach: IDeviceTree[]) {
    const data = uaparser()
    return DSNode("/", [
        DSNode((data.browser.name || "unknown") + ","+data.browser.version, ([
            // autodiscover features
        ] as IDeviceTree[]).concat(attach)),
    ]);
}

