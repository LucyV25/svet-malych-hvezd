import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../mazlicek.html", import.meta.url));
createServer((request, response) => {
  if (request.url !== "/mazlicek.html") {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(page);
}).listen(4173, "127.0.0.1", () => {
  console.log("Local pet preview: http://localhost:4173/mazlicek.html");
});
