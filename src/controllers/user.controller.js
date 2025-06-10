import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

/// generate Access and RefreshToken
// It’s typically called after a user is successfully authenticated (like after login).
const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    //accessToken user ko de do 
    //refresh token ko database main bhi save karna hai
    // Saves the refresh token in the database. 
    // This is important for validating future refresh requests (like during token refresh).
    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })  /// imp

    return { accessToken, refreshToken }
  }
  catch (error) {
    throw new ApiError(500, "Something went wrong while generating refresh and access token ")
  }
}



//syntax important(Register User)
const registerUser = asyncHandler(async (req, res) => {
  ///get user deatils from frontend
  //validation-not empty
  //cheque if user already exist:username,email
  //cheque for images,cheque for avatar
  //upload them to cloudinary,avatar
  //create user object - create entry in db
  //remove password and refresh token field from response
  //cheque for user creation
  //return res

  // step 1
  const { username, fullName, email, password } = req.body
  // console.log("email: ",email);   // printed in terminal
  // step 2
  // map aur if se bhi kar sakte hai ek ek karke

  if (
    [fullName, email, username, password].some((field) =>
      field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required")
  }

  //step 3
  const existedUser = await User.findOne({
    $or: [{ username }, { email }]
  })

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exist")
  }
  //console.log(req.files);  imp

  //step 4  it is on local servernot yet on cloudinary
  const avatarLocalPath = req.files?.avatar[0]?.path;         // multer fies access 
  //const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.
    coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")
  }

  //step 5 uplaod them to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required")
  }

  // step 6 object banake db main entry 
  //db se keval user baat kar raha hai
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  })

  // user ka saara refrence aaya hai except password and refreshtoken
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user")
  }

  // last step

  return res.status(201).json(
    new ApiResponse(200, createdUser, "Registered Succcessfully")
  )



})



// login User
const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  // username or email
  //find the user
  //password check
  //access and refresh token
  // send cookie

  // step 1 
  const { email, username, password } = req.body
  console.log(email);
  // step 2
  if (!username && !email) {
    throw new ApiError(400, "username or email is required")
  }

  //step 3  Find User in Database
  const user = await User.findOne({  // findOne mongoose ke/se aaya hai
    $or: [{ username }, { email }]
  })

  if (!user) {    // user not registered
    throw new ApiError(404, "User does not exist")
  }

  // step 4  // khud ka user banaya hua 
  // Checks if the given password matches the user's stored (hashed) password.
  // isPasswordCorrect() is a custom method defined in the User model.
  const isPasswordValid = await user.isPasswordCorrect(password) // isPasswordCorrect from model (user)
  if (!isPasswordValid) {    // user not registered
    throw new ApiError(401, "Password Incorrect")
  }


  ///step 5 generate access token and the refresh token
  // Generates JWT tokens (access & refresh) using the user’s ID.
  // generateAccessAndRefereshTokens is a helper function you likely defined elsewhere.
  //Why?

  //After verifying credentials, you must authenticate the user by issuing tokens.
  //These tokens are then:
  //Sent to the frontend in cookies.
  //Used in future requests to prove identity.

  // Taki tumko bar bar login na karna pade ****************************************************IMP*******************************

  const { refreshToken, accessToken } =
    await generateAccessAndRefereshTokens(user._id)


  //Fetches the user data again from the database,
  //excluding password and refresh token for security.
  const loggedInUser = await User.findById(user._id).
    select("-password -refreshToken")

  // step 6 cookie main bhejo
  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser, accessToken,
          refreshToken
        },
        "User logged In Successfully"
      )
    )
})


//// logout User
// This logoutUser function is an Express controller for securely logging a user out of your application. 
// It clears the JWT cookies and removes the stored refresh token from the database.

//logoutUser handles secure user logout by:
//Clearing the stored refresh token in the database.
//Deleting cookies from the client.
//This ensures the user is fully logged out and cannot re-authenticate without logging in again.
const logoutUser = asyncHandler(async (req, res) => {
  //Step 1:  Remove Refresh Token from DB
  User.findByIdAndUpdate(
// Finds the user by their ID (req.user._id) – assuming the user is already authenticated via middleware.
//Removes the stored refresh token from the database by setting it to undefined.
//This helps invalidate the refresh token so it can't be used again to get a new access token.
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true
    }
  )

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)        // Deletes the cookies from the client’s browser by clearing both:
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"))
})


/// refresh access token ka endpoint
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request")
  }

  try {
    const decodedToken = jwt.verify(   // decoded token milega
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )

    const user = await User.findById(decodedToken?._id)

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token")
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used")
    }

    const options = {
      httpOnly: true,
      secure: true
    }

    const { accessToken, newrefreshToken } =
      await generateAccessAndRefereshTokens(user._id)

    return res.status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newrefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newrefreshToken },
          "Access token refreshed"
        )
      )
  }
  catch (error) {
    throw new ApiError(401, error?.message ||
      "Invalid refresh Token"
    )
  }


})


export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken
}