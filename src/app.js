import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"  // server se user ka browser ka cookie set aur use 
//cookie pe crud operation perform


const app = express()

// read cprs npm documentation
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials:true
}))         /// app.use()  for middleware and configurations

// data bahut jagah se aa raha hai uske ke liye best practices 

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))  /// assets rakhna
app.use(cookieParser())

export {app}