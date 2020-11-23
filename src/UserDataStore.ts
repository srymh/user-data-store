import {md5hex} from './utils/md5hex';
import {provideKey} from './utils/provideKey';
import {downloadJsonFile} from './utils/downloadJsonFile';
import {StoreDriver, StoreDriverConstructor} from './StoreDriver';

type BackupData = {
  key: string;
  storedAt: string;
  json: string;
};

export type DownloadJsonFile = (fileName: string, text: string) => void;
export type ProvideKey<T> = (value: T) => string;

export type UserDataStoreOptions<T> = {
  driver: StoreDriverConstructor;
  name: string;
  storeName: string;
  downloadJsonFile?: DownloadJsonFile;
  confirmType?: (arg: any) => arg is T;
  provideKey?: ProvideKey<T>;
};

export class UserDataStore<T> {
  private store: StoreDriver<T>;
  private backupStore: StoreDriver<BackupData>;
  private _name: string;
  private storeName: string;
  private downloadJsonFile: DownloadJsonFile | null;
  private confirmType: ((arg: any) => arg is T) | null;
  private provideKey: ProvideKey<T>;

  constructor(options: UserDataStoreOptions<T>) {
    this._name = options.name;
    this.storeName = options.storeName;
    this.downloadJsonFile = options.downloadJsonFile ?? downloadJsonFile;
    this.confirmType = options.confirmType ?? null;
    this.provideKey = options.provideKey ?? provideKey;
    this.store = new options.driver<T>({
      name: options.name,
      storeName: options.storeName,
    });
    this.backupStore = new options.driver<BackupData>({
      name: options.name,
      storeName: options.storeName,
    });
  }

  public get name(): string {
    return this._name;
  }

  public async setItem(value: T): Promise<T | Error> {
    const key = this.provideKey(value);
    if (this.confirmType) {
      if (this.confirmType(value)) {
        return await this.store.setItem(key, value);
      } else {
        return new Error(`Failed setItem: typeof value is wrong`);
      }
    } else {
      return await this.store.setItem(key, value);
    }
  }

  public async getItem(key: string): Promise<T | null> {
    return await this.store.getItem(key);
  }

  public async getItems(): Promise<T[]> {
    return await this.store.getItems();
  }

  public async removeItem(key: string): Promise<void> {
    await this.store.removeItem(key);
  }

  public async clear(): Promise<void> {
    await this.store.clear();
  }

  public async backup(json: string): Promise<string> {
    const backupKey = md5hex(json);
    const backupData: BackupData = {
      key: backupKey,
      storedAt: new Date(Date.now()).toISOString(),
      json: json,
    };
    await this.backupStore.setItem(backupKey, backupData);
    return backupKey;
  }

  public async restore(backupKey: string): Promise<[string, Error?]> {
    const backupData = await this.backupStore.getItem(backupKey);
    if (backupData?.json) {
      const [key, error] = await this.importJson(backupData.json);
      if (error) {
        // You can resote store data by using this key
        return [
          key,
          new Error(
            `Failed restore: Unexpected Error. Backup data are broken.`
          ),
        ];
      } else {
        return [key];
      }
    } else {
      // Key is not required because store data has not changed.
      const key = '';
      return [key, new Error(`Failed restore: No data of key ${backupKey}`)];
    }
  }

  /**
   * Overwrite store data with the imported data.
   * Back up store data and return backup key, before overwriting.
   * If importing is failed, return an `Error` object.
   * You can restore store data using the returned backup key.
   *
   * @example
   * ```
   * const [backupKey, error] = await userDataStore.importJson(json);
   * if (error) {
   *   console.error(error.message);
   *   await userDataStore.restore(backupKey); // Roll back store data
   * } else {
   *   // Do something
   * }
   * ```
   *
   * @param json Data to import
   * @returns Key to restore before importing json. If error, also return `Error`.
   */
  public async importJson(json: string): Promise<[string, Error?]> {
    const backupJson = await this.exportAsJson();
    const backupKey = await this.backup(backupJson);

    await this.clear();

    try {
      // var の使いどころ
      var parsed = JSON.parse(json);
    } catch (error) {
      return [backupKey, new Error(`Failed importByJson: ${error.message}`)];
    }

    if (!Array.isArray(parsed)) {
      return [backupKey, new Error('Failed importByJson: Invalid JSON')];
    } else {
      for (const item of parsed) {
        const maybeError = await this.setItem(item);
        if (maybeError instanceof Error) {
          // Shoud I rollback?
          return [
            backupKey,
            new Error(`Failed importByJson: ${maybeError.message}`),
          ];
        }
      }
    }

    return [backupKey];
  }

  public async exportAsJson() {
    const arr: T[] = await this.getItems();
    return JSON.stringify(arr);
  }

  public async exportAsJsonFile(fileName?: string): Promise<string | Error> {
    if (this.downloadJsonFile) {
      const json = await this.exportAsJson();
      const fName = fileName ?? `${this.storeName}_${md5hex(json)}.json`;
      this.downloadJsonFile(fName, json);
      return fName;
    } else {
      return new Error('Faild exportAsJsonFile: Export function is not set');
    }
  }

  public async getLatestBackupKey() {
    const backup = await this.getAllBackup();
    if (backup.length === 0) return '';

    backup.sort((a, b) => {
      // ISO 8601
      const a_storedAt = new Date(a.storedAt);
      const b_storedAt = new Date(b.storedAt);
      return b_storedAt.valueOf() - a_storedAt.valueOf();
    });

    // latest
    return backup[0].key;
  }

  public async getAllBackup() {
    return await this.backupStore.getItems();
  }

  public async getBackup(key: string) {
    return await this.backupStore.getItem(key);
  }
}
