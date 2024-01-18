// external import
require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const MongoDbStore = require("connect-mongo");
const PORT = process.env.PORT || 3330;

// internal imports
const bookRouter = require("./router/bookRouter");
const shoppingCartRouter = require("./router/shoppingCartRouter");
const checkoutRouter = require("./router/CheckoutRouter");
const registerRouter = require("./router/registerRouter");
const loginRouter = require("./router/loginRouter");
const authRouter = require("./router/authRotuer");
const cartSessionRouter = require("./router/cartSessionRouter");
const filteredContentRouter = require("./router/filteredContentRouter");
const {
  notFoundHandler,
  errorHandler,
} = require("./middlewares/common/errorHandler");

// initialize app
const app = express();

const url =
  process.env.NODE_ENV === "development"
    ? "mongodb://127.0.0.1:27017/book-app"
    : process.env.MONGDB_URL;

// database setup
async function main() {
  await mongoose.connect(url);
}

main()
  .then(() => console.log("database connected"))
  .catch((err) => console.log(err));

// request parser setup
app.use(cookieParser("random-secret"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("trust proxy", 1);
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    store: MongoDbStore.create({
      client: mongoose.connection.getClient(),
      dbName: "book-app",
      collectionName: "sessions",
    }),
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production" ? true : "auto",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(
  cors({
    origin: [
      "https://checkout.stripe.com",
      "http://localhost:5173",
      "https://book-app-123.web.app",
    ],
    methods: ["GET", "PATCH", "POST", "DELETE", "PUT"],
    credentials: true,
  })
);

// router setup
app.use("/books", bookRouter);
// app.use("/shopping-cart", shoppingCartRouter);
app.use(checkoutRouter);
app.use("/register", registerRouter);
app.use("/login", loginRouter);
app.use(cartSessionRouter);
app.use("/auth", authRouter);
app.use(filteredContentRouter);

// error handling setup
app.use(notFoundHandler); // 404 error
app.use(errorHandler); // default error

// server setup
app.listen(PORT, () =>
  console.log(
    `server running on url: ${
      process.env.NODE_ENV === "production"
        ? "https://book-api-5xof.onrender.com/books"
        : `http://localhost:${PORT}/books`
    }`
  )
);
