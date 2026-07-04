const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");        
const booksData = require("./data/books-data");
const Book = require("./models/Book");          

const app = express();
const PORT = 3000;

mongoose.connect("mongodb+srv://siddiqazehra57_db_user:<db_password>@mycluster.oeapp9k.mongodb.net/?appName=MyCluster")
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));

app.set("view engine", "ejs");

// Middleware
app.use(cors());
app.use(express.json());