import { getMyProfile } from "../services/profile.service.js";

export async function getMyProfileController(req, res) {
  try {
    const profile = await getMyProfile(req.user.userId);

    return res.status(200).json({
      profile,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}
