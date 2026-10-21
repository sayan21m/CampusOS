import { getAdminOverview } from "../services/overview.service.js";

export async function getAdminOverviewController(req, res) {
  try {
    const overview = await getAdminOverview();

    return res.status(200).json({
      message: "Overview retrieved successfully",
      overview,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}
