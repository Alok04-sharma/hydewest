const slugify = require("slugify");
const Apartment = require("../models/apartment.model");

const generateUniqueSlug = async (title) => {
  // Base slug
  let slug = slugify(title, {
    lower: true,
    strict: true,
    trim: true,
  });

  // Check if slug already exists
  let existingApartment = await Apartment.findOne({ slug });

  // If unique, return it
  if (!existingApartment) {
    return slug;
  }

  // Generate unique slug
  let uniqueSlug = slug;
  let counter = 1;

  while (await Apartment.findOne({ slug: uniqueSlug })) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  return uniqueSlug;
};

module.exports = generateUniqueSlug;