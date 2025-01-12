import jwt from "jsonwebtoken";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import userModel from "../models/user.model.js";

const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.access_token ||
      req.header("Authorization")?.startsWith("Bearer ").split(" ")[1];
    if (!token) {
      throw new ApiError(404, "Access token missing");
    }
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await userModel
      .findById(decoded._id)
      .select("-password -refreshToken");
    if (!user) {
      throw new ApiError(404, "Invalid AccessToken");
    }
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(500, "Invalid AccessToken");
  }
});

export { verifyJWT };
