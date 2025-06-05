import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

//syntax important
const registerUser = asyncHandler( async(req,res)=>{
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
  const {username,fullName,email,password}=req.body
  console.log("email: ",email);   // printed in terminal
  // step 2
  // map aur if se bhi kar sakte hai ek ek karke

  if(
    [fullName,email,username,password].some((field)=>
    field?.trim()==="")
  ){
     throw new ApiError(400,"All fields are required")
  }

  //step 3
  const existedUser = User.findOne({
    $or:[ {username} , {email}]
  })

  if(existedUser){
    throw new ApiError(409,"User with email or username already exist")
  }

  //step 4  it is on local servernot yet on cloudinary
  const avatarLocalPath = req.files?.avatar[0]?.path;         // multer fies access 
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is required")
  }

  //step 5 uplaod them to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if(!avatar){
    throw new ApiError(400,"Avatar file is required")
  }

  // step 6 object banake db main entry 
  //db se keval user baat kar raha hai
  const user = await User.create({
    fullName,
    avatar:avatar.url,
    coverImage:coverImage?.url || "",
    email,
    password,
    useranme: username.toLowerCase()
  })
 
  // user ka saara refrence aaya hai except password and refreshtoken
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if(!createdUser){
    throw new ApiError(500,"Something went wrong while registering the user")
  }

  // last step

  return res.status(201).json(
    new ApiResponse(200,createdUser,"Registered Succcessfully")
  )



})


export {registerUser}