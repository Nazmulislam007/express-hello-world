const { authController } = require("../controllers/authController");
const {
  addUserValidator,
  addUserValidationHandler,
} = require("../middlewares/auth/userValidator");

const router = require("express").Router();

router.post(
  "/",
  addUserValidator,
  addUserValidationHandler,
  authController().register
);

module.exports = router;
