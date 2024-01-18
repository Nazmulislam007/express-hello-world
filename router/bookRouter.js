const {
  getSingleBook,
  searchBooks,
  relatedBooks,
  getBooks,
  createReview,
  removeReview,
  isUseFull,
  getLikedBooks,
} = require("../controllers/bookController");

const router = require("express").Router();

router.get("/search", searchBooks);
router.get("/related-books", relatedBooks);
router.get(`/b`, getBooks);
router.get("/you-may-also-like", getLikedBooks);
router.get("/:_id", getSingleBook);

router.patch("/create-review", createReview);
router.delete("/delete-review", removeReview);
router.patch("/is-use-full", isUseFull);

module.exports = router;
