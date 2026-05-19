const express = require('express');
const axios = require('axios');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const public_users = express.Router();

// ========================================================
// USER REGISTRATION (Task 6 / Question 7)
// ========================================================
public_users.post("/register", (req, res) => {
  const { username, password } = req.body;
  console.log(`[AUTH] Registration attempt received for username: "${username || 'undefined'}"`);

  // Check if both username and password were provided
  if (!username || !password) {
    console.warn("[AUTH] Registration failed: Missing username or password parameters.");
    return res.status(400).json({ message: "Username and Password Required" });
  }

  // Check if the username is already taken
  const userExist = users.some((user) => user.username === username);

  if (userExist) {
    console.warn(`[AUTH] Registration failed: Username "${username}" already exists.`);
    return res.status(409).json({ message: "Username already exists" });
  }

  // Save the new user to the system array
  users.push({ username, password });
  console.log(`[AUTH] Success: User "${username}" successfully created.`);
  return res.status(200).json({ message: "User successfully registered" });
});

// ========================================================
// GET ALL BOOKS (Task 1 / Task 10)
// ========================================================
public_users.get('/', async function (req, res) {
  console.log("[DATA] Internal API call: Fetching complete book catalog.");
  try {
    // Wrap database retrieval in a standard Promise wrapper
    const getBooksPromise = new Promise((resolve, reject) => {
      if (books && Object.keys(books).length > 0) {
        resolve(books);
      } else {
        reject({ status: 503, message: "Database is uninitialized or empty." });
      }
    });

    // Wait for the promise to resolve and send the book catalog back
    const bookList = await getBooksPromise;
    return res.status(200).send(JSON.stringify(bookList, null, 4));
  } catch (error) {
    console.error(`[ERROR] Failed to extract book database: ${error.message}`);
    return res.status(error.status || 500).json({ message: error.message });
  }
});

// ========================================================
// GET BOOK BY ISBN (Task 2 / Task 11)
// ========================================================
public_users.get('/isbn/:isbn', function (req, res) {
  const isbn = req.params.isbn;
  console.log(`[ROUTE] GET request received for ISBN: "${isbn}"`);

  // Error check: Make sure the ISBN input isn't blank
  if (!isbn || isbn.trim() === "") {
    console.warn("[WARN] Empty ISBN string provided in parameters.");
    return res.status(400).json({ message: "Invalid or missing ISBN parameter." });
  }

  // Fetch the full book directory via an HTTP call using Axios Promises (.then/.catch)
  axios.get('http://localhost:5000/')
    .then((response) => {
      const allBooks = response.data;
      
      if (!allBooks) {
        throw new Error("No book registry data was returned from the base service.");
      }

      const book = allBooks[isbn];

      // If the book exists under that ISBN, send it back
      if (book) {
        console.log(`[SUCCESS] Found book for ISBN "${isbn}": ${book.title}`);
        return res.status(200).json(book);
      } else {
        console.warn(`[NOT FOUND] No catalog entry matches ISBN: "${isbn}"`);
        return res.status(404).json({ message: "Book not found" });
      }
    })
    .catch((error) => {
      console.error(`[ERROR] Troubleshooting ISBN "${isbn}" endpoint failure: ${error.message}`);
      return res.status(500).json({ message: "Error retrieving data via Axios", error: error.message });
    });
});
  
