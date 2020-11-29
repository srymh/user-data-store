import md5 from 'md5';
export const provideKey = <T>(v: T): string => {
  return md5(JSON.stringify(v));
};
