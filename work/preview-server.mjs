import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../mazlicek.html", import.meta.url));
const czechPage = await readFile(new URL("../cestina.html", import.meta.url));
const petRewards = await readFile(new URL("../scripts/pet-rewards.js", import.meta.url));
const pages = new Map([
  ["/mazlicek.html", { content: page, type: "text/html; charset=utf-8" }],
  ["/cestina.html", { content: czechPage, type: "text/html; charset=utf-8" }],
  ["/scripts/pet-rewards.js", { content: petRewards, type: "text/javascript; charset=utf-8" }]
]);
createServer((request, response) => {
  const resource = pages.get(new URL(request.url, "http://localhost").pathname);
  if (!resource) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": resource.type,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(resource.content);
}).listen(4173, "127.0.0.1", () => {
  console.log("Local pet preview: http://localhost:4173/mazlicek.html");
});
