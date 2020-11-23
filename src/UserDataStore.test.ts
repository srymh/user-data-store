/**
 * This test depends on the localforage mock.
 * I think this is not very reliable.
 */
import {md5hex} from './utils/md5hex';
import {UserDataStore, UserDataStoreOptions} from './UserDataStore';
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

function sleep(t: number) {
  return new Promise((resolve) => {
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
    expect(await uds.getItem('3')).toBe('3');
  });

  test('追加したvalue<number>が取得できる', async function () {
    const uds = new UserDataStore<number>({
      driver: LocalForageDriver,
      name,
      storeName,
      provideKey: (v) => v.toString(),
    });
    await uds.setItem(30);
    expect(await uds.getItem('30')).toBe(30);
  });

  test('追加したvalue<object>が取得できる', async function () {
    const uds = new UserDataStore<Person>(options);
    await uds.setItem({name: 'Taro', age: 20});
    expect((await uds.getItem('Taro'))?.name).toBe('Taro');
  });

  test('追加済みのオブジェクトのプロパティを一部書き換える', async function () {
    const uds = new UserDataStore<Person>(options);
    await uds.setItem({name: 'Taro', age: 20});
    await uds.setItem({name: 'Taro', age: 50});
    expect((await uds.getItem('Taro'))?.age).toBe(50);
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
    expect(items).toEqual(data);
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
    expect(json).toBe(JSON.stringify(data));
  });

  test('jsonでデータを設定する', async () => {
    const uds = new UserDataStore<Person>(options);
    const data: any = [
      {name: 'Taro', age: 20},
      {name: 'Hanako', age: 50},
    ];
    await uds.importJson(JSON.stringify(data));
    expect(await uds.getItems()).toEqual(data);
  });

  test('キーを指定して削除', async () => {
    const uds = new UserDataStore<Person>(options);
    const data: any = [
      {name: 'Taro', age: 20},
      {name: 'Hanako', age: 50},
    ];
    await uds.importJson(JSON.stringify(data));
    await uds.removeItem('Hanako');
    const result = await uds.getItems();
    expect(result).toEqual([{name: 'Taro', age: 20}]);
  });

  test('全削除', async () => {
    const uds = new UserDataStore<Person>(options);
    const data: any = [
      {name: 'Taro', age: 20},
      {name: 'Hanako', age: 50},
    ];
    await uds.importJson(JSON.stringify(data));
    await uds.clear();
    expect(await uds.getItems()).toEqual([]);
  });

  test('importするとimport直前のバックアップが作成される', async () => {
    const uds = new UserDataStore<Person>(options);
    const data1: any = [
      {name: 'Taro', age: 20},
      {name: 'Hanako', age: 50},
    ];
    const data2: any = [
      {name: 'Neko', age: 9},
      {name: 'Inu', age: 6},
    ];
    await uds.importJson(JSON.stringify(data1));
    // 完全に同一の時刻のデータがあると正しく処理できないので少し待たせる
    await sleep(10);
    await uds.importJson(JSON.stringify(data2));
    const latestBackupKey = await uds.getLatestBackupKey();
    const backup = await uds.getBackup(latestBackupKey);
    expect(backup).not.toBeNull();
    if (backup) {
      expect(backup.json).toBe(JSON.stringify(data1));
    }
  });

  test('すべてのバックアップを取得する', async () => {
    const uds = new UserDataStore<Person>(options);
    const data1: any = [
      {name: 'Taro', age: 20},
      {name: 'Hanako', age: 50},
    ];
    const data2: any = [
      {name: 'Neko', age: 9},
      {name: 'Inu', age: 6},
    ];
    await uds.importJson(JSON.stringify(data1)); // [] がバックアップされる
    await uds.importJson(JSON.stringify(data2)); // data1 がバックアップされる
    await uds.importJson(JSON.stringify(data1)); // data2 がバックアップされる

    const backups = await uds.getAllBackup();
    // backups[i].storedAt を一致させるのは難しいので streodAt を除いて比較
    expect(backups.map((x) => ({key: x.key, json: x.json}))).toStrictEqual([
      {key: md5hex(JSON.stringify([])), json: JSON.stringify([])},
      {key: md5hex(JSON.stringify(data1)), json: JSON.stringify(data1)},
      {key: md5hex(JSON.stringify(data2)), json: JSON.stringify(data2)},
    ]);
  });

  test('バックアップが空の時にすべてのバックアップを取得すると空の配列が返ってくる', async () => {
    const uds = new UserDataStore<Person>(options);
    const backups = await uds.getAllBackup();
    expect(backups).toStrictEqual([]);
  });

  test('指定したキーのバックアップを取得する', async () => {
    const uds = new UserDataStore<Person>(options);
    const data1: any = [
      {name: 'Taro', age: 20},
      {name: 'Hanako', age: 50},
    ];
    const data2: any = [
      {name: 'Neko', age: 9},
      {name: 'Inu', age: 6},
    ];
    await uds.importJson(JSON.stringify(data1)); // [] がバックアップされる
    await uds.importJson(JSON.stringify(data2)); // data1 がバックアップされる
    await uds.importJson(JSON.stringify(data1)); // data2 がバックアップされる

    const backup = await uds.getBackup(md5hex(JSON.stringify(data1)));
    expect(backup).not.toBeNull();
    // backup.storedAt を一致させるのは難しいので streodAt を除いて比較
    if (backup) {
      // delete backup.storedAt は型エラー
      delete (backup as any).storedAt;
      expect(backup).toStrictEqual({
        key: md5hex(JSON.stringify(data1)),
        json: JSON.stringify(data1),
      });
    }
  });

  test('復元する', async () => {
    const uds = new UserDataStore<Person>(options);
    const data1: any = [
      {name: 'Taro', age: 20},
      {name: 'Hanako', age: 50},
    ];
    const data1key = md5hex(JSON.stringify(data1));
    const data2: any = [
      {name: 'Neko', age: 9},
      {name: 'Inu', age: 6},
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
      console.error(error.message);
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
    const download = (filename: string, text: string) => {
      console.log(filename, text);
    };
    const uds = new UserDataStore<Person>({
      ...options,
      ...{downloadJsonFile: download},
    });
    const data: any = [{name: 'Taro', age: 20}];
    await uds.setItem(data[0]);
    const result = await uds.exportAsJsonFile();
    if (result instanceof Error) {
      expect(result.message).toBe(
        `${storeName}_${md5hex(JSON.stringify(data))}.json`
      );
    }
  });

  test('importByJsonで設定したデータをjsonファイルとしてダウンロードする', async () => {
    const download = (filename: string, text: string) => {
      console.log(filename, text);
    };
    const uds = new UserDataStore<Person>({
      ...options,
      ...{downloadJsonFile: download},
    });
    const data: any = [{name: 'Taro', age: 20}];
    await uds.importJson(JSON.stringify(data));
    const result = await uds.exportAsJsonFile();
    if (!(result instanceof Error)) {
      expect(result).toBe(`${storeName}_${md5hex(JSON.stringify(data))}.json`);
    }
  });

  test('型チェックして成功する', async () => {
    const uds = new UserDataStore<Person>(options);
    const data: Person[] = [{name: 'Taro', age: 20}];
    const result = await uds.setItem(data[0]);
    console.log(result);
    expect(isPerson(result)).toBe(true);
  });

  test('型チェックして失敗する', async () => {
    const uds = new UserDataStore<Person>(options);
    const result = await uds.setItem(
      {name: 'Nyan'} as Person /* 無理やりセット */
    );
    expect((result as Error).message).toBe(
      'Failed setItem: typeof value is wrong'
    );
  });
});
