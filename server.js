import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
const app = express();
import dotenv from "dotenv";
dotenv.config();
import "express-async-errors";
import cors from "cors";
import morgan from "morgan";

import { dirname } from "path";
import { fileURLToPath } from "url";
import path from "path";

import helmet from "helmet";
import xss from "xss-clean";
import mongoSanitize from "express-mongo-sanitize";

// hello
// db and authenticateUser
import connectDB from "./db/connect.js";

// routers
import authRouter from "./routes/authRoutes.js";
import storyRouter from "./routes/storyRoutes.js";
import replyRouter from "./routes/replyRoutes.js";
import chatRouter from "./routes/chatRoutes.js";

// middleware
import notFoundMiddleware from "./middleware/not-found.js";
import errorHandlerMiddleware from "./middleware/error-handler.js";
import authenticateUser from "./middleware/auth.js";
import {BadRequestError, UnAuthenticatedError} from "./errors/index.js";
import jwt from "jsonwebtoken";

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

const __dirname = dirname(fileURLToPath(import.meta.url));

// only when ready to deploy
app.use(express.static(path.resolve(__dirname, "./client/build")));

app.use(express.json());
app.use(helmet());
app.use(xss());
app.use(cors());
app.use(mongoSanitize());

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/stories", authenticateUser, storyRouter);
app.use("/api/v1/reply", replyRouter);
app.use("/api/v1/chat", chatRouter);

// only when ready to deploy
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "./client/build", "index.html"));
});

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const port = process.env.PORT || 5200;

const websocketHttpServer = createServer();

const start = async () => {
  try {
    await connectDB(
      process.env.MONGO_URL,
      process.env.user,
      process.env.password
    );
    app.listen(port, () => {
      console.log(`Server is listening on port ${port}...`);
    });
    websocketHttpServer.listen(3001, () => {
      console.log("Websocket server is listening on port 3001...");
    });
  } catch (error) {
    console.log(error);
  }
};

const io = new Server(websocketHttpServer,{
  path: "/",
  cors: {
    origin: ["http://localhost:3000", "https://myalcoholstory.com"],
    methods: ["GET", "POST"],
  },
});


//models
import User from "./models/User.js";
import Online from "./models/Online.js";
import Chat from "./models/Chat.js";
import Message from "./models/Message.js";
import {StatusCodes} from "http-status-codes";

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    next(new Error('Authentication Invalid'))
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    socket.userId = payload.userId
    next()
  } catch (error) {
    next(new Error('Authentication Invalid'))
  }
});

io.on("connection", async (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("create-message", async (data) => {
    console.log({data})
    const { chatRoomId, content } = data
    const userId = socket.userId

    console.log(chatRoomId, userId, content)

    if (!chatRoomId || !userId || !content) {
      throw new Error('Please provide all required fields')
    }

    try {
      const message = await Message.create({
        chat: chatRoomId,
        sender: userId,
        content: content,
        read: false,
      })

      const chat = await Chat.findByIdAndUpdate(chatRoomId, {
        latestMessage: message.content,
      })

      if (chat) {
        try {
          const onlineUsers = await Online.find({user: {$in: chat.users}});

          const sender = await User.findOne({_id: userId})

          onlineUsers.forEach(user => {
            io.to(user.socketId).emit('new-message', {message, sender})
          })
        } catch (error) {
          console.log(error)
        }
      }
    } catch (error) {
      console.log(error)
      throw new Error('Unable to create message')
    }
  });

  socket.on("create-chat", async (data) => {
    const { recipient, initialMessage  } = data
    const userId = socket.userId

    let sendingUser = await User.findOne({_id:userId})
    let recipientUser = await User.findOne({_id:recipient})

    if (!sendingUser) {
      throw new Error('Sending user not found')
    }

    if (!recipientUser) {
      throw new Error('Recipient user not found')
    }

    if (!initialMessage) {
      throw new Error('Please provide a message')
    }

    try {
      const chat = await Chat.create({
        users: [userId, recipient],
      })

      const message = await Message.create({
        chat: chat._id,
        sender: userId,
        content: initialMessage,
        read: false
      })

      chat.latestMessage = message.content
      await chat.save()

      if (chat && message) {
        try {
          const onlineUsers = await Online.find({user: {$in: chat.users}})
          onlineUsers.forEach(user => {
            io.to(user.socketId).emit('new-chat', {chat, users: [sendingUser, recipientUser]})
          })
        } catch (error) {
          console.log(error)
          console.log('Unable to find online users')
        }
      }
    } catch (error) {
      console.log(error)
      throw new Error('Unable to create chat room')
    }
  });

  socket.on("disconnect", async () => {
    console.log(`Client disconnected: ${socket.id}`);
    await Online.findOneAndDelete({socketId: socket.id});
    console.log(socket.userId + " is offline");
  });

  const online = await Online.findOne({user: socket.userId})

  if (online) {
    try {
      await Online.findOneAndUpdate(
        { user: socket.userId },
        { socketId: socket.id }
      );
      console.log(socket.userId + " is online");
    } catch (err) {
      console.log(err);
    }
  } else {
    try {
      await Online.create({user: socket.userId, socketId: socket.id});
      console.log(socket.userId + " is online");
    } catch (err) {
      console.log(err);
    }
  }
});

await start();
