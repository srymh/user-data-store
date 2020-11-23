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
