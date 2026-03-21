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
let currentWorker = null; // 🔥 ով ունի իրավունք հիմա

io.on("connection", (socket) => {
  console.log("User connected");

  // սկզբում ուղարկում ենք ամեն ինչ
  socket.emit("queue", queue);
  socket.emit("currentWorker", currentWorker);

  // JOIN
  socket.on("joinQueue", (name) => {
    if (!name) return;

    if (!queue.includes(name)) {
      queue.push(name);
    }

    // եթե ոչ ոք չկա → առաջինը դառնում է currentWorker
    if (!currentWorker && queue.length > 0) {
      currentWorker = queue[0];
    }

    io.emit("queue", queue);
    io.emit("currentWorker", currentWorker);
  });

  // NEXT ORDER
  socket.on("nextOrder", (name) => {
    if (!name) return;

    if (!currentWorker) {
      socket.emit("errorMsg", "Հերթ չկա");
      return;
    }

    // 🔒 միայն currentWorker-ը կարող է
    if (name !== currentWorker) {
      socket.emit("errorMsg", "Քո հերթը չէ ❌");
      return;
    }

    // հանում ենք իրեն queue-ից
    queue.shift();

    // նոր currentWorker
    currentWorker = queue.length > 0 ? queue[0] : null;

    io.emit("queue", queue);
    io.emit("currentWorker", currentWorker);
    io.emit("order", name);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
