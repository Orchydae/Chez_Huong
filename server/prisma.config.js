// Prisma 7 configuration file
// This file is used by the Prisma CLI for migrations
require('dotenv').config();

module.exports = {
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
};
