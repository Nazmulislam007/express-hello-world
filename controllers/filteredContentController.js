const Book = require("../models/Books");

async function getFormattedQuery({
  _authors,
  _categories,
  _sub_categories,
  _rating,
  _price,
  pipeline,
  getExistingCate,
}) {
  const existingCate = await getExistingCate;

  const query = {
    $and: [],
  };

  if (_categories) {
    query.$and.push({ categories: { $in: _categories } });
    if (_sub_categories) {
      query.$and.push({ subCategories: { $in: _sub_categories } });
    }
  }

  if (_authors) {
    query.$and.push({ authors: { $in: _authors } });
  }

  if (!_authors && !_categories) {
    query.$and.push({ categories: { $in: existingCate[0]?.categories } });
  }

  if (_price) {
    query.$and.push(
      {
        "saleInfo.discountPrice": { $gte: +_price[0] },
      },
      {
        "saleInfo.discountPrice": { $lte: +_price[1] },
      }
    );
  }

  /**
   * 1. average of the reviews.rating for each document.
   * 2. if average of the reviews.rating is greater than equal to _rating than we will get the data.
   */
  if (_rating) {
    pipeline.push({ $unwind: "$reviews" });
    query.$and.push({
      $expr: {
        $gte: [{ $avg: "$reviews.rating" }, +_rating],
      },
    });
  }

  return query;
}

