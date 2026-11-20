import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";

const port = Number(process.env.PORT || 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError("PORT must be a valid TCP port number.");
}
const storyPage = await readFile(new URL("../index.html", import.meta.url));
const homePage = await readFile(new URL("../rozcestnik.html", import.meta.url));
const exercisesPage = await readFile(new URL("../cviceni.html", import.meta.url));
const mathematicsPage = await readFile(new URL("../matematika.html", import.meta.url));
const czechPage = await readFile(new URL("../cestina.html", import.meta.url));
const englishPage = await readFile(new URL("../anglictina.html", import.meta.url));
const minecraftPage = await readFile(new URL("../minecraft.html", import.meta.url));
const adventPage = await readFile(new URL("../advent.html", import.meta.url));
const customLearningPage = await readFile(new URL("../moje-ucivo.html", import.meta.url));
const readingPage = await readFile(new URL("../cteni.html", import.meta.url));
const petPage = await readFile(new URL("../mazlicek.html", import.meta.url));
const petRewardsScript = await readFile(new URL("./pet-rewards.js", import.meta.url));
const handwritingFont = await readFile(new URL("../assets/fonts/Borel-Regular.ttf", import.meta.url));
const pages = new Map([
    ["/", storyPage],
    ["/index.html", storyPage],
    ["/rozcestnik.html", homePage],
    ["/cviceni.html", exercisesPage],
    ["/matematika.html", mathematicsPage],
    ["/cestina.html", czechPage],
    ["/anglictina.html", englishPage],
    ["/minecraft.html", minecraftPage],
    ["/advent.html", adventPage],
    ["/moje-ucivo.html", customLearningPage],
    ["/cteni.html", readingPage],
    ["/mazlicek.html", petPage]
]);
const assets = new Map([
    ["/assets/fonts/Borel-Regular.ttf", { content: handwritingFont, contentType: "font/ttf" }],
    ["/scripts/pet-rewards.js", { content: petRewardsScript, contentType: "text/javascript; charset=utf-8" }]
]);
const favoritesPath = fileURLToPath(new URL("../data/favorites.json", import.meta.url));
const maxRequestBytes = 1_000_000;
const maxFavorites = 100;
let favoritesWriteQueue = Promise.resolve();

function isFavorite(story) {
    return story
        && typeof story.id === "string"
        && story.id.length <= 100
        && typeof story.title === "string"
        && story.title.length > 0
        && story.title.length <= 160
        && Array.isArray(story.paragraphs)
        && story.paragraphs.length > 0
        && story.paragraphs.length <= 50
        && story.paragraphs.every((paragraph) => typeof paragraph === "string" && paragraph.length <= 5000)
        && typeof story.createdAt === "string"
        && !Number.isNaN(Date.parse(story.createdAt));
}

async function readFavorites() {
    try {
        const content = await readFile(favoritesPath, "utf8");
        const favorites = JSON.parse(content);
        if (!Array.isArray(favorites) || favorites.length > maxFavorites || !favorites.every(isFavorite)) {
            throw new Error("The shared favorites file has an invalid format.");
        }
        return favorites;
    } catch (error) {
        if (error.code === "ENOENT") return [];
        throw error;
    }
}