// ========================================================
// GET BOOKS BY AUTHOR (Task 3 / Task 12)
// ========================================================
public_users.get('/author/:author', async function (req, res) {
  const targetAuthor = req.params.author ? req.params.author.trim().toLowerCase() : "";
  console.log(`[ROUTE] GET request received for Author query: "${targetAuthor}"`);

  // Error check: Make sure the author search query isn't blank
  if (!targetAuthor) {
    return res.status(400).json({ message: "Author search parameter cannot be empty." });
  }

  try {
    // Fetch data over HTTP using Axios with Async/Await
    const response = await axios.get('http://localhost:5000/');
    const allBooks = response.data;

    const bookKeys = Object.keys(allBooks || {});
    const filteredBooks = [];

    // Loop through the catalog to find books matching the requested author
    bookKeys.forEach((key) => {
      if (allBooks[key].author && allBooks[key].author.toLowerCase() === targetAuthor) {
        filteredBooks.push({ isbn: key, ...allBooks[key] });
      }
    });

    // If matches were found, return the list array
    if (filteredBooks.length > 0) {
      console.log(`[SUCCESS] Found ${filteredBooks.length} records matching author: "${targetAuthor}"`);
      return res.status(200).json({ booksByAuthor: filteredBooks });
    } else {
      console.warn(`[NOT FOUND] Zero records match author query: "${targetAuthor}"`);
      return res.status(404).json({ message: "No books found with this author" });
    }
  } catch (error) {
    console.error(`[ERROR] Troubleshooting Author "${targetAuthor}" endpoint failure: ${error.message}`);
    return res.status(500).json({ message: "Failed to fetch books via Axios", error: error.message });
  }
});

// ========================================================
// GET BOOKS BY TITLE (Task 4 / Task 13)
// ========================================================
public_users.get('/title/:title', async function (req, res) {
  const targetTitle = req.params.title ? req.params.title.trim().toLowerCase() : "";
  console.log(`[ROUTE] GET request received for Title query: "${targetTitle}"`);

  // Error check: Make sure the title search query isn't blank
  if (!targetTitle) {
    console.warn("[WARN] Title parameter evaluation failed due to blank spacing context.");
    return res.status(400).json({ message: "Title search parameter cannot be empty." });
  }

  try {
    // Fetch data over HTTP using Axios with Async/Await
    const response = await axios.get('http://localhost:5000/');
    const allBooks = response.data;

    const bookKeys = Object.keys(allBooks || {});
    const filteredBooks = [];

    // Loop through the catalog to find books matching the requested title
    bookKeys.forEach((key) => {
      if (allBooks[key].title && allBooks[key].title.toLowerCase() === targetTitle) {
        filteredBooks.push({ isbn: key, ...allBooks[key] });
      }
    });

    // If matches were found, return the list array
    if (filteredBooks.length > 0) {
      console.log(`[SUCCESS] Found ${filteredBooks.length} records matching title: "${targetTitle}"`);
      return res.status(200).json({ booksByTitle: filteredBooks });
    } else {
      console.warn(`[NOT FOUND] Zero records match title query: "${targetTitle}"`);
      return res.status(404).json({ message: "No books found with this title" });
    }
  } catch (error) {
    console.error(`[ERROR] Troubleshooting Title "${targetTitle}" endpoint failure: ${error.message}`);
    return res.status(500).json({ message: "Failed to fetch books via Axios", error: error.message });
  }
});

// ========================================================
// ADD OR UPDATE A BOOK REVIEW (Task 5 / Task 8)
// ========================================================
public_users.put('/review/:isbn', function (req, res) {
  const isbn = req.params.isbn;
  const book = books[isbn];

  console.log(`[REVIEW] Processing review adjustment for ISBN: "${isbn}"`);

  // Error check: Stop if the requested book doesn't exist in our records
  if (!book) {
    console.warn(`[REVIEW ERROR] Target book missing for review insertion at ISBN: "${isbn}"`);
    return res.status(404).json({ message: "Book not found" });
  }

  const reviewText = req.query.review;
  // Fall back to 'testuser' if a custom login session isn't active
  const username = req.session?.authorization?.username || "testuser";

  // If a review query parameter was provided, map it to the active user profile
  if (reviewText) {
    book.reviews[username] = reviewText;
    console.log(`[REVIEW SUCCESS] Updated review block on ISBN "${isbn}" for user: "${username}"`);
  }

  return res.status(200).json({ message: "Review successfully added" });
});

module.exports.general = public_users;