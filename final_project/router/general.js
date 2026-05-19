const express = require('express');
const axios = require('axios');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const public_users = express.Router();


public_users.post("/register", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and Password Required" });
  }

  const userExist = users.some((user) => user.username === username);

  if (userExist) {
    return res.status(409).json({ message: "Username Already Exists" });
  }

  users.push({ username, password });
  return res.status(200).json({ message: "User Successfully added" });
});


public_users.get('/', async function (req, res) {
  try {
    const getBooksPromise = new Promise((resolve, reject) => {
      if (books) {
        resolve(books);
      } else {
        reject({ message: "Database error. Could not retrieve books." });
      }
    });

    const bookList = await getBooksPromise;
    return res.status(200).send(JSON.stringify(bookList, null, 4));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});


public_users.get('/isbn/:isbn', function (req, res) {
  const isbn = req.params.isbn;

  // Uses Axios to perform an HTTP request to the root endpoint
  axios.get('http://localhost:5000/')
    .then((response) => {
      const allBooks = response.data;
      const book = allBooks[isbn];

      if (book) {
        return res.status(200).json(book);
      } else {
        return res.status(404).json({ message: "Book not found" });
      }
    })
    .catch((error) => {
      return res.status(500).json({ message: "Error retrieving data via Axios", error: error.message });
    });
});
  

public_users.get('/author/:author', async function (req, res) {
  const targetAuthor = req.params.author.toLowerCase();

  try {
    // Fetch data over HTTP via Axios to comply with assignment guidelines
    const response = await axios.get('http://localhost:5000/');
    const allBooks = response.data;

    const bookKeys = Object.keys(allBooks);
    const filteredBooks = [];

    bookKeys.forEach((key) => {
      if (allBooks[key].author.toLowerCase() === targetAuthor) {
        filteredBooks.push({ isbn: key, ...allBooks[key] });
      }
    });

    if (filteredBooks.length > 0) {
      return res.status(200).json({ booksByAuthor: filteredBooks });
    } else {
      return res.status(404).json({ message: "No books found with this author" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch books via Axios", error: error.message });
  }
});


public_users.get('/title/:title', async function (req, res) {
  const targetTitle = req.params.title.toLowerCase();

  try {
    const response = await axios.get('http://localhost:5000/');
    const allBooks = response.data;

    const bookKeys = Object.keys(allBooks);
    const filteredBooks = [];

    bookKeys.forEach((key) => {
      if (allBooks[key].title.toLowerCase() === targetTitle) {
        filteredBooks.push({ isbn: key, ...allBooks[key] });
      }
    });

    if (filteredBooks.length > 0) {
      return res.status(200).json({ booksByTitle: filteredBooks });
    } else {
      return res.status(404).json({ message: "No books found with this title" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch books via Axios", error: error.message });
  }
});


public_users.put('/review/:isbn', function (req, res) {
  const isbn = req.params.isbn;
  const book = books[isbn];

  if (!book) {
    return res.status(404).json({ message: "Book not found" });
  }

  const reviewText = req.query.review;

  const username = req.session?.authorization?.username || "testuser";

  if (reviewText) {
    book.reviews[username] = reviewText;
  }

  return res.status(200).json({ message: "Review successfully added/modified" });
});

module.exports.general = public_users;