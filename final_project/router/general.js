const express = require('express');
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

  // Fixed syntax to correctly push as an object to 'users'
  users.push({ username, password });
  return res.status(200).json({ message: "User Successfully added" });
});

public_users.get('/', async function (req, res) {
  try {
    // Simulating an asynchronous database fetch using a Promise
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

  // Implementing via a standard Promise callback (.then/.catch approach)
  const getBookByISBN = new Promise((resolve, reject) => {
    const book = books[isbn];
    if (book) {
      resolve(book);
    } else {
      reject({ status: 404, message: "Book not found" });
    }
  });

  getBookByISBN
    .then((book) => {
      return res.status(200).json(book);
    })
    .catch((err) => {
      return res.status(err.status || 500).json({ message: err.message });
    });
});
  
public_users.get('/author/:author', async function (req, res) {
  const targetAuthor = req.params.author.toLowerCase();

  try {
    const getBooksByAuthor = new Promise((resolve, reject) => {
      const bookKeys = Object.keys(books);
      const filteredBooks = [];

      bookKeys.forEach((key) => {
        if (books[key].author.toLowerCase() === targetAuthor) {
          filteredBooks.push({ isbn: key, ...books[key] });
        }
      });

      if (filteredBooks.length > 0) {
        resolve(filteredBooks);
      } else {
        reject({ status: 404, message: "No books found with this author" });
      }
    });

    const result = await getBooksByAuthor;
    return res.status(200).json({ booksByAuthor: result });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
});

public_users.get('/title/:title', async function (req, res) {
  const targetTitle = req.params.title.toLowerCase();

  try {
    const getBooksByTitle = new Promise((resolve, reject) => {
      const bookKeys = Object.keys(books);
      const filteredBooks = [];

      bookKeys.forEach((key) => {
        if (books[key].title.toLowerCase() === targetTitle) {
          filteredBooks.push({ isbn: key, ...books[key] });
        }
      });

      if (filteredBooks.length > 0) {
        resolve(filteredBooks);
      } else {
        reject({ status: 404, message: "No books found with this title" });
      }
    });

    const result = await getBooksByTitle;
    return res.status(200).json({ booksByTitle: result });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
});

public_users.get('/review/:isbn', function (req, res) {
  const isbn = req.params.isbn;
  const book = books[isbn];

  if (!book) {
    return res.status(404).json({ message: "Book not found" });
  }

  return res.status(200).json(book.reviews);
});

module.exports.general = public_users;