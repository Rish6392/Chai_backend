import {Router} from "express"
import { logoutUser,loginUser,registerUser,refreshAccessToken} from "../controllers/user.controller.js"
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
//
const router = Router()

router.route("/register").post(
    upload.fields([             //// middleware inject multer ab aap images bhej page
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
router.route("/logout").post(verifyJWT,logoutUser)    // verifyJWT is the middleware

router.route("/refresh-token").post(refreshAccessToken)

export default router
