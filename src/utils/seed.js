// Run once (or anytime you want to reset sample data): npm run seed
// Loads the sample book catalog into MongoDB and creates a default admin
// account from SEED_ADMIN_* in .env (if one doesn't already exist).
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { connectDB } from "../config/db.js";
import { Book } from "../models/Book.js";
import { User } from "../models/User.js";
import { Genre } from "../models/Genre.js";
import { getNextSequence } from "../models/Counter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

const BOOKS = [
  {
    title: "Pride and Prejudice",
    author: "Jane Austen",
    genre: "Classic",
    price: 25.0,
    popularity: 2400,
    image: "images/book-1.jfif",
    stock: 40,
    description:
      "A witty tale of manners, misunderstandings and love in Georgian England, following Elizabeth Bennet as she navigates family expectations and her own pride.",
  },
  {
    title: "The Hound of the Baskervilles",
    author: "Sir Arthur Conan Doyle",
    genre: "Mystery",
    price: 25.0,
    popularity: 1800,
    image: "images/book-2.jpg",
    stock: 35,
    description:
      "Sherlock Holmes investigates a supposed curse haunting the Baskerville family on the Devon moors in one of detective fiction's most atmospheric mysteries.",
  },
  {
    title: "Dracula",
    author: "Bram Stoker",
    genre: "Horror Fiction",
    price: 25.0,
    popularity: 2100,
    image: "images/book-3.jfif",
    stock: 30,
    description:
      "The classic gothic horror novel that introduced Count Dracula, told through letters and diary entries as a group race to stop his reign of terror.",
  },
  {
    title: "Great Expectations",
    author: "Charles Dickens",
    genre: "Classic",
    price: 22.0,
    popularity: 1500,
    image: "images/book1.jpg",
    stock: 25,
    description:
      "Orphan Pip's journey from humble beginnings to unexpected wealth, and the mysterious benefactor who changes the course of his life.",
  },
  {
    title: "The Picture of Dorian Gray",
    author: "Oscar Wilde",
    genre: "Classic",
    price: 23.5,
    popularity: 1950,
    image: "images/book3.jpg",
    stock: 28,
    description:
      "A young man's portrait ages and bears the marks of his sins while he himself remains young, in Wilde's only novel and a landmark of gothic fiction.",
  },
  {
    title: "Frankenstein",
    author: "Mary Shelley",
    genre: "Science Fiction",
    price: 21.0,
    popularity: 1700,
    image: "images/book4.jpg",
    stock: 33,
    description:
      "Victor Frankenstein creates life from death and must reckon with the consequences of playing creator in this founding work of science fiction.",
  },
  {
    title: "Moby-Dick",
    author: "Herman Melville",
    genre: "Classic",
    price: 27.0,
    popularity: 900,
    image: "images/book5.jpg",
    stock: 18,
    description:
      "Captain Ahab's obsessive pursuit of the great white whale, narrated by Ishmael in a sweeping tale of the sea and the limits of human will.",
  },
  {
    title: "Jane Eyre",
    author: "Charlotte Bronte",
    genre: "Classic",
    price: 24.0,
    popularity: 2050,
    image: "images/book6.jpg",
    stock: 31,
    description:
      "An orphaned governess finds her voice and her own path to independence and love in this enduring classic of English literature.",
  },
  {
    title: "The Prisoner of Zenda",
    author: "Anthony Hope",
    genre: "Thriller",
    price: 20.0,
    popularity: 780,
    image: "images/book1.jpg",
    stock: 15,
    description:
      "An Englishman on holiday is mistaken for a king he happens to resemble, and is drawn into a plot to save the throne in this classic adventure of swashbuckling and mistaken identity.",
  },
  {
    title: "The Metamorphosis",
    author: "Franz Kafka",
    genre: "Classic",
    price: 19.5,
    popularity: 1600,
    image: "images/book3.jpg",
    stock: 22,
    description:
      "A traveling salesman wakes one morning to find himself transformed into a giant insect, in Kafka's unsettling meditation on alienation and the fragility of identity.",
  },
  {
    title: "Jannat Kay Pattay",
    author: "Nemrah Ahmed",
    genre: "Fiction",
    price: 18.0,
    popularity: 1400,
    image: "images/book4.jpg",
    stock: 20,
    description:
      "A story of faith, love, and self-discovery that follows its characters through personal struggle toward a deeper understanding of purpose and belief.",
  },
  {
    title: "The Kite Runner",
    author: "Khaled Hosseini",
    genre: "Fiction",
    price: 22.5,
    popularity: 2200,
    image: "images/book5.jpg",
    stock: 26,
    description:
      "A story of friendship and betrayal between two boys in Afghanistan, and one man's journey to atone for the mistakes of his childhood.",
  },
  {
    title: "Wuthering Heights",
    author: "The Bronte Sisters",
    genre: "Classic",
    price: 23.0,
    popularity: 1850,
    image: "images/book-2.jpg",
    stock: 24,
    description:
      "A turbulent tale of passion and revenge on the Yorkshire moors, following the destructive love between Catherine Earnshaw and Heathcliff across two generations.",
  },
];

async function seed() {
  await connectDB();

  const existingBooks = await Book.countDocuments();
  if (existingBooks === 0) {
    await Book.insertMany(BOOKS);
    console.log(`Inserted ${BOOKS.length} books.`);
  } else {
    console.log(`Skipped book seeding — ${existingBooks} books already exist.`);
  }

  const genreNames = (await Book.distinct("genre")).filter((n) => n && n.trim());
  for (const name of genreNames) {
    await Genre.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true });
  }
  console.log(`Seeded ${genreNames.length} genres.`);

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@publishingcompany.com").toLowerCase();
  const existingAdmin = await User.findOne({ email: adminEmail });

  if (!existingAdmin) {
    const password = process.env.SEED_ADMIN_PASSWORD || "Admin@12345";
    const hashed = await bcrypt.hash(password, 10);
    const userId = await getNextSequence("userId");
    await User.create({
      userId,
      name: process.env.SEED_ADMIN_NAME || "Admin",
      email: adminEmail,
      password: hashed,
      accessLevel: "master",
    });
    console.log(`Created admin account: ${adminEmail} / ${password}`);
    console.log("Log in at /login, then visit /admin.");
  } else {
    console.log(`Skipped admin seeding — ${adminEmail} already exists.`);
  }

  await mongoose.disconnect();
  console.log("Done.");
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
