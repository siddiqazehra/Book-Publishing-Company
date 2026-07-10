// Catches anything passed to next(err) from any controller.
// Keeps error formatting consistent as you add more collections/routes.
export function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({ message: `That ${field} is already in use.` });
  }

  if (err.name === "ValidationError") {
    const first = Object.values(err.errors)[0]?.message || "Invalid input.";
    return res.status(400).json({ message: first });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid ID format." });
  }

  res.status(err.status || 500).json({ message: err.message || "Something went wrong." });
}

