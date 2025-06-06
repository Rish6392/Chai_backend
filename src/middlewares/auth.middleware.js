// Authentication middleware 
// verify karega ki user hai ya nhi hai 

import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model";


export const verifyJWT = asyncHandler(async (req, res,    // res=>_ can be written in this way
    next) => {
    try {
        const token = req.cookies?.accessToken || req.header
            ("Authorization").replace("Bearer ", "")

        if (!token) {
            throw new ApiError(401, "Unauthorised request")
        }

        const decodedToken = jwt.verify(token, process.env.
            ACCESS_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id).
            select("-passowrd -refreshtoken")

        if (!user) {
            // todo : discuss about frontend
            throw new ApiError(401, "Invalid Access Token")
        }

        req.user = user;
        next()
    }
    catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access token")
    }

})