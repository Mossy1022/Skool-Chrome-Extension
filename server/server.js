const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
require('dotenv').config();

const app = express();

// Enable CORS for all origins
app.use(cors());
app.use(express.json()); // To parse JSON bodies

// MongoDB Connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: "1",
    strict: true,
    deprecationErrors: true,
  },
});

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Error connecting to MongoDB", err);
    process.exit(1); // Exit process if connection fails
  }
}

connectToDatabase();

const db = client.db("spoilerDB");
const spoilersCollection = db.collection("spoilers");

// API Routes

// Updated GET /api/spoilers to return just the URLs array
app.get("/api/spoilers", async (req, res) => {
  try {
    const spoilers = await spoilersCollection.find({}).toArray();
    const imageUrls = spoilers.map(spoiler => spoiler.url); // Extract URLs only
    res.json(imageUrls); // Return array of URLs
  } catch (err) {
    console.error("Error fetching spoilers:", err);
    res.status(500).json({ error: "Failed to fetch spoilers" });
  }
});

app.post("/api/spoilers", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "Missing 'url' in request body" });
  }

  try {
    const existingSpoiler = await spoilersCollection.findOne({ url });
    if (existingSpoiler) {
      // Remove spoiler if it exists
      await spoilersCollection.deleteOne({ url });
      res.json({ message: "Spoiler removed" });
    } else {
      // Add spoiler if it doesn't exist
      await spoilersCollection.insertOne({ url });
      res.json({ message: "Spoiler added" });
    }
  } catch (err) {
    console.error("Error toggling spoiler:", err);
    res.status(500).json({ error: "Failed to toggle spoiler" });
  }
});

// In your server.js (same pattern, just a different collection name)
const usersCollection = db.collection("youtubeUsers"); // or "users"

// GET /api/users => returns array of userIds like ["@evansoasis", "@someotherhandle"]
app.get("/api/users", async (req, res) => {
  try {
    const users = await usersCollection.find({}).toArray();
    const userIds = users.map(u => u.userId); // e.g., ["@evansoasis","@other"]
    res.json(userIds);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch user IDs" });
  }
});

// POST /api/users => upserts user IDs from request body
// expects { userIds: [ "@evansoasis", "@otherhandle" ] }
app.post("/api/users", async (req, res) => {
  const { userIds } = req.body;
  if (!userIds || !Array.isArray(userIds)) {
    return res.status(400).json({ error: "userIds array required" });
  }

  try {
    for (const userId of userIds) {
      await usersCollection.updateOne(
        { userId },
        { $setOnInsert: { userId } },
        { upsert: true }
      );
    }
    res.json({ message: "User IDs upserted successfully" });
  } catch (err) {
    console.error("Error upserting user IDs:", err);
    res.status(500).json({ error: "Failed to upsert user IDs" });
  }
});

// Handle undefined routes
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Spoiler server running on port ${port}`);
});