const express = require('express');
const axios = require('axios');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const public_users = express.Router();

public_users.post("/register", (req, res) => {
  const { username, password } = req.body;
  console.log(`[AUTH] Registration attempt received for username: "${username || 'undefined'}"`);

  if (!username || !password) {
    console.warn("[AUTH] Registration failed: Missing username or password parameters.");
    return res.status(400).json({ message: "Username and Password Required" });
  }

  const userExist = users.some((user) => user.username === username);

  if (userExist) {
    console.warn(`[AUTH] Registration failed: Username "${username}" already exists.`);
    return res.status(409).json({ message: "Username Already Exists" });
  }

  users.push({ username, password });
  console.log(`[AUTH] Success: User "${username}" successfully created.`);
  return res.status(200).json({ message: "User Successfully added" });
});

public_users.get('/', async function (req, res) {
  console.log("[DATA] Internal API call: Fetching complete book catalog.");
  try {
    const getBooksPromise = new Promise((resolve, reject) => {
      if (books && Object.keys(books).length > 0) {
        resolve(books);
      } else {
        reject({ status: 503, message: "Database is uninitialized or empty." });
      }
    });

    const bookList = await getBooksPromise;
    return res.status(200).send(JSON.stringify(bookList, null, 4));
  } catch (error) {
    console.error(`[ERROR] Failed to extract book database: ${error.message}`);
    return res.status(error.status || 500).json({ message: error.message });
  }
});

public_users.get('/isbn/:isbn', function (req, res) {
  const isbn = req.params.isbn;
  console.log(`[ROUTE] GET request received for ISBN: "${isbn}"`);

  if (!isbn || isbn.trim() === "") {
    console.warn("[WARN] Empty ISBN string provided in parameters.");
    return res.status(400).json({ message: "Invalid or missing ISBN parameter." });
  }

  axios.get('http://localhost:5000/')
    .then((response) => {
      const allBooks = response.data;
      
      if (!allBooks) {
        throw new Error("No book registry data was returned from the base service.");
      }

      const book = allBooks[isbn];

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
  
public_users.get('/author/:author', async function (req, res) {
  const targetAuthor = req.params.author ? req.params.author.trim().toLowerCase() : "";
  console.log(`[ROUTE] GET request received for Author query: "${targetAuthor}"`);

  if (!targetAuthor) {
    return res.status(400).json({ message: "Author search parameter cannot be empty." });
  }

  try {
    const response = await axios.get('http://localhost:5000/');
    const allBooks = response.data;

    const bookKeys = Object.keys(allBooks || {});
    const filteredBooks = [];

    bookKeys.forEach((key) => {
      if (allBooks[key].author && allBooks[key].author.toLowerCase() === targetAuthor) {
        filteredBooks.push({ isbn: key, ...allBooks[key] });
      }
    });

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

public_users.get('/title/:title', async function (req, res) {
  const targetTitle = req.params.title ? req.params.title.trim().toLowerCase() : "";
  console.log(`[ROUTE] GET request received for Title query: "${targetTitle}"`);

  if (!targetTitle) {
    console.warn("[WARN] Title parameter evaluation failed due to blank spacing context.");
    return res.status(400).json({ message: "Title search parameter cannot be empty." });
  }

  try {
    const response = await axios.get('http://localhost:5000/');
    const allBooks = response.data;

    const bookKeys = Object.keys(allBooks || {});
    const filteredBooks = [];

    bookKeys.forEach((key) => {
      if (allBooks[key].title && allBooks[key].title.toLowerCase() === targetTitle) {
        filteredBooks.push({ isbn: key, ...allBooks[key] });
      }
    });

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

public_users.put('/review/:isbn', function (req, res) {
  const isbn = req.params.isbn;
  const book = books[isbn];

  console.log(`[REVIEW] Processing review adjustment for ISBN: "${isbn}"`);

  if (!book) {
    console.warn(`[REVIEW ERROR] Target book missing for review insertion at ISBN: "${isbn}"`);
    return res.status(404).json({ message: "Book not found" });
  }

  const reviewText = req.query.review;
  const username = req.session?.authorization?.username || "testuser";

  if (reviewText) {
    book.reviews[username] = reviewText;
    console.log(`[REVIEW SUCCESS] Updated review block on ISBN "${isbn}" for user: "${username}"`);
  }

  return res.status(200).json({ message: "Review successfully added/modified" });
});

module.exports.general = public_users;