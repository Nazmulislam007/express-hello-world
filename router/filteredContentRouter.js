const filteredContent = require("../controllers/filteredContentController");

const router = require("express").Router();

router.get("/subjective-books", filteredContent().getFilteredBooks);
router.get("/filter-by-categories", filteredContent().getCategoryList);
router.get("/filter-by-subCategories", filteredContent().getSubCategoryList);
router.get("/filter-by-authors", filteredContent().getAuthorList);
router.get("/filter-by-price", filteredContent().getMinMaxPrice);

module.exports = router;
