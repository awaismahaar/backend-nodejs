import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import userModel from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await userModel.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Error generating access token and refresh token");
  }
};

export const registerUser = asyncHandler(async (req, res) => {
  const { fullname, username, email, password } = req.body;
  if (
    [fullname, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  const existedUser = await userModel.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(400, "Username or email already exists");
  }
  console.log("Files", req.files);

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(404, "No avatar found");
  }
  const avatar = await uploadToCloudinary(avatarLocalPath);
  const coverImage = await uploadToCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(500, "Error in uploading avatar");
  }
  const user = await userModel.create({
    fullname,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });
  const createdUser = await userModel
    .findById(user?._id)
    .select("-password -refreshToken");
  if (!createdUser) {
    throw new ApiError(500, "Error in creating user");
  }
  res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User Register Successfully"));
});

export const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if (!(username || email)) {
    throw new ApiError(404, "username or email is required");
  }
  const user = await userModel.findOne({
    $or: [{ username: username?.toLowerCase() }, { email }],
  });
  if (!user) {
    throw new ApiError(401, "User not found");
  }
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid Credentials");
  }
  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);
  const loggedInUser = await userModel
    .findById(user._id)
    .select("-password -refreshToken");
  let options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("access_token", accessToken, options)
    .cookie("refresh_token", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { loggedInUser, accessToken, refreshToken },
        "User Logged In Successfully"
      )
    );
});

export const logoutUser = asyncHandler(async (req, res) => {
  await userModel.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { refreshToken: undefined },
    },
    { new: true }
  );
  const options = { httpOnly: true, secure: true };
  return res
    .status(200)
    .clearCookie("access_token", options)
    .clearCookie("refresh_token", options)
    .json(new ApiResponse(200, {}, "User Logged Out Successfully"));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies?.refresh_token || req.body?.refresh_token;
    if (!incomingRefreshToken) {
      throw new ApiError(401, "Refresh token is required");
    }
    const decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await userModel.findById(decoded?._id);
    if (!user || !user.refreshToken) {
      throw new ApiError(401, "Refresh token is invalid");
    }
    if (user.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Refresh token is expired");
    }
    const { accessToken, refreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);
    const options = { httpOnly: true, secure: true };
    return res
      .status(200)
      .cookie("access_token", accessToken, options)
      .cookie("refresh_token", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(500, "Error in refresh token");
  }
});
