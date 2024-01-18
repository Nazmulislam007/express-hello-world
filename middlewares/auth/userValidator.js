const { check, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const createError = require("http-errors");
const People = require("../../models/People");
const createHttpError = require("http-errors");

const addUserValidator = [
  check("username")
    .isLength({ min: 1 })
    .withMessage("Username is required")
    .trim()
    .custom(async (value) => {
      try {
        const user = await People.findOne({ username: value });
        if (user) throw createError("Username already exists");
      } catch (error) {
        throw createError(error);
      }
    }),
  check("email")
    .isEmail()
    .withMessage("Invalid email address")
    .trim()
    .custom(async (value) => {
      try {
        const user = await People.findOne({ email: value });
        if (user) throw createError("User already exists");
      } catch (error) {
        throw createError(error);
      }
    }),
  check("password")
    .isStrongPassword({
      minLength: 6,
      minLowercase: 0,
      minUppercase: 0,
      minNumbers: 0,
      minSymbols: 0,
    })
    .withMessage("Password must be at least 6 characters"),
];

const loginUserValidator = [
  check("email")
    .trim()
    .custom(async (value) => {
      try {
        const user = await People.findOne({
          $or: [{ email: value }, { username: value }],
        });
        if (!user) throw createError("User doesn't exist");
      } catch (error) {
        throw createError(error);
      }
    }),
  check("password")
    .isStrongPassword({
      minLength: 6,
      minLowercase: 0,
      minUppercase: 0,
      minNumbers: 0,
      minSymbols: 0,
    })
    .withMessage("Password must be at least 6 characters"),
];

const addUserValidationHandler = async (req, res, next) => {
  const errors = validationResult(req);
  const mappedError = errors.mapped();
  if (Object.keys(mappedError).length === 0) {
    next();
  } else {
    res.status(500).json({
      errors: mappedError,
    });
  }
};

const isSignedIn = async (req, res, next) => {
  try {
    const token = req.cookies[process.env.COOKIE_NAME];

    if (token) {
      const varifiedToken = jwt.verify(
        req.cookies[process.env.COOKIE_NAME],
        process.env.JWT_SECRET
      );

      if (!varifiedToken) {
        throw createHttpError("User not valid");
      }

      req.user = varifiedToken;

      next();
    } else {
      throw createHttpError("User not LoggedIn");
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addUserValidator,
  loginUserValidator,
  addUserValidationHandler,
  isSignedIn,
};
