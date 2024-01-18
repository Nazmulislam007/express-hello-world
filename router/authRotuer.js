const { isSignedIn } = require("../middlewares/auth/userValidator");

const router = require("express").Router();

router.get("/", isSignedIn, (req, res) => {
  try {

    const user = req.user.userId && req.user

    res.status(200).json({
      ...user,
      status: req.user.userId ? true : false,
    });
  } catch (error) {
    next(error);
    res.status(404).json({ msg: "User not loggedIn" });
  }
});

module.exports = router;
