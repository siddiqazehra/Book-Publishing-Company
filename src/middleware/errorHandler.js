// Catches anything passed to next(err) from any controller.
export function apiErrorHandler(err, req, res, next) {
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

// Fallback for page (non-API) routes that error out.
export function pageErrorHandler(err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).render("error", {
    title: "Something went wrong",
    message: err.message || "Something went wrong. Please try again.",
  });
}
