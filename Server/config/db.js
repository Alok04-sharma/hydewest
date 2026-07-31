const mongoose = require("mongoose");

// ======================================
// Secure Mongoose query configuration
// ======================================

// IMPORTANT:
//
// Is project mein global `sanitizeFilter: true` enable nahi karna.
//
// `sanitizeFilter: true` legitimate internal MongoDB operators jaise:
//
// $gt
// $gte
// $lt
// $lte
// $ne
// $in
// $nin
// $or
// $exists
//
// ko untrusted values samajh sakta hai. Isse Date, Boolean aur ObjectId
// fields par CastError aata hai.
//
// HTTP requests already `middleware/security.middleware.js` se protected hain.
// Woh incoming body, query aur params mein MongoDB operator keys, dotted keys
// aur prototype-pollution keys ko controller tak pahunchne se pehle reject
// karta hai.
//
// Controllers bhi raw req.body ya req.query ko directly MongoDB filter ke roop
// mein use nahi karte; filters explicit fields se build hote hain.
mongoose.set("sanitizeFilter", false);

// Schema mein defined na hone wali query properties ignore hongi.
mongoose.set("strictQuery", true);

// ======================================
// MongoDB connection
// ======================================

const connectDB = async () => {
  try {
    const autoIndex =
      String(
        process.env.MONGO_AUTO_INDEX ||
          "true"
      ).toLowerCase() === "true";

    await mongoose.connect(
      process.env.MONGO_URI,
      {
        // MongoDB server unavailable ho to request indefinitely hang nahi hogi.
        serverSelectionTimeoutMS: 15000,

        // Long-running dead socket ko release karne mein help karta hai.
        socketTimeoutMS: 45000,

        // Render instance ke liye controlled connection pool.
        maxPoolSize: 10,
        minPoolSize: 0,

        // Development/migration ke time true.
        // Production migration complete hone ke baad false kar sakte ho.
        autoIndex,
      }
    );

    console.log(
      "MongoDB Connected"
    );
  } catch (error) {
    console.error(
      "Database Connection Failed:",
      error.message
    );

    throw error;
  }
};

module.exports = connectDB;