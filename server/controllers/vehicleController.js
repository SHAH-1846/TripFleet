const VehicleType = require("../db/models/vehicle_types");
const Vehicle = require("../db/models/vehicles");
const VehicleStatus = require("../db/models/vehicle_status");
const mongoose = require("mongoose");
const success_function = require("../utils/response-handler").success_function;
const error_function = require("../utils/response-handler").error_function;
const vehicleCreationValidator =
  require("../validations/vehicleValidations").vehicleCreationValidator;
const vehicleUpdateValidator =
  require("../validations/vehicleValidations").vehicleUpdateValidator;
const updateVehicleStatusValidator =
  require("../validations/vehicleValidations").updateVehicleStatusValidator;
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const vehicles = require("../db/models/vehicles");
dotenv.config();

exports.createVehicle = async (req, res) => {
  try {
    let user_id;

    const authHeader = req.headers["authorization"]
      ? req.headers["authorization"]
      : null;
    const token = authHeader ? authHeader.split(" ")[1] : null;

    if (
      token == null ||
      token == "null" ||
      token == "" ||
      token == "undefined"
    ) {
      let response = error_function({
        status: 400,
        message: "Please login to continue",
      });
      res.status(response.statusCode).send(response);
      return;
    }

    //verifying token
    jwt.verify(token, process.env.PRIVATE_KEY, async function (err, decoded) {
      if (err) {
        let response = error_function({
          status: 401,
          message: err.message,
        });
        res.status(401).send(response);
        return;
      } else {
        user_id = decoded.user_id;
      }
    });

    const { errors, isValid } = await vehicleCreationValidator(
      req.body,
      user_id
    );

    if (isValid) {
      const {
        vehicleNumber,
        vehicleType,
        brand,
        model,
        color,
        capacity,
        registrationYear,
      } = req.body;

      function normalizeVehicleNumber(vehicleNumber) {
        return vehicleNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(); // Removes -, space, etc.
      }

      let vehicle_number = normalizeVehicleNumber(vehicleNumber);

      const newVehicle = await Vehicle.create({
        user: user_id,
        vehicleNumber: vehicle_number,
        vehicleType,
        brand,
        model,
        color,
        capacity,
        registrationYear,
      });

      if (newVehicle) {
        let response = success_function({
          status: 201,
          data: newVehicle,
          message: "Vehicle registered successfully",
        });
        return res.status(response.statusCode).send(response);
      } else {
        let response = error_function({
          status: 400,
          message: "Vehicle registration failed",
        });
        return res.status(response.statusCode).send(response);
      }
    } else {
      let response = error_function({
        status: 400,
        message: "Validation failed",
      });
      response.errors = errors;
      return res.status(response.statusCode).send(response);
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      let response = error_function({
        status: 400,
        message: error
          ? error.message
            ? error.message
            : error
          : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    } else {
      console.log("Vehicle registration error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.updateVehicle = async (req, res) => {
  try {
    let user_id;

    const authHeader = req.headers["authorization"]
      ? req.headers["authorization"]
      : null;
    const token = authHeader ? authHeader.split(" ")[1] : null;

    if (
      token == null ||
      token == "null" ||
      token == "" ||
      token == "undefined"
    ) {
      let response = error_function({
        status: 400,
        message: "Please login to continue",
      });
      res.status(response.statusCode).send(response);
      return;
    }

    //verifying token
    jwt.verify(token, process.env.PRIVATE_KEY, async function (err, decoded) {
      if (err) {
        let response = error_function({
          status: 401,
          message: err.message,
        });
        res.status(401).send(response);
        return;
      } else {
        user_id = decoded.user_id;
      }
    });

    const { vehicleId } = req.params;

    const { errors, isValid } = await vehicleUpdateValidator(
      req.body,
      user_id,
      vehicleId
    );

    if (isValid) {
      const updateData = req.body;

      // Filter out empty values
      let updateFields = Object.fromEntries(
        Object.entries(req.body).filter(
          ([_, value]) => value !== "" && value !== null && value !== undefined
        )
      );

      //Formatting vehicleNumber
      if (req.body.vehicleNumber) {
        function normalizeVehicleNumber(vehicleNumber) {
          return vehicleNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(); // Removes -, space, etc.
        }

        let vehicle_number = normalizeVehicleNumber(updateData.vehicleNumber);
        updateFields.vehicleNumber = vehicle_number;
      }

      const updatedVehicle = await Vehicle.findByIdAndUpdate(
        vehicleId,
        { $set: updateFields },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedVehicle) {
        let response = error_function({
          status: 404,
          message: "Vehicle not found",
        });
        return res.status(response.statusCode).send(response);
      } else {
        let response = success_function({
          status: 200,
          data: updatedVehicle,
          message: "Vehicle updated successfully",
        });
        return res.status(response.statusCode).send(response);
      }
    } else {
      let response = error_function({
        status: 400,
        message: "Validation Failed",
      });
      response.errors = errors;
      return res.status(response.statusCode).send(response);
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      let response = error_function({
        status: 400,
        message: error
          ? error.message
            ? error.message
            : error
          : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    } else {
      console.log("Vehicles updation error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.updateVehicleStatus = async function (req, res) {
  try {
    let user_id;
    let vehicleId = req.params.vehicleId;

    const authHeader = req.headers["authorization"]
      ? req.headers["authorization"]
      : null;
    const token = authHeader ? authHeader.split(" ")[1] : null;

    if (
      token == null ||
      token == "null" ||
      token == "" ||
      token == "undefined"
    ) {
      let response = error_function({
        status: 400,
        message: "Please login to continue",
      });
      res.status(response.statusCode).send(response);
      return;
    }

    //verifying token
    jwt.verify(token, process.env.PRIVATE_KEY, async function (err, decoded) {
      if (err) {
        let response = error_function({
          status: 401,
          message: err.message,
        });
        res.status(401).send(response);
        return;
      } else {
        user_id = decoded.user_id;
      }
    });
    const { isValid, errors } = await updateVehicleStatusValidator(req.body, user_id, vehicleId);

    if (isValid) {
      // Check if vehicle exists
      const vehicle = await vehicles.findById(vehicleId);
      if (!vehicle) {
        let response = error_function({
          status: 404,
          message: "Vehicle not found",
        });
        return res.status(response.statusCode).send(response);
      } else {
        // Update vehicle status
        vehicle.status = req.body.status;
        await vehicle.save();

        let response = success_function({
          status: 200,
          data: vehicle,
          message: "Vehicle status updated successfully",
        });
        return res.status(response.statusCode).send(response);
      }
    } else {
      let response = error_function({
        status: 400,
        message: "Validation failed",
      });
      response.errors = errors;
      return res.status(response.statusCode).send(response);
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      let response = error_function({
        status: 400,
        message: error
          ? error.message
            ? error.message
            : error
          : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    } else {
      console.log("User types updation error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.getAllVehicles = async (req, res) => {
  try {
    const { vehicleType, status, search, user, vehicle } = req.query;

    let filter = {};

    //Validating vehicle
    if (vehicle) {
      if (!mongoose.Types.ObjectId.isValid(vehicle)) {
        let response = error_function({
          status: 400,
          message: "Vehicle must be a valid MongoDB ObjectId",
        });
        return res.status(response.statusCode).send(response);
      }
    }

    //Validating user
    if (user) {
      if (!mongoose.Types.ObjectId.isValid(user)) {
        let response = error_function({
          status: 400,
          message: "User must be a valid MongoDB ObjectId",
        });
        return res.status(response.statusCode).send(response);
      }
    }

    //Validating vehicle type
    if (vehicleType) {
      if (!mongoose.Types.ObjectId.isValid(vehicleType)) {
        let response = error_function({
          status: 400,
          message: "Vehicle type must be a valid MongoDB ObjectId",
        });
        return res.status(response.statusCode).send(response);
      }
    }

    //Validating vehicle status
    if (status) {
      if (!mongoose.Types.ObjectId.isValid(status)) {
        let response = error_function({
          status: 400,
          message: "Vehicle status must be a valid MongoDB ObjectId",
        });
        return res.status(response.statusCode).send(response);
      }
    }

    // Specific filters
    if (vehicle) filter._id = vehicle;
    if (user) filter.user = user;
    if (vehicleType) filter.vehicleType = vehicleType;
    if (status) filter.status = status;

    // Global search
    if (search) {
      filter.$or = [
        { vehicleNumber: { $regex: new RegExp(search, "i") } },
        { model: { $regex: new RegExp(search, "i") } },
        { brand: { $regex: new RegExp(search, "i") } },
        { color: { $regex: new RegExp(search, "i") } },
      ];
    }

    const vehicles = await Vehicle.find(filter)
      .populate("vehicleType", "-__v")
      .populate("status", "-__v")
      .populate("user", "-password -__v");

    if (vehicles) {
      let response = success_function({
        status: 200,
        data: vehicles,
        message: "Vehicles fetches successfully",
      });
      return res.status(response.statusCode).send(response);
    } else {
      let response = error_function({
        status: 404,
        message: "Vehicles not found",
      });
      return res.status(response).send(response);
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      let response = error_function({
        status: 400,
        message: error
          ? error.message
            ? error.message
            : error
          : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    } else {
      console.log("Vehicles listing error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

// List all vehicle types
exports.listVehicleTypes = async (req, res) => {
  try {
    const types = await VehicleType.find({ status: "active" }).select("-__v");

    if (types) {
      let response = success_function({
        status: 200,
        data: types,
        message: "Vehicle types retrieved successfully",
      });
      return res.status(response.statusCode).send(response);
    } else {
      let response = error_function({
        status: 404,
        message: "Vehicle types not found",
      });
      return res.status(response.statusCode).send(response);
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      let response = error_function({
        status: 400,
        message: error
          ? error.message
            ? error.message
            : error
          : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    } else {
      console.log("Vehicle types listing error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.listVehicleStatuses = async (req, res) => {
  try {
    const statuses = await VehicleStatus.find({}, { __v: 0 }).sort({ name: 1 });

    if (statuses) {
      let response = success_function({
        status: 200,
        data: statuses,
        message: "Vehicle statuses fetched successfully",
      });
      return res.status(response.statusCode).send(response);
    } else {
      let response = error_function({
        status: 404,
        message: "Vehicle statuses not found",
      });
      return res.status(response.statusCode).send(response);
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      let response = error_function({
        status: 400,
        message: error
          ? error.message
            ? error.message
            : error
          : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    } else {
      console.log("Vehicle status listing error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};
