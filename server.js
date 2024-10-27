const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const fs = require("node:fs/promises");
const iio = require("socket.io-client");
const socket = iio("http://localhost:3000");
app.use(express.static("public"));
app.use(express.json());

const online = {}; // لتخزين المستخدمين المتصلين ومعرفاتهم

app.post("/api/register", async (req, res) => {
  try {
    const data = await fs.readFile("./users.json", { encoding: "utf8" });
    const { name, password, number } = req.body;
    const user = {
      name: name,

      password: password,
      number: number,
      messages: [
        {
          from: "",
          to: "",
          content: "",
          time: "",
        },
      ],
    };
    const allData = JSON.parse(data);
    allData.push(user);

    await fs.writeFile("./users.json", JSON.stringify(allData));
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
  }
});
app.post("/api/login", async (req, res) => {
  try {
    const data = await fs.readFile("./users.json", { encoding: "utf8" });
    let { name, password } = req.body;
    const user = JSON.parse(data).filter(
      (ele) => ele["name"] === name && ele["password"] === password
    );
    if (user) {
      socket.emit("login", name);
    }
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
  }
});
app.get("/api/onlineUsers", async (req, res) => {
  try {
    const data = await fs.readFile("./users.json", { encoding: "utf8" });
    let { name, password } = req.body;
    const user = JSON.parse(data).filter(
      (ele) => ele["name"] === name && ele["password"] === password
    );
    if (user) {
      io.emit("onlineUsers", Object.keys(online));
      res.send(JSON.stringify([online]));
    }
    // res.sendStatus(200);
  } catch (err) {
    console.error(err);
  }
});
app.get("/api/messages/:user", async (req, res) => {
  try {
    const data = await fs.readFile("./users.json", { encoding: "utf8" });
    const user = JSON.parse(data).filter(
      (ele) => ele["name"] === req.params["user"]
    );
    if (user) {
      socket.on("private message", (data) => {
        console.log(data.sender);
        console.log(JSON.stringify(data));
        // res.send(JSON.stringify(data));
      });
      //   io.emit("onlineUsers", Object.keys(online));
      //   res.send(JSON.stringify([online]));
    }
    // res.sendStatus(200);
  } catch (err) {
    console.error(err);
  }
});
app.post("/api/messages/send/:from/:to", async (req, res) => {
  try {
    const data = await fs.readFile("./users.json", { encoding: "utf8" });
    // let { name, password } = req.body;
    // const user = JSON.parse(data).filter(
    //   (ele) => ele["name"] === name && ele["password"] === password
    // );
    socket.emit("private message", {
      from: req.params["from"],
      to: req.params["to"],
      content: req.body["message"],
    });
    // if (user) {

    // }
    //   io.emit("onlineUsers", Object.keys(online));
    //   res.send(JSON.stringify([online]));
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
  }
});

server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});

io.on("connection", (socket) => {
  socket.on("login", (username) => {
    online[username] = socket.id; //
    socket.username = username;
    io.emit("onlineUsers", Object.keys(online));
    // console.log(`${username} sgined with id: ${socket.id}`);
  });

  socket.on("private message", ({ sender, recipient, content }) => {
    if (online[recipient]) {
      io.to(online[recipient]).emit("private message", {
        from: sender,
        to: recipient,
        content: content,
      });
    } else {
      socket.emit("error", "User is not online.");
    }
  });

  socket.on("disconnect", () => {
    delete online[socket.username];
    io.emit("onlineUsers", Object.keys(online));
    console.log(`${socket.username} disconnected`);
  });
});
