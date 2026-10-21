import { listRecentSearches, searchCampus } from "../services/search.service.js";
import { searchQuerySchema } from "../validators/search.validator.js";

export async function searchCampusController(req, res) {
  try {
    const parsed = req.validatedQuery
      ? { success: true, data: req.validatedQuery }
      : searchQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path[0],
          message: issue.message,
        })),
      });
    }

    const payload = await searchCampus(req.user.userId, parsed.data);

    return res.status(200).json({
      message: "Search completed successfully",
      ...payload,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function listRecentSearchesController(req, res) {
  try {
    const recent = await listRecentSearches(req.user.userId);

    return res.status(200).json({
      message: "Recent searches retrieved successfully",
      count: recent.length,
      recent,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}
