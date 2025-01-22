import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.models.js';
import {uploadOnCloudinary , deleteFromCloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/ApiResponse.js';


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



export {registerUser};