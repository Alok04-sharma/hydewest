const mongoose = require("mongoose");

const searchAnalyticsSchema = new mongoose.Schema(
  {
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    searchText: { type: String, trim: true, default: "", maxlength: 240 },
    city: { type: String, trim: true, default: "", index: true },
    state: { type: String, trim: true, default: "", index: true },
    area: { type: String, trim: true, default: "", index: true },
    pinCode: { type: String, trim: true, default: "", index: true },
    propertyType: { type: String, trim: true, default: "" },
    searchCount: { type: Number, default: 1, min: 1 },
    firstSearchedAt: { type: Date, default: Date.now },
    lastSearchedAt: { type: Date, default: Date.now, index: true },
    dayBucket: { type: String, required: true, index: true },
    searchKey: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true }
);

searchAnalyticsSchema.index({ city: 1, lastSearchedAt: -1 });
searchAnalyticsSchema.index({ state: 1, area: 1, lastSearchedAt: -1 });
searchAnalyticsSchema.index({ pinCode: 1, lastSearchedAt: -1 });

module.exports = mongoose.model("SearchAnalytics", searchAnalyticsSchema);
