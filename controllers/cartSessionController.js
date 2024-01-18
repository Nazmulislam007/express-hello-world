const express = require("express");
const app = express();

const sessionCart = () => {
  return {
    get: async (req, res, next) => {
      const cart = req.session.cart;
      const cartArr = (cart && Object.values(cart)) || [];
      res.status(200).json(cartArr);
    },
    update: async (req, res, next) => {
      try {
        if (!req.session.cart) {
          req.session.cart = {};
        }

        if (!req.session.cart[req.body._id]) {
          req.session.cart = { ...req.session.cart, [req.body._id]: req.body };
        } else {
          if (
            req.session.cart[req.body._id].quantity === 1 &&
            req.body.type === "decre"
          ) {
            delete req.session.cart[req.body._id];
          } else {
            req.session.cart = {
              ...req.session.cart,
              [req.body._id]: {
                ...req.session.cart[req.body._id],
                quantity:
                  req.body.type === "incre"
                    ? req.session.cart[req.body._id].quantity + 1
                    : req.session.cart[req.body._id].quantity - 1,
                totalPrice:
                  req.body.type === "incre"
                    ? req.session.cart[req.body._id].price *
                      (req.session.cart[req.body._id].quantity + 1)
                    : req.session.cart[req.body._id].price *
                      (req.session.cart[req.body._id].quantity - 1),
              },
            };
          }
        }

        res.status(201).json(req.session.cart);
      } catch (error) {
        next(error);
      }
    },
    remove: async (req, res, next) => {
      try {
        const { q: _id, ordered } = req.query;

        if (_id) {
          delete req.session.cart[_id];
        }

        if (ordered === "true") {
          delete req.session.cart;
        }

        res.json({ msg: "Product delete successfully" });
      } catch (error) {
        next(error);
      }
    },
  };
};

module.exports = sessionCart;
