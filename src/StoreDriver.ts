export interface StoreDriver<T> {
  setItem(key: string, value: T): Promise<T | Error>;
  getItem(key: string): Promise<T | null>;
  getItems(): Promise<T[]>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface StoreDriverConstructor {
  new <T>(options: {name: string; storeName: string}): StoreDriver<T>;
}
