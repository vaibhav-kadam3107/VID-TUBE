import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Initialize Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;
        const result = await cloudinary.uploader.upload(localFilePath, {resource_type: "auto"});
        console.log("File uploaded on cloudinary. File src - " + result.url);
        // once uploaded, delete the file from local storage
        fs.unlinkSync(localFilePath);
        return result;

    } catch (error) {
        console.log("Error uploading file on cloudinary. Error - " + error);
        fs.unlinkSync(localFilePath);
        return null;
    }
};

export { uploadOnCloudinary }; 