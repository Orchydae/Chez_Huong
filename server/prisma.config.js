// Prisma 7 configuration file
require('dotenv').config();

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!url) {
  console.error("❌ ERROR: DIRECT_URL or DATABASE_URL not found in environment.");
}

module.exports = {
  datasource: {
    url: url,
  },
};
