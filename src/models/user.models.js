import mongoose , { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// https://app.eraser.io/workspace/YtPqZ1VogxGy1jzIDkzj -  ERD

const userSchema = new Schema({

    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    fullname: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar: {
        type: String,
        required: true
    },
    coverImage: {
        type: String,
        required: true
    },
    watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    password: {
        type: String,
        required: [true, "Password is required"],
    },
    refreshToken: {
        type: String
    }

}, {timestamps: true})

// encrypt the password before saving the user
userSchema.pre("save", async function(next) {
    if(this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
})

// compare the password
userSchema.methods.isPasswordCorrect = async function(password) {
    return bcrypt.compare(password, this.password);
}

// generate the access token
userSchema.methods.generateAccessToken = function() {
    return jwt.sign({id: this._id, email : this.email, username: this.username, fullname: this.fullname}, process.env.ACCESS_JWT_SECRET, {expiresIn: process.env.ACCESS_TOKEN_EXPIRY});
}

// generate the refresh token
userSchema.methods.generateRefreshToken = function() {
    return jwt.sign({id: this._id}, process.env.REFRESH_JWT_SECRET, {expiresIn: process.env.REFRESH_TOKEN_EXPIRY});
}

export const User = mongoose.model("User", userSchema);