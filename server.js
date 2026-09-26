const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to read database
function readDB() {
  try {
    const rawData = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Error reading DB, returning empty defaults:', error);
    return { resources: [], reviews: [], bookmarks: [] };
  }
}

// Helper to write database
function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing DB:', error);
    return false;
  }
}

// API Routes

// 1. Get all resources (optionally filtered by category)
app.get('/api/resources', (req, res) => {
  const db = readDB();
  const { category } = req.query;
  
  let resourcesList = db.resources;
  if (category) {
    resourcesList = resourcesList.filter(r => r.category === category);
  }
  
  res.json(resourcesList);
});

// 2. Add a new resource
app.post('/api/resources', (req, res) => {
  const { name, category, purpose, url, tags } = req.body;
  
  if (!name || !category || !purpose || !url) {
    return res.status(400).json({ error: 'Missing required fields: name, category, purpose, url' });
  }

  const db = readDB();
  
  // Generate ID
  const prefix = category.charAt(0);
  const existingCategoryCount = db.resources.filter(r => r.category === category).length;
  const newId = `${prefix}${existingCategoryCount + 1}_${Date.now().toString().slice(-4)}`;

  const parsedTags = Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []);

  const newResource = {
    id: newId,
    name,
    category,
    purpose,
    url,
    tags: parsedTags,
    ratingCount: 0,
    ratingSum: 0
  };

  db.resources.push(newResource);
  
  if (writeDB(db)) {
    res.status(201).json(newResource);
  } else {
    res.status(500).json({ error: 'Failed to write to database' });
  }
});

// 3. Submit a review / rating for a resource
app.post('/api/reviews', (req, res) => {
  const { resourceId, userName, rating, comment } = req.body;

  if (!resourceId || !rating) {
    return res.status(400).json({ error: 'Missing required fields: resourceId, rating' });
  }

  const numericRating = parseInt(rating, 10);
  if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
  }

  const db = readDB();
  const resource = db.resources.find(r => r.id === resourceId);
  
  if (!resource) {
    return res.status(404).json({ error: 'Resource not found' });
  }

  // Create review
  const newReview = {
    id: `r_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    resourceId,
    userName: userName || 'Anonymous',
    rating: numericRating,
    comment: comment || '',
    timestamp: new Date().toISOString()
  };

  db.reviews.push(newReview);

  // Update resource rating details
  resource.ratingCount = (resource.ratingCount || 0) + 1;
  resource.ratingSum = (resource.ratingSum || 0) + numericRating;

  if (writeDB(db)) {
    res.status(201).json({ review: newReview, resource });
  } else {
    res.status(500).json({ error: 'Failed to write review to database' });
  }
});

// 4. Get reviews for a resource
app.get('/api/reviews', (req, res) => {
  const { resourceId } = req.query;
  const db = readDB();
  
  let reviewsList = db.reviews;
  if (resourceId) {
    reviewsList = reviewsList.filter(r => r.resourceId === resourceId);
  }
  
  // Sort reviews newest first
  reviewsList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  res.json(reviewsList);
});

// 5. Get Bookmarks
app.get('/api/bookmarks', (req, res) => {
  const db = readDB();
  res.json(db.bookmarks || []);
});

// 6. Toggle Bookmark
app.post('/api/bookmarks', (req, res) => {
  const { resourceId } = req.body;
  if (!resourceId) {
    return res.status(400).json({ error: 'Missing resourceId' });
  }

  const db = readDB();
  if (!db.bookmarks) {
    db.bookmarks = [];
  }

  const index = db.bookmarks.indexOf(resourceId);
  let isBookmarked = false;

  if (index > -1) {
    // Remove it
    db.bookmarks.splice(index, 1);
  } else {
    // Add it
    db.bookmarks.push(resourceId);
    isBookmarked = true;
  }

  if (writeDB(db)) {
    res.json({ bookmarks: db.bookmarks, isBookmarked });
  } else {
    res.status(500).json({ error: 'Failed to update bookmarks' });
  }
});

// Catch-all route to serve index.html for frontend routing (if any)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` STUDENT HELP WEB (SHW) Server is running!`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` Press Ctrl+C to stop the server`);
  console.log(`==================================================`);
});
