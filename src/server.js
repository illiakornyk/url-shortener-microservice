const http = require("http");
const url = require("url");
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

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  if (req.method === "POST" && path === "/api/shorturl") {
    parseBody(req, (body) => {
      const originalUrl = JSON.parse(body).url;
      const urlRegex =
        /^(http:\/\/|https:\/\/)(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/\S*)?$/;

      if (!urlRegex.test(originalUrl)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid url" }));
        return;
      }

      const hostname = url.parse(originalUrl).hostname;
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
