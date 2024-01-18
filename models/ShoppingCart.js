const mongoose = require("mongoose");

const shoppingCartSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    orders: {
      type: Object,
      default: {},
    },
    totalPrice: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const ShoppingCart = mongoose.model("shoppingCart", shoppingCartSchema);

module.exports = ShoppingCart;
