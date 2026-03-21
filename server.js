const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

let queue = [];

io.on("connection", (socket) => {
  socket.emit("queue", queue);

  socket.on("joinQueue", (name) => {
    if (!queue.includes(name)) {
      queue.push(name);
      io.emit("queue", queue);
    }
  });

  socket.on("nextOrder", () => {
    if (queue.length === 0) return;
    const worker = queue.shift();
    io.emit("queue", queue);
    io.emit("order", worker);
  });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
