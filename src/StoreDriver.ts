export interface StoreDriver<T> {
  setItem(key: string, value: T): Promise<T | Error>;
  getItem(key: string): Promise<T | null>;
  getItems(): Promise<T[]>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

export type StoreDriverBaseOptions = {name: string; storeName: string};

export interface StoreDriverConstructor {
  new <T>(options: StoreDriverBaseOptions): StoreDriver<T>;
}
