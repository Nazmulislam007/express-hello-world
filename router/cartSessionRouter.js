const sessionCart = require("../controllers/cartSessionController");

const router = require("express").Router();

router.get("/session-cart", sessionCart().get);
router.put("/session-cart", sessionCart().update);
router.delete("/session-cart", sessionCart().remove);

module.exports = router;
