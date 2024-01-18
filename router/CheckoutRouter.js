const {
  checkout,
  orderConfirmed,
  getOrderedBooks,
} = require("../controllers/CheckoutController");

const router = require("express")();

router.get("/get-orders", getOrderedBooks);

router.post("/create-payment-intent", checkout);
router.post("/order-confirmed", orderConfirmed);


module.exports = router;
