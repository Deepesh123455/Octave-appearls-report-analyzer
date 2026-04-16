import { defineConfig } from "drizzle-kit";

export default defineConfig({
    dialect: "postgresql",
    schema: "./db/schema.js", // Path to your JS schema file
    out: "./drizzle",             // Where migrations will be saved
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
});