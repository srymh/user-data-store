import {createHash} from 'crypto';
// ブラウザで利用するときに `crypto` のサイズが大きい。
// https://www.mixmax.com/engineering/requiring-node-builtins-with-webpack/
// md5だけの軽量な関数を代わりに使ったほうがいい。
// http://www.myersdaily.org/joseph/javascript/md5-text.html
export const md5hex = (str: string) =>
  createHash('md5').update(str, 'utf8').digest('hex');
