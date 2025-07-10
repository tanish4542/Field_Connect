import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { upload as uploadOnCloudinary } from '../utils/cloudinary.js';
import jwt from 'jsonwebtoken';



const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(500, 'Something went wrong while generating tokens');
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;

  if (!fullName || !email || !username || !password) {
    throw new ApiError(400, 'All fields (fullName, email, username, password) are required');
  }

  const existingUser = await User.findOne({
    $or: [
      { email: email.toLowerCase() },
      { username }
    ]
  });

  if (existingUser) {
    throw new ApiError(409, 'User with this email or username already exists');
  }

  const avatarFile = req.files?.avatar?.[0];
  if (!avatarFile || !avatarFile.path) {
    throw new ApiError(400, 'Avatar file is required');
  }

  console.log("Uploading avatar from path:", avatarFile.path);

  let avatarUrl = '';
  try {
    const avatarUpload = await uploadOnCloudinary(avatarFile.path);
    avatarUrl = avatarUpload.secure_url;
  } catch (error) {
    console.error("Cloudinary Upload Failed:", error);
    throw new ApiError(500, 'Avatar upload failed');
  }

  const user = await User.create({
    fullname: fullName,
    email,
    username,
    password,
    avatar: avatarUrl,
  });

  const userData = await User.findById(user._id).select('-password -refreshToken');

  return res.status(201).json(
    new ApiResponse(201, userData, 'User registered successfully', true)
  );
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if ((!email && !username) || !password) {
    throw new ApiError(400, 'Either email or username and password are required');
  }

  const user = await User.findOne({
    $or: [
      email ? { email: email.toLowerCase() } : {},
      username ? { username } : {},
    ],
  }).select('+password');

  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const isMatch = await user.isPasswordCorrect(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
  };

  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  });

  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.refreshToken;

  return res.status(200).json(
    new ApiResponse(200, userObj, 'Login successful', true)
  );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $unset: {
      refreshToken: 1,
    },
  }, { new: true });

  const isProduction = process.env.NODE_ENV === 'production';
  const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
  };

  return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingToken = req.cookies.refreshToken;
  if (!incomingToken) throw new ApiError(401, "Refresh token missing");

  const decoded = jwt.verify(incomingToken, process.env.REFRESH_TOKEN_SECRET);
  const user = await User.findById(decoded._id);

  if (!user || user.refreshToken !== incomingToken) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const accessToken = user.generateAccessToken();

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });

  res.status(200).json(new ApiResponse(200, {}, "Access token refreshed"));
});

import crypto from "crypto";
import { sendMail } from "../utils/sendMail.js"; // (or any email utility you use)

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) throw new ApiError(400, "Email is required");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(resetToken).digest("hex");

  // Set to DB
  user.resetPasswordToken = hash;
  user.resetPasswordExpiry = Date.now() + 15 * 60 * 1000; // 15 mins
  await user.save({ validateBeforeSave: false });

  // Send email with link
  const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  await sendMail({
    to: user.email,
    subject: "Reset your password",
    text: `Click this link to reset your password: ${resetURL}`,
  });

  return res.status(200).json(new ApiResponse(200, null, "Reset link sent"));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) throw new ApiError(400, "Invalid or expired reset token");

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;

  await user.save();

  return res.status(200).json(new ApiResponse(200, null, "Password reset successful"));
});
export { registerUser, loginUser, logoutUser };