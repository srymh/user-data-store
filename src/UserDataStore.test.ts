/**
 * This test depends on the localforage mock.
 * I think this is not very reliable.
 */
import md5 from 'md5';
import {UserDataStore, UserDataStoreOptions} from './UserDataStore';
import {DataContainer, IsDataContainer} from './Types';
import {LocalForageDriver} from './drivers/LocalForageDriver';

type Person = {
  name: string;
  age: number;
};

const name = 'hoge';
const storeName = 'foo';
const provideKey = (v: Person) => v.name;
const options: UserDataStoreOptions<Person> = {
  driver: LocalForageDriver,
  name: name,
  storeName: storeName,
  confirmType: isPerson,
  provideKey: provideKey,
};

function getTimestamp() {
  return new Date(Date.now()).toISOString();
}

function sleep(t: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, t);
  });
}

function isPerson(arg: any): arg is Person {
  if (
    arg.hasOwnProperty('name') &&
    typeof arg['name'] === 'string' &&
    arg.hasOwnProperty('age') &&
    typeof arg['age'] === 'number'
  ) {
    return true;
  }
  return false;
}

describe('UserDataStore class', function () {
  test('追加したvalue<string>が取得できる', async function () {
    const uds = new UserDataStore<string>({
      driver: LocalForageDriver,
      name,
      storeName,
      provideKey: (v) => v,
    });
    await uds.setItem('3');
    expect((await uds.getItem('3'))?.data).toBe('3');
  });

  test('追加したvalue<number>が取得できる', async function () {
    const uds = new UserDataStore<number>({
      driver: LocalForageDriver,
      name,
      storeName,
      provideKey: (v) => v.toString(),
    });
    await uds.setItem(30);
    expect((await uds.getItem('30'))?.data).toBe(30);
  });

  test('追加したvalue<object>が取得できる', async function () {
    const uds = new UserDataStore<Person>(options);
    await uds.setItem({name: 'Taro', age: 20});
    expect((await uds.getItem('Taro'))?.data.name).toBe('Taro');
  });

  test('追加済みのオブジェクトのプロパティを一部書き換える', async function () {
    const uds = new UserDataStore<Person>(options);
    const item = await uds.setItem({name: 'Taro', age: 20});
    if (!(item instanceof Error)) {
      await uds.setItem({name: 'Taro', age: 50}, item.key);
      expect((await uds.getItem('Taro'))?.data.age).toBe(50);
    } else {
      throw new Error();
    }
  });

  test('全データを取得する', async () => {
    const uds = new UserDataStore<Person>(options);
    const data: any = [
      {name: 'Taro', age: 20},
      {name: 'Hanako', age: 50},
    ];
    await uds.setItem(data[0]);
    await uds.setItem(data[1]);
    const items = (await uds.getItems()) ?? [];
    expect(items?.map((x) => x.data)).toEqual(data);
  });

  test('全データをjsonで受け取る', async () => {
    const uds = new UserDataStore<Person>(options);
    const data: any = [
      {name: 'Taro', age: 20},
      {name: 'Hanako', age: 50},
    ];
    await uds.setItem(data[0]);
    await uds.setItem(data[1]);
    const json = await uds.exportAsJson();
    expect(JSON.parse(json).map((x: any) => x.data)).toEqual(data);
  });

  test('jsonでデータを設定する', async () => {
    const uds = new UserDataStore<Person>(options);
    const data: DataContainer<Person>[] = [
      {key: 'Taro', storedAt: getTimestamp(), data: {name: 'Taro', age: 20}},
      {
        key: 'Hanako',
        storedAt: getTimestamp(),
        data: {name: 'Hanako', age: 50},
      },
    ];
    const [, error] = await uds.importJson(JSON.stringify(data));
    if (error) {
      throw new Error(error.message);
    } else {
      expect((await uds.getItems()).map((x) => x.data)).toEqual(
        data.map((x) => x.data)
      );
    }
  });

  test('キーを指定して削除', async () => {
    const uds = new UserDataStore<Person>(options);
    const data: DataContainer<Person>[] = [
      {key: 'Taro', storedAt: getTimestamp(), data: {name: 'Taro', age: 20}},
      {
        key: 'Hanako',
        storedAt: getTimestamp(),
        data: {name: 'Hanako', age: 50},
      },
    ];
    const [, error] = await uds.importJson(JSON.stringify(data));
    if (error) {
      throw new Error(error.message);
    } else {
      await uds.removeItem('Hanako');
      const result = await uds.getItems();
      expect(result.map((x) => x.data)).toEqual([{name: 'Taro', age: 20}]);
    }
  });

  test('全削除', async () => {
    const uds = new UserDataStore<Person>(options);
    const data: DataContainer<Person>[] = [
      {key: 'Taro', storedAt: getTimestamp(), data: {name: 'Taro', age: 20}},
      {
        key: 'Hanako',
        storedAt: getTimestamp(),
        data: {name: 'Hanako', age: 50},
      },
    ];
    const [, error] = await uds.importJson(JSON.stringify(data));
    if (error) {
      throw new Error(error.message);
    } else {
      await uds.clear();
      expect(await uds.getItems()).toEqual([]);
    }
  });

  test('importするとimport直前のバックアップが作成される', async () => {
    const uds = new UserDataStore<Person>(options);
    const data1: DataContainer<Person>[] = [
      {key: 'Taro', storedAt: getTimestamp(), data: {name: 'Taro', age: 20}},
      {
        key: 'Hanako',
        storedAt: getTimestamp(),
        data: {name: 'Hanako', age: 50},
      },
    ];
    const data2: DataContainer<Person>[] = [
      {key: 'Taro', storedAt: getTimestamp(), data: {name: 'Taro', age: 25}},
      {
        key: 'Hanako',
        storedAt: getTimestamp(),
        data: {name: 'Hanako', age: 55},
      },
    ];
    const [, error] = await uds.importJson(JSON.stringify(data1));
    if (error) {
      throw new Error(error.message);
    }
    // 完全に同一の時刻のデータがあると正しく処理できないので少し待たせる
    await sleep(10);
    const [, error2] = await uds.importJson(JSON.stringify(data2));
    if (error2) {
      throw new Error(error2.message);
    }
    const latestBackupKey = await uds.getLatestBackupKey();
    const backup = await uds.getBackup(latestBackupKey);
    expect(backup).not.toBeNull();
    if (backup) {
      expect(JSON.parse(backup.json).map((x: any) => x.data)).toEqual(
        data1.map((x) => x.data)
      );
    }
  });

  test('すべてのバックアップを取得する', async () => {
    const uds = new UserDataStore<Person>(options);
    const data1: DataContainer<Person>[] = [
      {key: 'Taro', storedAt: getTimestamp(), data: {name: 'Taro', age: 20}},
      {
        key: 'Hanako',
        storedAt: getTimestamp(),
        data: {name: 'Hanako', age: 50},
      },
    ];
    const data2: DataContainer<Person>[] = [
      {key: 'Taro', storedAt: getTimestamp(), data: {name: 'Taro', age: 25}},
      {
        key: 'Hanako',
        storedAt: getTimestamp(),
        data: {name: 'Hanako', age: 55},
      },
    ];
    await uds.importJson(JSON.stringify(data1)); // [] がバックアップされる
    await uds.importJson(JSON.stringify(data2)); // data1 がバックアップされる
    await uds.importJson(JSON.stringify(data1)); // data2 がバックアップされる

    const backups = (await uds.getAllBackup()).map((x) =>
      JSON.parse(x.json).map((y: any) => y.data)
    );
    expect(backups).toStrictEqual([
      [],
      data1.map((x) => x.data),
      data2.map((x) => x.data),
    ]);
  });

  test('バックアップが空の時にすべてのバックアップを取得すると空の配列が返ってくる', async () => {
    const uds = new UserDataStore<Person>(options);
    const backups = await uds.getAllBackup();
    expect(backups).toStrictEqual([]);
  });

  test('指定したキーのバックアップを取得する', async () => {
    const uds = new UserDataStore<Person>(options);
    const data1: DataContainer<Person>[] = [
      {key: 'Taro', storedAt: getTimestamp(), data: {name: 'Taro', age: 20}},
      {
        key: 'Hanako',
        storedAt: getTimestamp(),
        data: {name: 'Hanako', age: 50},
      },
    ];
    const data2: DataContainer<Person>[] = [
      {key: 'Taro', storedAt: getTimestamp(), data: {name: 'Taro', age: 25}},
      {
        key: 'Hanako',
        storedAt: getTimestamp(),
        data: {name: 'Hanako', age: 55},
      },
    ];
    await uds.importJson(JSON.stringify(data1)); // [] がバックアップされる
    const [key] = await uds.importJson(JSON.stringify(data2)); // data1 がバックアップされる
    await uds.importJson(JSON.stringify(data1)); // data2 がバックアップされる

    const backup = await uds.getBackup(key);
    expect(backup).not.toBeNull();
    if (backup) {
      expect(JSON.parse(backup.json).map((x: any) => x.data)).toStrictEqual(
        data1.map((x) => x.data)
      );
    }
  });

  test('復元する', async () => {
    const uds = new UserDataStore<Person>(options);
    const data1: DataContainer<Person>[] = [
      {key: 'Taro', storedAt: getTimestamp(), data: {name: 'Taro', age: 20}},
      {
        key: 'Hanako',
        storedAt: getTimestamp(),
        data: {name: 'Hanako', age: 50},
      },
    ];
    const data1key = md5(JSON.stringify(data1));
    const data2: DataContainer<Person>[] = [
      {key: 'Taro', storedAt: getTimestamp(), data: {name: 'Taro', age: 25}},
      {
        key: 'Hanako',
        storedAt: getTimestamp(),
        data: {name: 'Hanako', age: 55},
      },
    ];
    await uds.importJson(JSON.stringify(data1)); // [] がバックアップされる
    await sleep(10);
    await uds.importJson(JSON.stringify(data2)); // data1 がバックアップされる
    await sleep(10);
    await uds.importJson(JSON.stringify(data1)); // data2 がバックアップされる
    await sleep(10);
    const latestBackupKey = await uds.getLatestBackupKey();
    const [restoreKey, error] = await uds.restore(latestBackupKey);
    if (error) {
      throw new Error(error.message);
    } else {
      expect(restoreKey).toBe(data1key);
      const expectData2 = await uds.getItems();
      expect(expectData2).toEqual(data2);
    }
  });

  test('出鱈目なキーで復元しようとすると失敗する', async () => {
    const uds = new UserDataStore<Person>(options);
    expect(async () => {
      await expect(uds.restore('agaga')).rejects.toThrowError();
    });
  });

  test('バックアップが空の時に最新のバックアップキーを取得すると空文字が返ってくる', async () => {
    const uds = new UserDataStore<Person>(options);
    const key = await uds.getLatestBackupKey();
    expect(key).toBe('');
  });

  test('setItemで設定したデータをjsonファイルとしてダウンロードする', async () => {
    const download = (
      _filename: string,
      _text: string
    ): Promise<Error | void> => {
      return new Promise((resove) => {
        resove();
      });
    };
    const uds = new UserDataStore<Person>({
      ...options,
      ...{downloadJsonFile: download},
    });
    const data: Person[] = [{name: 'Taro', age: 20}];
    await uds.setItem(data[0]);
    const result = await uds.exportAsJsonFile();
    if (result instanceof Error) {
      expect(result.message).toBe(
        `${storeName}_${md5(JSON.stringify(data))}.json`
      );
    }
  });

  test('importJsonで設定したデータをjsonファイルとしてダウンロードする', async () => {
    let filename_: string = '';
    const download = (
      filename: string,
      _text: string
    ): Promise<Error | void> => {
      return new Promise((resove) => {
        filename_ = filename;
        resove();
      });
    };
    const uds = new UserDataStore<Person>({
      ...options,
      ...{downloadJsonFile: download},
    });
    const data: any = [{name: 'Taro', age: 20}];
    await uds.importJson(JSON.stringify(data));
    const result = await uds.exportAsJsonFile();
    if (!(result instanceof Error)) {
      expect(result).toBe(filename_);
    }
  });

  test('型チェックして成功する', async () => {
    const uds = new UserDataStore<Person>(options);
    const data: Person[] = [{name: 'Taro', age: 20}];
    const result = await uds.setItem(data[0]);
    if (!(result instanceof Error)) {
      // console.log(result);
      expect(isPerson(result?.data)).toBe(true);
    }
  });

  test('型チェックして失敗する', async () => {
    const uds = new UserDataStore<Person>(options);
    const result = await uds.setItem(
      {name: 'Nyan'} as Person /* 無理やりセット */
    );
    expect((result as Error).message).toBe(
      'Failed setItemCore: typeof value is wrong'
    );
  });

  describe('onXXX', () => {
    const person: Person = {
      name: 'Alpha',
      age: 100,
    };
    let uds: UserDataStore<Person>;
    beforeEach(() => {
      uds = new UserDataStore<Person>({
        driver: LocalForageDriver,
        name: 'X',
        storeName: 'Y',
        provideKey: (x) => x.name,
      });
    });

    test('onSetItem', async () => {
      uds.onSetItem = (key, result) => {
        expect(key).toBe(person.name);
        if (!(result instanceof Error)) {
          expect(result.data).toEqual(person);
        } else {
          throw result;
        }
      };

      await uds.setItem(person);
    });

    test('onGetItem', async () => {
      await uds.setItem(person);

      uds.onGetItem = (key, result) => {
        expect(key).toBe(person.name);
        if (result instanceof Error) {
          throw result;
        } else if (result) {
          expect(result.data).toEqual(person);
        } else {
          throw new Error();
        }
      };

      await uds.getItem(person.name);
    });

    test('onGetItems', async () => {
      await uds.setItem(person);
      const anotherKey = 'Apple';
      await uds.setItem(person, anotherKey);

      uds.onGetItems = (result) => {
        expect(result[0].key).toEqual(person.name);
        expect(result[0].data).toEqual(person);
        expect(result[1].key).toEqual(anotherKey);
        expect(result[1].data).toEqual(person);
      };

      await uds.getItems();
    });

    test('onRemoveItem', async () => {
      await uds.setItem(person);
      const anotherKey = 'Apple';
      await uds.setItem(person, anotherKey);

      uds.onRemoveItem = (key) => {
        expect(key).toEqual(anotherKey);
      };

      await uds.removeItem(anotherKey);
    });

    test('onClear', async () => {
      const obj = {
        value: 30,
      };
      const newObjValue = 50;
      await uds.setItem(person);
      uds.onClear = () => {
        obj.value = newObjValue;
      };
      await uds.clear();
      expect(obj.value).toBe(newObjValue);
    });

    test('onImportJson', async () => {
      uds.onImportJson = (result) => {
        const [backupKey, error] = result;
        expect(backupKey).toBe('d751713988987e9331980363e24189ce');
        expect(error).toBeUndefined();
      };

      const data: DataContainer<Person>[] = [
        {
          key: person.name,
          storedAt: new Date(Date.now()).toISOString(),
          data: person,
        },
      ];
      await uds.importJson(JSON.stringify(data));
    });

    test('onExportJson', async () => {
      uds.onExportJson = (result) => {
        expect(result).toBe(JSON.stringify([]));
      };
      await uds.exportAsJson();
    });
  });
});