async function filteredByContent({
  limit,
  skip,
  _limit,
  _page,
  _type,
  _categories,
  _sub_categories,
  _rating,
  _authors,
  _price,
  getExistingCate,
}) {
  let pipeline = [];
  let counterQuery = {};
  let counterLimit = {};

  /**
   * get the data according to the _type.
   */
  if (_type === "Top 50 Books") {
    const query = await getFormattedQuery({
      pipeline,
      _categories,
      _sub_categories,
      _authors,
      _rating,
      _price,
      getExistingCate,
    });

    counterQuery = query;
    counterLimit.limit = 50;
    pipeline.push(
      {
        $sort: { "saleInfo.totalSales": -1 },
      },
      {
        $match: query,
      }
    );
  } else if (_type === "Upto 75%25 Off") {
    const formattedQuery = await getFormattedQuery({
      pipeline,
      _categories,
      _sub_categories,
      _authors,
      _rating,
      _price,
      getExistingCate,
    });

    let query = {
      $and: [
        {
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
        ...formattedQuery.$and,
      ],
    };

    counterQuery = query;
    counterLimit = {};
    pipeline.push({
      $match: query,
    });
  } else if (_type === "Subject") {
    const formattedQuery = await getFormattedQuery({
      pipeline,
      _categories,
      _sub_categories,
      _authors,
      _rating,
      _price,
      getExistingCate,
    });

    let query = {
      $and: [{ _id: { $exists: true } }, ...formattedQuery.$and],
    };

    counterQuery = query;
    counterLimit = {};
    pipeline.push({
      $match: query,
    });
  } else {
    const query = await getFormattedQuery({
      pipeline,
      _categories,
      _sub_categories,
      _authors,
      _rating,
      _price,
      getExistingCate,
    });

    // console.log(JSON.stringify(query));

    counterQuery = query;
    counterLimit = {};
    pipeline.push({
      $match: query,
    });
  }

  if (_page && _limit) {
    pipeline.push({ $skip: skip }, { $limit: limit });
  }

  return { pipeline, counterQuery, counterLimit };
}

async function getCategoriesByType({ _type }) {
  let pipeline = [];

  // get the `categories` according to the `_type`.
  if (_type === "Top 50 Books") {
    pipeline.push({ $sort: { "saleInfo.totalSales": -1 } });
  } else if (_type === "Upto 75%25 Off") {
    pipeline.push({
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
    });
  } else if (_type === "Subject") {
    pipeline.push({
      $match: {
        _id: { $exists: true },
      },
    });
  } else {
    pipeline.push({
      $match: {
        $or: [{ categories: _type }],
      },
    });
  }

  pipeline.push(
    {
      $group: {
        _id: _type,
        categories: { $addToSet: "$categories" },
      },
    },
    {
      $project: {
        categories: {
          $reduce: {
            input: "$categories",
            initialValue: [],
            in: { $setUnion: ["$$value", "$$this"] },
          },
        },
      },
    }
  );

  const getExistingCate = await Book.aggregate(pipeline);

  return getExistingCate;
}

const filteredContent = () => {
  return {
    getFilteredBooks: async (req, res, next) => {
      try {
        const {
          _page,
          _limit,
          _type,
          _categories,
          _sub_categories,
          _authors,
          _rating,
          _price,
        } = req.query;

        // Converting _page and _limit to numbers
        const pageNumber = +_page;
        const limit = +_limit;

        // getting 5 page as maximum;
        const _max5Page = Math.min(pageNumber, 5);
        const skip =
          (_type === "Top 50 Books" ? _max5Page - 1 : _page - 1) * +_limit;

        const getExistingCate = await getCategoriesByType({ _type });

        const { pipeline, counterQuery, counterLimit } =
          await filteredByContent({
            limit,
            skip,
            _page,
            _limit,
            _type,
            _categories,
            _sub_categories,
            _authors,
            _price,
            _rating,
            getExistingCate,
          });

        // console.log(JSON.stringify(getExistingCate));

        const [books, totalCount] = await Promise.all([
          await Book.aggregate(pipeline),
          await Book.countDocuments(counterQuery, counterLimit),
        ]);

        // console.log(books)

        res.status(200).json({
          books,
          totalCount,
        });
      } catch (error) {
        next(error);
      }
    },
    getCategoryList: async (req, res, next) => {
      try {
        const { _type, _authors } = req.query;

        let pipeline = [];

        // get the `categories` according to the `_type`.
        if (_type === "Top 50 Books") {
          pipeline.push({ $sort: { "saleInfo.totalSales": -1 } });
          if (_authors) {
            pipeline.push({
              $match: {
                authors: { $in: _authors },
              },
            });
          }
        } else if (_type === "Upto 75%25 Off") {
          const query = {
            $match: {
              $and: [
                {
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
              ],
            },
          };

          if (_authors) {
            query.$match.$and.push({
              authors: { $in: _authors },
            });
          }

          pipeline.push(query);
        } else if (_type === "Subject") {
          const query = {
            $match: {
              $and: [{ _id: { $exists: true } }],
            },
          };

          if (_authors) {
            query.$match.$and.push({
              authors: { $in: _authors },
            });
          }

          pipeline.push(query);
        } else {
          const query = {
            $match: {
              $and: [{ categories: _type }],
            },
          };

          if (_authors) {
            query.$match.$and.push({
              authors: { $in: _authors },
            });
          }

          pipeline.push(query);
        }

        pipeline.push(
          {
            $group: {
              _id: _type,
              categories: { $addToSet: "$categories" },
            },
          },
          {
            $project: {
              categories: {
                $reduce: {
                  input: "$categories",
                  initialValue: [],
                  in: { $setUnion: ["$$value", "$$this"] },
                },
              },
            },
          }
        );

        const getExistingCate = await Book.aggregate(pipeline);

        const categories = getExistingCate[0].categories;

        res.status(200).json({ categories });
      } catch (error) {
        next(error);
      }
    },
    getSubCategoryList: async (req, res, next) => {
      try {
        const { _categories } = req.query;

        let pipeline = [];

        const query = {
          $match: {
            $and: [{ categories: { $in: _categories } }],
          },
        };

        pipeline.push(query);

        pipeline.push(
          {
            $group: {
              _id: _categories,
              subCategories: { $addToSet: "$subCategories" },
            },
          },
          {
            $project: {
              subCategories: {
                $reduce: {
                  input: "$subCategories",
                  initialValue: [],
                  in: { $setUnion: ["$$value", "$$this"] },
                },
              },
            },
          }
        );

        const getExistingSubCate = await Book.aggregate(pipeline);

        const subCategories = getExistingSubCate[0].subCategories;

        res.status(200).json({ subCategories });
      } catch (error) {
        next(error);
      }
    },
    getAuthorList: async (req, res, next) => {
      try {
        const { _type, _categories, _sub_categories } = req.query;

        let pipeline = [];

        // get the `categories` according to the `_type`.
        if (_type === "Top 50 Books") {
          pipeline.push({ $sort: { "saleInfo.totalSales": -1 } });

          const query = {
            $and: [{ _id: { $exists: true } }],
          };

          if (_categories) {
            query.$and.push({
              categories: { $in: _categories },
            });
          }

          if (_sub_categories) {
            query.$and.push({
              subCategories: { $in: _sub_categories },
            });
          }

          pipeline.push({
            $match: query,
          });
        } else if (_type === "Upto 75%25 Off") {
          const query = {
            $and: [
              {
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
            ],
          };

          if (_categories) {
            query.$and.push({
              categories: { $in: _categories },
            });
          }

          if (_sub_categories) {
            query.$and.push({
              subCategories: { $in: _sub_categories },
            });
          }

          pipeline.push({
            $match: query,
          });
        } else if (_type === "Subject") {
          const query = {
            $and: [{ _id: { $exists: true } }],
          };

          if (_categories) {
            query.$and.push({
              categories: { $in: _categories },
            });
          }

          if (_sub_categories) {
            query.$and.push({
              subCategories: { $in: _sub_categories },
            });
          }

          pipeline.push({
            $match: query,
          });
        } else {
          const query = {
            $and: [{ categories: _type }],
          };

          if (_categories) {
            query.$and.push({
              categories: { $in: _categories },
            });
          }

          if (_sub_categories) {
            query.$and.push({
              subCategories: { $in: _sub_categories },
            });
          }

          pipeline.push({
            $match: query,
          });
        }

        pipeline.push(
          {
            $group: {
              _id: _type,
              authors: { $addToSet: "$authors" },
            },
          },
          {
            $project: {
              authors: {
                $reduce: {
                  input: "$authors",
                  initialValue: [],
                  in: { $setUnion: ["$$value", "$$this"] },
                },
              },
            },
          }
        );

        const getExistingAuthors = await Book.aggregate(pipeline);

        const authors = getExistingAuthors[0].authors;

        res.status(200).json({ authors });
      } catch (error) {
        next(error);
      }
    },
    getMinMaxPrice: async (req, res, next) => {
      try {
        const { _type, _authors, _categories, _sub_categories } = req.query;

        const pipeline = [];

        const query = {
          $and: [],
        };

        if (_type === "Top 50 Books") {
          pipeline.push({ $sort: { "saleInfo.totalSales": -1 } });
          query.$and.push({
            _id: { $exists: true },
          });
        } else if (_type === "Upto 75%25 Off") {
          query.$and.push({
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
          });
        } else if (_type === "Subject") {
          query.$and.push({
            _id: { $exists: true },
          });
        } else {
          query.$and.push({ categories: _type });
        }

        if (_authors) {
          query.$and.push({ authors: { $in: _authors } });
        }

        if (_categories) {
          query.$and.push({ categories: { $in: _categories } });
        }

        if (_sub_categories) {
          query.$and.push({ subCategories: { $in: _sub_categories } });
        }

        pipeline.push({
          $match: query,
        });

        /**
         * get the min price after filtering using `req.query`
         * get the max price after filtering using `req.query`
         */

        pipeline.push({
          $group: {
            _id: "price",
            minPrice: { $min: "$saleInfo.discountPrice" },
            maxPrice: { $max: "$saleInfo.discountPrice" },
          },
        });

        const price = await Book.aggregate(pipeline);

        res.status(200).json([price[0].minPrice, price[0].maxPrice]);
      } catch (error) {
        next(error);
      }
    },
  };
};

module.exports = filteredContent;
