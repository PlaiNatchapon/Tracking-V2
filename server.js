const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const path = require("path");
// ⬅️ 1. เพิ่มเรียกใช้งาน http และ socket.io
const http = require("http");
const { Server } = require("socket.io");

const app = express();

// ⬅️ 2. เปลี่ยนมาสร้าง server ด้วย http.createServer ครอบ app อีกที
const server = http.createServer(app);

// ⬅️ 3. เปิดใช้งาน socket.io และตั้งค่า CORS
const io = new Server(server, {
  cors: { origin: "*" },
});

// ⬅️ 4. สร้างตัวแปรเก็บ mapping ระหว่าง user_id กับ socket.id
const userSockets = new Map();

io.on("connection", (socket) => {
  socket.on("register", (userId) => {
    userSockets.set(userId, socket.id);
  });

  socket.on("disconnect", () => {
    for (let [userId, sockId] of userSockets.entries()) {
      if (sockId === socket.id) {
        userSockets.delete(userId);
        break;
      }
    }
  });
});

// ⬅️ 5. ส่ง io และ userSockets เข้าไปใน app เพื่อให้ไฟล์ Blogin.js เรียกใช้งานได้
app.set("io", io);
app.set("userSockets", userSockets);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(express.json());
app.use(cors());

// อนุญาตให้เซิร์ฟเวอร์อ่านไฟล์หน้าบ้าน (HTML, CSS, JS) ในโปรเจกต์
app.use(express.static(path.join(__dirname)));

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "construction_store_db",
  password: "0934570709",
  port: 5432,
});

// เรียกใช้ API จากไฟล์แยก
const authRoutes = require("./backend/Blogin")(pool);
app.use("/api", authRoutes);

const salesRoutes = require("./backend/Bsales")(pool);
app.use("/api/products", salesRoutes);

const orderRoutes = require("./backend/Border")(pool);
app.use("/api/orders", orderRoutes); 

// กำหนดให้เปิดเข้าหน้า login.html ทันทีเมื่อเข้าเว็บพอร์ต 3000
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

// ⬅️ 6. เปลี่ยนจาก app.listen มาเป็น server.listen แทน
server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
