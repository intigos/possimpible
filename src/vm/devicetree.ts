export interface IDeviceProperties{
    compatibility: string[]
}

export interface IDeviceDescription{
    id: string,
    properties: IDeviceProperties
}

export function DeviceDetail<T extends IDeviceProperties>(id: string, properties: T): IDeviceDescription{
    return {
        id,
        properties,
    }
}

export function discover(attach: IDeviceDescription[]): IDeviceDescription[]{
    return attach;
}

