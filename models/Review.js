const { default: mongoose } = require("mongoose");

const ReviewsScheme = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
  },
  yesVotes: {
    type: [String],
    default: [],
  },
  noVotes: {
    type: [String],
    default: [],
  },
  review: {
    type: String,
    required: true,
  },
}, {
  timestamps: true
});

module.exports = ReviewsScheme;
