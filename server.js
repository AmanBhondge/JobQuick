require('dotenv').config();
const http = require("http");
const app = require("./app")
const port = process.env.PORT;

const server = http.createServer(app);

server.listen(port, () => { console.log("apps are running on localhost:" + port) });