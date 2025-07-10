import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const verifyJWT = asyncHandler(async (req, res, next) => {
  // Get token from cookie or header
  const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "").trim();

  if (!token) {
    throw new ApiError(401, "Unauthorized request: Token missing");
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Fetch the user
    const user = await User.findById(decoded._id).select("-password -refreshToken");
    if (!user) {
      throw new ApiError(401, "User not found with this token");
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error("JWT Error:", error.message);
    throw new ApiError(401, "Invalid or expired token");
  }
});