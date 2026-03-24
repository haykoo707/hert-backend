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

const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";

let queue = [];
let currentWorker = null;

// { workerName: { joinTime: ISO string, nextTime: ISO string } }
let timingData = {};

io.on("connection", (socket) => {
  console.log("User connected");

  socket.emit("queue", queue);
  socket.emit("currentWorker", currentWorker);
  socket.emit("timingData", timingData);

  // ─── JOIN ───
  socket.on("joinQueue", (name) => {
    if (!name) return;

    if (!queue.includes(name)) {
      queue.push(name);
    }

    // record join time
    if (!timingData[name]) timingData[name] = {};
    timingData[name].joinTime = new Date().toISOString();

    if (!currentWorker && queue.length > 0) {
      currentWorker = queue[0];
    }

    io.emit("queue", queue);
    io.emit("currentWorker", currentWorker);
    io.emit("timingData", timingData);
  });

  // ─── NEXT ORDER ───
  socket.on("nextOrder", (name) => {
    if (!name) return;

    if (!currentWorker) {
      socket.emit("errorMsg", "Հերթ չկա");
      return;
    }

    if (name !== currentWorker) {
      socket.emit("errorMsg", "Քո հերթը չէ ❌");
      return;
    }

    // record next time
    if (!timingData[name]) timingData[name] = {};
    timingData[name].nextTime = new Date().toISOString();

    queue.shift();
    currentWorker = queue.length > 0 ? queue[0] : null;

    io.emit("queue", queue);
    io.emit("currentWorker", currentWorker);
    io.emit("timingData", timingData);
    io.emit("order", name);
  });

  // ─── ADMIN REMOVE ───
  socket.on("adminRemove", ({ worker, adminUser, adminPass }) => {
    if (adminUser !== ADMIN_USER || adminPass !== ADMIN_PASS) {
      socket.emit("errorMsg", "Ադմինի մուտքն անհաջող ❌");
      return;
    }

    if (!worker || !queue.includes(worker)) {
      socket.emit("errorMsg", "Աշխատողը հերթում չէ");
      return;
    }

    const wasFirst = queue[0] === worker;
    queue = queue.filter(n => n !== worker);

    if (wasFirst) {
      currentWorker = queue.length > 0 ? queue[0] : null;
    }

    console.log(`Admin removed: ${worker}`);

    io.emit("queue", queue);
    io.emit("currentWorker", currentWorker);
  });

  // ─── ADMIN: GET TIMING DATA ───
  socket.on("adminGetTiming", ({ adminUser, adminPass }) => {
    if (adminUser !== ADMIN_USER || adminPass !== ADMIN_PASS) {
      socket.emit("errorMsg", "Ադմինի մուտքն անհաջող ❌");
      return;
    }
    socket.emit("timingData", timingData);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
