const ShoppingCart = require("../models/ShoppingCart");

const shoppingCart = () => {
  return {
    //  get the shopping cart items.
    get: async (req, res, next) => {
      try {
        const cartItems = await ShoppingCart.find();

        res.status(200).json(cartItems);
      } catch (error) {
        next(error);
      }
    },
    post: async (req, res, next) => {
      try {
        req.session.carts = req.body;

        res.status(201).json({
          message: "Successful!",
        });
      } catch (error) {
        next(error);
      }
    },
    update: async (req, res, next) => {
      try {
        const { _id, type, price } = req.body;

        const result = await ShoppingCart.findByIdAndUpdate(
          {
            _id,
          },
          {
            $inc: {
              quantity: type === "incre" ? 1 : -1,
              totalPrice: type === "incre" ? price : -price,
            },
            $currentDate: {
              updatedAt: true,
            },
          }
        );

        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    },
    delete: async (req, res, next) => {
      try {
        const { q: _id } = req.query;

        await ShoppingCart.deleteOne({
          _id,
        });

        res.status(202).json({
          message: "Delete successful!",
        });
      } catch (error) {
        next(error);
      }
    },
  };
};

module.exports = shoppingCart;
