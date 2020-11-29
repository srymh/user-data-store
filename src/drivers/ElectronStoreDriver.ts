import {StoreDriver, StoreDriverBaseOptions} from '../StoreDriver';
import ElectronStore from 'electron-store';

export type RecordType<T> = {
  [key: string]: T;
};

export type ElectronStoreDriverOptions<T> = Omit<
  ElectronStore.Options<RecordType<T>>,
  'name'
>;

export class ElectronStoreDriver<T> implements StoreDriver<T> {
  private store: ElectronStore<RecordType<T>>;

  constructor(options: StoreDriverBaseOptions & ElectronStoreDriverOptions<T>) {
    this.store = new ElectronStore<RecordType<T>>({
      ...options,
      ...{
        name: `${options.name}_${options.storeName}`,
        storeName: undefined,
      },
    });
  }

  async setItem(key: string, value: T): Promise<T | Error> {
    this.store.set(key, value);
    return value;
  }

  async getItem(key: string): Promise<T | null> {
    const value = this.store.get(key);
    return value;
  }

  async getItems(): Promise<T[]> {
    const items: T[] = [];
    for (const key in this.store.store) {
      items.push(this.store.store[key]);
    }
    return items;
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
    return;
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
