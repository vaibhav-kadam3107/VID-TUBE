import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.models.js';
import {uploadOnCloudinary , deleteFromCloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';


// const registerUser = asyncHandler(async (req, res) => {
//     // how you want to register user

//     const { fullname, email, userName, password } = req.body;

//     //validation
//     if(fullname?.trim() === '' || email?.trim() === '' || userName?.trim() === '' || password?.trim() === ''){
//         throw new ApiError(400, 'Please fill all fields');
//     }

//     // is user already registered
//     const existedUser = await User.findOne({
//         $or: [{email}, {userName}]
//     })
//     if(existedUser){
//         throw new ApiError(400, 'User already registered');
//     }

//     // handel the images
//     const avatarLocalPath = req.files?.avatar?.[0]?.path;
//     const coverImagesLocalPath = req.files?.coverImages?.[0]?.path;

//     if(!avatarLocalPath || !coverImagesLocalPath){
//         throw new ApiError(400, 'Please upload avatar and cover images');
//     }

//     // upload on cloudinary
//     // const avatar = await uploadOnCloudinary(avatarLocalPath)
//     // const coverImages = await uploadOnCloudinary(coverImagesLocalPath)

//     // create user
//     const user = await User.create({
//         fullname,
//         email,
//         userName: userName.toLowerCase(),
//         password,
//         avatar: avatar.url,
//         coverImages: coverImages?.url || ""
//     })

//     const createUser = await User.findById(user._id).select('-password', '-refreshToken');
//     if(!createUser){
//         throw new ApiError(500, 'User not created');
//     }

//     // user was created
//     return res
//         .status(201)
//         .json(new ApiResponse(200, 'User created successfully'));

// });

const registerUser = asyncHandler(async (req, res) => {
    const { fullname, email, username, password } = req.body;

    if ([fullname, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;

    let coverImageLocalPath;
    if (req.files?.coverImage?.[0]?.path) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath
        ? await uploadOnCloudinary(coverImageLocalPath)
        : { url: "https://example.com/default-cover-image.jpg" }; // Default image

    if (!avatar) {
        throw new ApiError(400, "Failed to upload avatar");
    }

    try {
        const user = await User.create({
            fullname,
            avatar: avatar.url,
            coverImage: coverImage.url, // Always assign a valid value
            email,
            password,
            username: username.toLowerCase(),
        });
    
        const createdUser = await User.findById(user._id).select("-password -refreshToken");
    
        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while registering the user");
        }
    
        return res.status(201).json(
            new ApiResponse(200, createdUser, "User registered successfully")
        );
    } catch (error) {
        console.log("user registration error: ", error);

        if(avatar){
            await deleteFromCloudinary(avatar.public_id);
        }
        if(coverImage){
            await deleteFromCloudinary(coverImage.public_id);
        }

        throw new ApiError(500, "Something went wrong while registering the user and images were deleted");
    }
});

const loginUser = asyncHandler(async (req, res) =>{
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const {email, username, password} = req.body
    console.log(email);

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }
    
    // Here is an alternative of above code based on logic discussed in video:
    // if (!(username || email)) {
    //     throw new ApiError(400, "username or email is required")
        
    // }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

   const isPasswordValid = await user.isPasswordCorrect(password)

   if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials")
    }

   const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

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
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )

})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
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
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})


export {registerUser , loginUser, logoutUser, refreshAccessToken};