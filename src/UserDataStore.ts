import md5 from 'md5';
import {provideKey} from './utils/provideKey';
import {downloadJsonFileAsync} from './utils/downloadJsonFile';
import {
  DataContainer,
  IsDataContainer,
  BackupData,
  DownloadJsonFile,
  ProvideKey,
} from './Types';
import {
  StoreDriver,
  StoreDriverConstructor,
  StoreDriverBaseOptions,
} from './StoreDriver';

export type UserDataStoreOptions<T, U = {}> = {
  driver: StoreDriverConstructor;
  driverOptions?: U;
  downloadJsonFile?: DownloadJsonFile;
  confirmType?: (arg: any) => arg is T;
  provideKey?: ProvideKey<T>;
} & StoreDriverBaseOptions;

export class UserDataStore<T, U = {}> {
  private store: StoreDriver<DataContainer<T>>;
  private backupStore: StoreDriver<BackupData>;
  private _name: string;
  private storeName: string;
  private downloadJsonFile: DownloadJsonFile | null;
  private confirmType: ((arg: any) => arg is T) | null;
  private provideKey: ProvideKey<T>;
  private _onSetItem:
    | ((key: string, result: DataContainer<T> | Error) => void)
    | null = null;
  private _onGetItem:
    | ((key: string, result: DataContainer<T> | null) => void)
    | null = null;
  private _onGetItems: ((result: DataContainer<T>[]) => void) | null = null;
  private _onRemoveItem: ((key: string) => void) | null = null;
  private _onClear: (() => void) | null = null;
  private _onImportJson: ((result: [string, Error?]) => void) | null = null;
  private _onExportJson: ((result: string) => void) | null = null;

  constructor(options: UserDataStoreOptions<T, U>) {
    this._name = options.name;
    this.storeName = options.storeName;
    this.downloadJsonFile = options.downloadJsonFile ?? downloadJsonFileAsync;
    this.confirmType = options.confirmType ?? null;
    this.provideKey = options.provideKey ?? provideKey;
    this.store = new options.driver<DataContainer<T>>({
      ...options.driverOptions,
      ...{
        name: options.name,
        storeName: options.storeName,
      },
    });
    this.backupStore = new options.driver<BackupData>({
      ...options.driverOptions,
      ...{
        name: options.name,
        storeName: options.storeName + '_bak',
      },
    });
  }

  public get name(): string {
    return this._name;
  }

  public set onSetItem(
    handler: ((key: string, result: DataContainer<T> | Error) => void) | null
  ) {
    this._onSetItem = handler;
  }

  public set onGetItem(
    handler: ((key: string, result: DataContainer<T> | null) => void) | null
  ) {
    this._onGetItem = handler;
  }

  public set onGetItems(
    handler: ((result: DataContainer<T>[]) => void) | null
  ) {
    this._onGetItems = handler;
  }

  public set onRemoveItem(handler: ((key: string) => void) | null) {
    this._onRemoveItem = handler;
  }

  public set onClear(handler: (() => void) | null) {
    this._onClear = handler;
  }

  public set onImportJson(
    handler: ((result: [string, Error?]) => void) | null
  ) {
    this._onImportJson = handler;
  }

  public set onExportJson(handler: ((result: string) => void) | null) {
    this._onExportJson = handler;
  }

  private async setItemCore(
    value: DataContainer<T>
  ): Promise<DataContainer<T> | Error> {
    if (this.confirmType) {
      if (this.confirmType(value.data)) {
        return await this.store.setItem(value.key, value);
      } else {
        return new Error(`Failed setItemCore: typeof value is wrong`);
      }
    } else {
      return await this.store.setItem(value.key, value);
    }
  }

  public async setItem(
    value: T,
    key?: string
  ): Promise<DataContainer<T> | Error> {
    const realKey = key ?? this.provideKey(value);
    const data: DataContainer<T> = {
      key: realKey,
      storedAt: this.getTimestamp(),
      data: value,
    };
    const result = await this.setItemCore(data);
    if (this._onSetItem) {
      this._onSetItem(realKey, result);
    }
    return result;
  }

  public async getItem(key: string): Promise<DataContainer<T> | null> {
    const result = await this.store.getItem(key);
    if (this._onGetItem) {
      this._onGetItem(key, result);
    }
    return result;
  }

  public async getItems(): Promise<DataContainer<T>[]> {
    const result = await this.store.getItems();
    if (this._onGetItems) {
      this._onGetItems(result);
    }
    return result;
  }

  public async removeItem(key: string): Promise<void> {
    await this.store.removeItem(key);
    if (this._onRemoveItem) {
      this._onRemoveItem(key);
    }
  }

  public async clear(): Promise<void> {
    await this.store.clear();
    if (this._onClear) {
      this._onClear();
    }
  }

  public async backup(json: string): Promise<string> {
    const backupKey = md5(json);
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
            `Failed restore: Unexpected Error. Backup data are broken.\n${error.message}`
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
   * @param json Data to import (expected that is exported by `this.exportJson`)
   * @returns Key to restore before importing json. And if error, also return `Error`.
   */
  public async importJson(json: string): Promise<[string, Error?]> {
    let result: [string, Error?];
    const backupJson = await this.exportJson();
    const backupKey = await this.backup(backupJson);

    await this.clear();

    try {
      // var の使いどころ
      var parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) {
        result = [backupKey, new Error('Failed importByJson: Invalid JSON')];
      } else {
        result = [backupKey];

        for (const item of parsed) {
          if (IsDataContainer(item)) {
            const maybeError = await this.setItemCore(item as DataContainer<T>); // type is checked in `setItemCore`
            if (maybeError instanceof Error) {
              // Shoud I rollback?
              result = [
                backupKey,
                new Error(`Failed importByJson: ${maybeError.message}`),
              ];
              break;
            }
          } else {
            result = [
              backupKey,
              new Error(`Failed importByJson: Invalid data format`),
            ];
            break;
          }
        }
      }
    } catch (error) {
      result = [backupKey, new Error(`Failed importByJson: ${error.message}`)];
    }

    if (this._onImportJson) {
      this._onImportJson(result);
    }

    return result;
  }

  public async exportJson() {
    const arr: DataContainer<T>[] = await this.getItems();
    const json = JSON.stringify(arr);
    if (this._onExportJson) {
      this._onExportJson(json);
    }
    return json;
  }

  public async exportJsonFile(fileName?: string): Promise<string | Error> {
    if (this.downloadJsonFile) {
      const json = await this.exportJson();
      const fName = fileName ?? `${this.storeName}_${md5(json)}.json`;
      const result = await this.downloadJsonFile(fName, json);
      if (result instanceof Error) {
        return result;
      } else {
        return fName;
      }
    } else {
      return new Error('Faild exportJsonFile: Export function is not set');
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

  private getTimestamp() {
    return new Date(Date.now()).toISOString();
  }
}
