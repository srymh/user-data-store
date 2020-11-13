import { echo } from "./index";

test('echo', ()=>{
  const message = "hello";
  const response = echo(message);

  expect(response).toBe(message);
});
