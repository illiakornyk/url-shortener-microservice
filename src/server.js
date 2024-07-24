const http = require("http");
const url = require("url");
const querystring = require("querystring");
const dns = require("dns");

const urls = {};
let urlCount = 1;

const parseBody = (req, callback) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", () => {
    callback(body);
  });
};

const isValidUrl = (urlString) => {
  try {
    const parsedUrl = new URL(urlString);
    // Only accept http and https schemes
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch (_) {
    return false;
  }
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "https://www.freecodecamp.org");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    // Handle preflight request
    res.writeHead(204, { "Content-Type": "text/plain" });
    res.end();
    return;
  }

  if (req.method === "POST" && path === "/api/shorturl") {
    parseBody(req, (body) => {
      const parsedBody = querystring.parse(body);
      const originalUrl = parsedBody.url;

      if (!isValidUrl(originalUrl)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid url" }));
        return;
      }

      const hostname = url.parse(originalUrl).hostname;
      if (!hostname) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid url" }));
        return;
      }

      dns.lookup(hostname, (err) => {
        if (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid url" }));
          return;
        }

        const shortUrl = urlCount++;
        urls[shortUrl] = originalUrl;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ original_url: originalUrl, short_url: shortUrl })
        );
      });
    });
  } else if (req.method === "GET" && /^\/api\/shorturl\/\d+$/.test(path)) {
    const shortUrl = path.split("/").pop();
    const originalUrl = urls[shortUrl];

    if (originalUrl) {
      res.writeHead(301, { Location: originalUrl });
      res.end();
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "No short URL found for the given input" })
      );
    }
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
