import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../middlewares/async.js";

const healthCheck = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, "success", "Heath Check - Server is running"));
})

export { healthCheck }