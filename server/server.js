// const express = require("express");
// const cors = require("cors");
// const { MongoClient } = require("mongodb");
// require('dotenv').config();


// const app = express();

// // Enable CORS for all origins
// app.use(cors());
// app.use(express.json()); // To parse JSON bodies

// // MongoDB Connection
// const uri = process.env.MONGODB_URI;
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: "1",
//     strict: true,
//     deprecationErrors: true,
//   },
// });

// // Connect to MongoDB
// async function connectToDatabase() {
//   try {
//     await client.connect();
//     console.log("Connected to MongoDB");
//   } catch (err) {
//     console.error("Error connecting to MongoDB", err);
//     process.exit(1); // Exit process if connection fails
//   }
// }

// // connectToDatabase();

// const db = client.db("spoilerDB"); // Replace with your database name
// const spoilersCollection = db.collection("spoilers"); // Collection for spoiler data

// // API Routes
// app.get("/api/spoilers", async (req, res) => {
//   try {
//     const spoilers = await spoilersCollection.find({}).toArray();
//     res.json(spoilers);
//   } catch (err) {
//     console.error("Error fetching spoilers:", err);
//     res.status(500).json({ error: "Failed to fetch spoilers" });
//   }
// });

// app.post("/api/spoilers", async (req, res) => {
//   const { url } = req.body;
//   if (!url) {
//     return res.status(400).json({ error: "Missing 'url' in request body" });
//   }

//   try {
//     const existingSpoiler = await spoilersCollection.findOne({ url });
//     if (existingSpoiler) {
//       // Remove spoiler if it exists
//       await spoilersCollection.deleteOne({ url });
//       res.json({ message: "Spoiler removed" });
//     } else {
//       // Add spoiler if it doesn't exist
//       await spoilersCollection.insertOne({ url });
//       res.json({ message: "Spoiler added" });
//     }
//   } catch (err) {
//     console.error("Error toggling spoiler:", err);
//     res.status(500).json({ error: "Failed to toggle spoiler" });
//   }
// });

// // Handle undefined routes
// app.use((req, res) => {
//   res.status(404).json({ error: "Endpoint not found" });
// });

// // Start the server
// const port = 3000;
// app.listen(port, () => {
//   console.log(`Spoiler server running on port ${port}`);
// });

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

// Enable CORS for all origins
app.use(cors());
app.use(express.json()); // To parse JSON bodies

// Path to the local JSON file
const SPOILERS_FILE = path.join(__dirname, "spoilers.json");

// Function to read spoilers from the JSON file
function readSpoilers() {
  try {
    if (!fs.existsSync(SPOILERS_FILE)) {
      fs.writeFileSync(SPOILERS_FILE, JSON.stringify([]));
    }
    const data = fs.readFileSync(SPOILERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading spoilers file:", err);
    return [];
  }
}

// Function to write spoilers to the JSON file
function writeSpoilers(spoilers) {
  try {
    fs.writeFileSync(SPOILERS_FILE, JSON.stringify(spoilers, null, 2));
  } catch (err) {
    console.error("Error writing to spoilers file:", err);
  }
}

// API Routes

// Updated GET /api/spoilers to return list of image URLs
app.get("/api/spoilers", (req, res) => {
  try {
    const spoilers = readSpoilers();
    const imageUrls = spoilers.map(spoiler => spoiler.url); // Extract URLs
    res.json(imageUrls); // Return the list of image URLs
  } catch (err) {
    console.error("Error fetching spoilers:", err);
    res.status(500).json({ error: "Failed to fetch spoilers" });
  }
});

app.post("/api/spoilers", (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "Missing 'url' in request body" });
  }

  try {
    let spoilers = readSpoilers();
    const spoilerIndex = spoilers.findIndex((spoiler) => spoiler.url === url);

    if (spoilerIndex !== -1) {
      // Remove spoiler if it exists
      spoilers.splice(spoilerIndex, 1);
      writeSpoilers(spoilers);
      res.json({ message: "Spoiler removed" });
    } else {
      // Add spoiler if it doesn't exist
      spoilers.push({ url });
      writeSpoilers(spoilers);
      res.json({ message: "Spoiler added" });
    }
  } catch (err) {
    console.error("Error toggling spoiler:", err);
    res.status(500).json({ error: "Failed to toggle spoiler" });
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