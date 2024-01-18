const shoppingCart = require("../controllers/shoppingCartController");
const { isSignedIn } = require("../middlewares/auth/userValidator");

const router = require("express").Router();

router.get("/", isSignedIn, shoppingCart().get);
router.post("/", shoppingCart().post);
router.patch("/", shoppingCart().update);
router.delete("/", shoppingCart().delete);

module.exports = router;
