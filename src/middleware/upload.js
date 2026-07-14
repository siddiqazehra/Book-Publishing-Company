import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../../public/uploads");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const ALLOWED = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".jfif"];

function fileFilter(req, file, cb) {
  const ok = ALLOWED.includes(path.extname(file.originalname).toLowerCase());
  cb(ok ? null : new Error("Only image files are allowed."), ok);
}

export const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

export function uploadCover(req, res, next) {
  upload.single("cover")(req, res, (err) => {
    if (err) {
      const mode = req.params.id ? "edit" : "create";
      const message = err.code === "LIMIT_FILE_SIZE"
        ? "The image is too large (max 5 MB)."
        : (err.message || "Could not upload the image.");
      const book = mode === "edit" ? { ...req.body, _id: req.params.id } : req.body;
      return res.status(400).render("admin/book-form", {
        title: mode === "create" ? "Add Book" : "Edit Book",
        book,
        error: message,
        mode,
      });
    }
    next();
  });
}