describe('IsData', () => {
  test('適合しない色々な型の変数を入れるとfalseを返す', () => {
    expect(IsDataContainer({})).toBe(false);
    expect(IsDataContainer('')).toBe(false);
    expect(IsDataContainer(0)).toBe(false);
    expect(IsDataContainer(true)).toBe(false);
    expect(IsDataContainer(null)).toBe(false);
    expect(IsDataContainer(undefined)).toBe(false);
    expect(IsDataContainer(() => {})).toBe(false);
  });
  test('正しい型を入れるとtrueを返す', () => {
    const data: DataContainer<number> = {
      key: 'Taro',
      storedAt: getTimestamp(),
      data: 0,
    };
    expect(IsDataContainer(data)).toBe(true);
  });
  test('正しい型を入れるとtrueを返す2', () => {
    const data: any = {
      key: 'Taro',
      storedAt: getTimestamp(),
      data: 0,
    };
    if (IsDataContainer(data)) {
      const data_ = data.data;
      if (typeof data_ === 'number') {
        expect(data_.toFixed(3)).toBe('0.000');
      } else {
        throw new Error('');
      }
    } else {
      throw new Error('');
    }
  });
  test('微妙に違う型を入れるとfalseを返す', () => {
    const data: any = {
      key: 'Taro',
      storedAt: getTimestamp(),
    };
    expect(IsDataContainer(data)).toBe(false);
  });
});
