// tip : always add try catch and always db is in another continent to it takes time

import mongoose from "mongoose";
import {DB_NAME} from "../constants.js"

const connectDB = async () => {

    try {

        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

        console.log(`\n Connected to DB : ${connectionInstance.connection.host}`)

    }catch(error){
        console.log("Error in connecting to DB", error)
        process.exit(1)
    }
}

export default connectDB
