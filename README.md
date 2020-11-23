# UserDataStore

Easily store user data and back up them.

Features:

- Set Item
- Get Item
- Export user data as json
- Import json
- Back up
- Restore

## Usage

```
yarn add git+https://github.com/srymh/user-data-store
```

Select Store library and its driver.
By default, supports [localForage](https://github.com/localForage/localForage) and [electron-store](https://github.com/sindresorhus/electron-store)@5.2.0.
### 1. Store Your Data by Using [localForage](https://github.com/localForage/localForage)

You need install localforage manually.

``` sh
yarn add localforage
```

``` ts
import { UserDataStore } from "user-data-store";
// This driver supports only IndexedDB.
import { LocalForageDriver } from "user-data-store/dist-esm/drivers/LocalForageDriver";

// Example
type Student = {
  name: string;
};

const userDataStore = new UserDataStore<Student>({
  driver: LocalForageDriver,
  name: "School", // IndexedDB: Database name
  storeName: "Student" // IndexedDB: Table name
});

const student: Student = {
  name: "Szuki Taro"
};

userDataStore.setItem(student);
// A database is created with the name "School"
// A table is created with the name "Student" in the School database.
```

### 2. Store Your Data by Using [electron-store](https://github.com/sindresorhus/electron-store)

You need install electron-store(version 5.2.0) manually.

``` sh
yarn add electron-store@5.2.0
```

``` ts
import { UserDataStore } from "user-data-store";
import { ElectronStoreDriver } from "user-data-store/dist-esm/drivers/ElectronStoreDriver";


// Example
type Student = {
  name: string;
};

const userDataStore = new UserDataStore<Student>({
  driver: ElectronStoreDriver,
  name: "School",
  storeName: "Student"
});

const student: Student = {
  name: "Szuki Taro"
};

userDataStore.setItem(student);
// A json file named "School_Student.json" is saved.
```

### 3. Custom Store Driver

Custom driver class should implements `StoreDriver`.

