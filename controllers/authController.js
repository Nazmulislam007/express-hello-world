const People = require("../models/People");
const bcrypt = require("bcrypt");
const createHttpError = require("http-errors");
const createError = require("http-errors");
const jwt = require("jsonwebtoken");

const authController = () => {
  return {
    register: async (req, res, next) => {
      try {
        const { username, email, password } = req.body;

        const hashPassword = await bcrypt.hash(password, 10);

        const register = new People({
          username,
          email,
          password: hashPassword,
          role: "user",
        });

        await register.save();

        res.status(201).json({
          msg: "User created successfully!",
        });
      } catch (error) {
        next(error);
      }
    },
    login: async (req, res, next) => {
      try {
        const { email, password } = req.body;

        const matchUser = await People.findOne({
          $or: [{ username: email }, { email }],
        });

        if (!matchUser) {
          throw createError(500, "Login failed! Please try again.");
        }

        const isValidedPassword = await bcrypt.compare(
          password,
          matchUser.password
        );

        if (!isValidedPassword) {
          throw createError(500, "Login failed! Please try again.");
        }

        const userObj = {
          userId: matchUser._id,
          email: matchUser.email,
          username: matchUser.username,
          role: matchUser.role,
        };

        const token = jwt.sign(userObj, process.env.JWT_SECRET, {
          expiresIn: process.env.EXPIRE_IN,
        });

        res.cookie(process.env.COOKIE_NAME, token, {
          maxAge: process.env.EXPIRE_IN,
          secure: process.env.NODE_ENV.trim() === 'production' ? true : 'auto',
          httpOnly: true,
          sameSite: process.env.NODE_ENV.trim() === 'production' ? 'none' : 'lax',
        });

        res.status(200).json({
          user: userObj,
          status: true,
          msg: "User LoggedIn successfully!",
        });
      } catch (error) {
        next(error);
      }
    },
    logout: async (req, res, next) => {
      delete req.session;
      res.clearCookie(process.env.COOKIE_NAME);
      res.json({ msg: "logged out" });
    },
  };
};

module.exports = {
  authController,
};
