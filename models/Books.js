const { default: mongoose } = require("mongoose");
const ReviewsScheme = require("./Review");

const booksSchema = new mongoose.Schema({
  title: { type: String, required: true },
  authors: { type: [String], required: true },
  publishedDate: { type: String, required: true },
  description: { type: String, required: true },
  pageCount: { type: Number, required: true },
  categories: { type: [String], required: true },
  subCategories: { type: [String], required: true },
  imageLinks: {
    type: Object,
    required: true,
    thumbnail: { type: String, required: true },
  },
  language: { type: String, required: true },
  saleInfo: {
    type: Object,
    required: true,
    country: { type: String, required: true },
    price: { type: Number, required: true },
    discountPrice: { type: Number, required: true },
    availableCopy: { type: Number, required: true },
    totalSales: { type: Number, required: true },
    upto75off: { type: Boolean, required: true },
  },
  reviews: [ReviewsScheme],
});

const Book = mongoose.model("Book", booksSchema);

module.exports = Book;
