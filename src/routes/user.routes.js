import {Router} from "express"
import { logoutUser,loginUser,registerUser } from "../controllers/user.controller.js"
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
//
const router = Router()

router.route("/register").post(
    upload.fields([             //// middleware inject multer ab aap images bhej paoge
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)

// secured routes
router.route("/logout").post(verifyJWT,logoutUser)    // verifyJWTis the middleware

export default router
