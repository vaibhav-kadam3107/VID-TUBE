import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.models.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/ApiResponse.js';


const registerUser = asyncHandler(async (req, res) => {
    // how you want to register user

    const { fullName, email, userName, password } = req.body;

    //validation
    if(fullName?.trim() === '' || email?.trim() === '' || userName?.trim() === '' || password?.trim() === ''){
        throw new ApiError(400, 'Please fill all fields');
    }

    // is user already registered
    const existedUser = await User.findOne({
        $or: [{email}, {userName}]
    })
    if(existedUser){
        throw new ApiError(400, 'User already registered');
    }

    // handel the images
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImagesLocalPath = req.files?.coverImages[0]?.path;

    if(!avatarLocalPath || !coverImagesLocalPath){
        throw new ApiError(400, 'Please upload avatar and cover images');
    }

    // upload on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImages = await uploadOnCloudinary(coverImagesLocalPath)

    // create user
    const user = await User.create({
        fullName,
        email,
        userName: userName.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImages: coverImages?.url || ""
    })

    const createUser = await User.findById(user._id).select('-password', '-refreshToken');
    if(!createUser){
        throw new ApiError(500, 'User not created');
    }

    // user was created
    return res
        .status(201)
        .json(new ApiResponse(200, 'User created successfully'));

});


export {registerUser};