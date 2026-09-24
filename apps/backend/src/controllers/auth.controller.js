import { registerUser, loginUser, changePassword } from "../services/auth.service.js";

export async function register(req, res) {
  try {
    const user = await registerUser(req.body);

    res.status(201).json({
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    console.error(error);

    res.status(error.statusCode || 400).json({
      message: error.message,
    });
  }
}

export async function login(req, res) {
  try {
    const result = await loginUser(req.body);

    res.status(200).json({
      message: "User logged in successfully",
      result,
    });
  } catch (error) {
    console.error(error);

    res.status(error.statusCode || 401).json({
      message: error.message,
    });
  }
}

export async function changePasswordController(req, res) {
  try {
    const result = await changePassword(req.user.userId, req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);

    res.status(error.statusCode || 401).json({
      message: error.message,
    });
  }
}