export type DataContainer<T> = {
  key: string;
  storedAt: string;
  data: T;
};

export function IsDataContainer(arg: any): arg is DataContainer<unknown> {
  if (typeof arg !== 'object') {
    return false;
  } else if (typeof arg?.key !== 'string') {
    return false;
  } else if (typeof arg?.storedAt !== 'string') {
    return false;
  } else if (arg?.data === undefined) {
    return false;
  } else {
    return true;
  }
}

export type BackupData = {
  key: string;
  storedAt: string;
  json: string;
};

export type DownloadJsonFile = (
  fileName: string,
  text: string
) => Promise<Error | void>;
export type ProvideKey<T> = (value: T) => string;
