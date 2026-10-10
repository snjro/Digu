// For the tests of the scripts: a fake JSON-RPC server on localhost.
// answer(request, send, res) answers each request, whose body it is given
// parsed. send(status, value, headers) answers with the JSON-RPC response
// { jsonrpc, id, ...value }.
import http from "node:http";

export async function startFakeRpc(answer) {
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (data) => (body += data));
    req.on("end", () => {
      const request = JSON.parse(body);
      const send = (status, value, headers = {}) => {
        res.writeHead(status, {
          "content-type": "application/json",
          ...headers,
        });
        res.end(JSON.stringify({ jsonrpc: "2.0", id: request.id, ...value }));
      };
      answer(request, send, res);
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => server.close(),
  };
}
