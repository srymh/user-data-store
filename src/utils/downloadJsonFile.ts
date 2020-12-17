export const downloadJsonFile = (fileName: string, json: string) => {
  const a = document.createElement('a');
  const href =
    'data:application/json;charset=utf-8,' + encodeURIComponent(json);
  a.setAttribute('href', href);
  a.setAttribute('download', fileName);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const downloadJsonFileAsync = (
  fileName: string,
  json: string
): Promise<Error | void> => {
  return new Promise((resolve) => {
    try {
      const a = document.createElement('a');
      const href =
        'data:application/json;charset=utf-8,' + encodeURIComponent(json);
      a.setAttribute('href', href);
      a.setAttribute('download', fileName);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      resolve();
    } catch (error) {
      resolve(new Error(error));
    }
  });
};