async function writeFavorites(favorites) {
    await mkdir(dirname(favoritesPath), { recursive: true });
    const temporaryPath = `${favoritesPath}.${randomUUID()}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(favorites, null, 2), "utf8");
    await rename(temporaryPath, favoritesPath);
}

function favoriteKey(favorite) {
    return `${favorite.title}\n${favorite.paragraphs.join("\n")}`;
}

function queueFavoriteUpdate(additions, removeIds) {
    const operation = favoritesWriteQueue.then(async () => {
        const removedIds = new Set(removeIds);
        const favorites = (await readFavorites()).filter((favorite) => !removedIds.has(favorite.id));
        const existing = new Set(favorites.map(favoriteKey));

        for (const favorite of additions) {
            const key = favoriteKey(favorite);
            if (!existing.has(key)) {
                existing.add(key);
                favorites.push(favorite);
            }
        }

        if (favorites.length > maxFavorites) {
            const error = new Error("Too many shared favorites.");
            error.statusCode = 400;
            throw error;
        }

        await writeFavorites(favorites);
        return favorites;
    });

    favoritesWriteQueue = operation.then(() => undefined, () => undefined);
    return operation;
}

async function readRequestBody(request) {
    const chunks = [];
    let size = 0;
    let tooLarge = false;

    for await (const chunk of request) {
        size += chunk.length;
        if (size > maxRequestBytes) {
            tooLarge = true;
        } else {
            chunks.push(chunk);
        }
    }

    if (tooLarge) {
        const error = new Error("Request body is too large.");
        error.statusCode = 413;
        throw error;
    }

    return Buffer.concat(chunks).toString("utf8");
}

function sendJson(response, statusCode, value) {
    response.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
    });
    response.end(JSON.stringify(value));
}

const server = createServer(async (request, response) => {
    let pathname;
    try {
        pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    } catch {
        response.writeHead(400);
        response.end("Bad request");
        return;
    }

    if (pathname === "/api/favorites") {
        if (request.method === "GET") {
            try {
                sendJson(response, 200, await readFavorites());
            } catch (error) {
                console.error("Could not read shared favorites.", error);
                sendJson(response, 500, { error: "Could not read shared favorites." });
            }
            return;
        }

        if (request.method === "POST") {
            try {
                if (!request.headers["content-type"]?.startsWith("application/json")) {
                    sendJson(response, 415, { error: "Expected application/json." });
                    return;
                }

                const change = JSON.parse(await readRequestBody(request));
                if (!change
                    || !Array.isArray(change.additions)
                    || change.additions.length > maxFavorites
                    || !change.additions.every(isFavorite)
                    || !Array.isArray(change.removeIds)
                    || change.removeIds.length > maxFavorites
                    || !change.removeIds.every((id) => typeof id === "string" && id.length <= 100)) {
                    sendJson(response, 400, { error: "Invalid favorites change." });
                    return;
                }

                const favorites = await queueFavoriteUpdate(change.additions, change.removeIds);
                sendJson(response, 200, { favorites });
            } catch (error) {
                const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 400;
                console.error("Could not save shared favorites.", error);
                sendJson(response, statusCode, { error: "Could not save shared favorites." });
            }
            return;
        }

        response.writeHead(405, { Allow: "GET, POST" });
        response.end("Method not allowed");
        return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405, { Allow: "GET, HEAD" });
        response.end("Method not allowed");
        return;
    }

    const page = pages.get(pathname);
    const asset = assets.get(pathname);
    if (!page && !asset) {
        response.writeHead(404);
        response.end("Not found");
        return;
    }

    response.writeHead(200, {
        "Content-Type": asset ? asset.contentType : "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
    });
    response.end(request.method === "HEAD" ? undefined : page ?? asset.content);
});

server.on("error", (error) => {
    console.error(`The story server could not start on port ${port}.`, error);
    process.exitCode = 1;
});

server.listen(port, "0.0.0.0", () => {
    console.log("Story generator is available on this computer at:");
    console.log(`  http://localhost:${port}`);

    const addresses = Object.values(networkInterfaces())
        .flatMap((entries) => entries ?? [])
        .filter((entry) => !entry.internal && (entry.family === "IPv4" || entry.family === 4))
        .map((entry) => entry.address);

    if (addresses.length === 0) {
        console.log("No local IPv4 address was found. Check that Wi-Fi is connected.");
        return;
    }

    console.log("On another device on the same Wi-Fi, open one of these addresses:");
    for (const address of addresses) {
        console.log(`  http://${address}:${port}`);
    }
});
