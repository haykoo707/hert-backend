const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

let queue = [];

io.on("connection", (socket) => {
  console.log("User connected");

  // ուղարկում ենք queue-ը նոր user-ին
  socket.emit("queue", queue);

  // JOIN QUEUE
  socket.on("joinQueue", (name) => {
    if (!name) return;

    if (!queue.includes(name)) {
      queue.push(name);
      io.emit("queue", queue);
    }
  });

  // NEXT ORDER (ONLY FIRST USER)
  socket.on("nextOrder", (name) => {
    if (!name) return;

    if (queue.length === 0) {
      socket.emit("errorMsg", "Հերթ չկա");
      return;
    }

    // 🔥 check → միայն առաջինն է կարող
    if (queue[0] !== name) {
      socket.emit("errorMsg", "Քո հերթը չէ ❌");
      return;
    }

    const worker = queue.shift();

    io.emit("queue", queue);
    io.emit("order", worker);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Render / hosting support
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
