import {md5hex} from './md5hex';
export const provideKey = <T>(v: T): string => {
  return md5hex(JSON.stringify(v));
};
