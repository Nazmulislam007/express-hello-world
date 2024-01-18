const express = require("express");
const app = express();
const Book = require("../models/Books");

const getSingleBook = async (req, res, next) => {
  try {
    const _id = req.params._id;

    const book = await Book.findById({ _id });

    /**
     * For single book, did average for all review's rating.
     */
    const avg = await Book.aggregate([
      { $unwind: "$reviews" },
      {
        $match: {
          $expr: {
            $eq: ["$_id", { $toObjectId: _id }],
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          avgRating: { $avg: "$reviews.rating" },
        },
      },
    ]);

    const avgRating = avg[0]?.avgRating;

    res.status(200).json({ book, avgRating });
  } catch (error) {
    next(error);
  }
};

const searchBooks = async (req, res, next) => {
  try {
    const { q } = req.query;

    await Book.collection.createIndex({
      title: "text",
      subtitle: "text",
      authors: "text",
    });

    const searchedBooks = await Book.find({
      $text: {
        $search: q,
        $caseSensitive: false,
        $diacriticSensitive: true
      },
    });

    console.log(q, searchedBooks)

    res.status(200).json({ totalCount: 50, books: searchedBooks });
  } catch (error) {
    next(error);
  }
};

const relatedBooks = async (req, res, next) => {
  try {
    const { _ne, _categories, _sub_categories, _limit } = req.query;

    const filter = { _id: { $ne: _ne } };

    if (_categories?.length > 0 || _sub_categories?.length > 0) {
      filter.$or = [
        { categories: { $in: _categories } },
        { subCategories: { $in: _sub_categories } },
      ];
    }

    let related = await Book.find(filter)
      .sort({ publishedDate: 1 })
      .limit(_limit);

    const relatedBooksId = [_ne, ...related.map((elem) => elem._id.toString())];

    let youMayAlsoLike = await Book.find({
      _id: {
        $nin: relatedBooksId,
      },
      $or: [
        { categories: { $in: _categories } },
        { subCategories: { $in: _sub_categories } },
      ],
    });

    if (youMayAlsoLike.length <= 0) {
      youMayAlsoLike = await Book.find({
        _id: {
          $nin: relatedBooksId,
        },
      }).limit(14);
    }

    res.status(200).json({ related, youMayAlsoLike });
  } catch (error) {
    next(error);
  }
};

const getBooks = async (req, res, next) => {
  try {
    const upto75 = await Book.aggregate([
      {
        $match: {
          $expr: {
            $gte: [
              {
                $subtract: [
                  {
                    $toDouble: "$saleInfo.price",
                  },
                  {
                    $toDouble: "$saleInfo.discountPrice",
                  },
                ],
              },
              {
                $multiply: [
                  {
                    $toDouble: "$saleInfo.price",
                  },
                  0.75,
                ],
              },
            ],
          },
        },
      },
    ]);

    const booksWeLove = await Book.aggregate([
      {
        $sort: {
          "reviews.rating": -1,
        },
      },
      {
        $limit: 9,
      },
    ]);

    const top50Books = await Book.aggregate([
      { $sort: { "saleInfo.totalSales": -1 } },
    ]);

    const scienceFiction = await Book.find({
      categories: "Science Fiction & Fantasy",
    });

    const businessMoney = await Book.find({
      categories: "Business & Money",
    });

    res.status(200).json({
      upto75,
      booksWeLove,
      top50Books,
      scienceFiction,
      businessMoney,
    });
  } catch (error) {
    next(error);
  }
};

const getLikedBooks = async (req, res, next) => {
  try {
    const books = await Book.aggregate([
      { $sort: { "saleInfo.totalSales": -1 } },
      { $limit: 15 },
    ]);

    res.status(200).json({
      books,
    });
  } catch (error) {
    next(error);
  }
};

const createReview = async (req, res, next) => {
  try {
    const { _id, userId, username, rating, review: comment } = req.body;

    const review = {
      _id,
      userId,
      username,
      rating,
      review: comment,
    };

    /**
     * find the document using `_id`
     * now if the `userId` in the `reviews` field does exist
     * then update the review of the that particular document.
     *
     * if not then insert new document in the `reviews` array
     */

    const isExisted = await Book.findOne({
      _id,
      "reviews.userId": userId,
    });

    let result = null;
    const setQuery = {};

    if (review) {
      setQuery["reviews.$.review"] = comment;
    }
    if (rating) {
      setQuery["reviews.$.rating"] = rating;
    }

    if (isExisted !== null) {
      result = await Book.findOneAndUpdate(
        {
          _id,
          "reviews.userId": userId,
        },
        {
          $set: setQuery,
        },
        {
          new: true,
        }
      );
    } else {
      result = await Book.findByIdAndUpdate(
        { _id },
        { $push: { reviews: review } },
        { new: true }
      );
    }

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const isUseFull = async (req, res, next) => {
  try {
    const { _id, isUseFull, userId, participant } = req.body;

    const setQuery = {};
    const voteQuery = {};
    const query = {};

    if (isUseFull === "YES") {
      voteQuery["reviews.yesVotes"] = { $in: participant };
    }

    if (isUseFull === "NO") {
      voteQuery["reviews.noVotes"] = { $in: participant };
    }

    const isVoteExisted = await Book.findOne({
      _id,
      "reviews.userId": userId,
      ...voteQuery,
    });

    /**
     * find vote already exists or not.
     * if exists then remove it.
     * if not exits then add the vote.
     */

    const update = isVoteExisted
      ? {
          $pull: query,
        }
      : {
          $addToSet: setQuery,
        };

    if (isVoteExisted === null) {
      if (isUseFull === "YES") {
        setQuery["reviews.$.yesVotes"] = participant;
      }
      if (isUseFull === "NO") {
        setQuery["reviews.$.noVotes"] = participant;
      }
    } else {
      if (isUseFull === "YES") {
        query["reviews.$[].yesVotes"] = participant;
      }

      if (isUseFull === "NO") {
        query["reviews.$[].noVotes"] = participant;
      }
    }

    const result = await Book.findOneAndUpdate(
      {
        _id,
        "reviews.userId": userId,
      },
      update,
      {
        new: true,
      }
    );

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const removeReview = async (req, res, next) => {
  try {
    const { _id, userId } = req.body;

    await Book.findOneAndUpdate(
      {
        _id,
        "reviews.userId": userId,
      },
      {
        $pull: {
          reviews: {
            userId: userId,
          },
        },
      },
      {
        new: true,
      }
    );

    res.status(201).json({ msg: "Review is deleted successfully!" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSingleBook,
  searchBooks,
  relatedBooks,
  getBooks,
  isUseFull,
  createReview,
  removeReview,
  getLikedBooks,
};
