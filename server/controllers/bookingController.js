const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Trip = require("../db/models/trips");
const CustomerRequest = require("../db/models/customer_requests");
const Booking = require("../db//models/bookings");
const success_function = require("../utils/response-handler").success_function;
const extractUserIdFromToken = require("../utils/utils").extractUserIdFromToken;
const error_function = require("../utils/response-handler").error_function;
const createBookingValidator =
  require("../validations/bookingsValidation").createBookingValidator;
const updateBookingStatusValidator =
  require("../validations/bookingsValidation").updateBookingStatusValidator;
const dotenv = require("dotenv");
const bookings = require("../db//models/bookings");
dotenv.config();

exports.bookTripForCustomerRequest = async (req, res) => {
  try {
    const { tripId, customerRequestId } = req.body;

    // Authenticate user from token
    const authHeader = req.headers["authorization"] || null;
    const token = authHeader ? authHeader.split(" ")[1] : null;

    if (!token || token === "null" || token === "undefined") {
      let response = error_function({
        status: 401,
        message: "Please login to continue",
      });
      return res.status(response.statusCode).send(response);
    }

    let userId;
    jwt.verify(token, process.env.PRIVATE_KEY, (err, decoded) => {
      if (err) {
        return res.status(401).send(
          error_function({
            status: 401,
            message: err.message,
          })
        );
      }
      userId = decoded.user_id;
    });

    const { errors, isValid } = await createBookingValidator(
      req.body,
      userId,
      tripId,
      customerRequestId
    );

    if (isValid) {
      const trip = await Trip.findById(tripId);
      const customerRequest = await CustomerRequest.findById(customerRequestId);

      if (!trip || !customerRequest) {
        return res.status(404).send(
          error_function({
            status: 404,
            message: "Trip or customer request not found",
          })
        );
      }

      customerRequest.status = "684da120412825ef8b404712"; // Change to "pending" from "open"
      await customerRequest.save();

      // Create booking
      const booking = await Booking.create({
        trip: trip._id,
        customerRequest: customerRequest._id,
        user: userId,
        status: "685084f96bd3cba167bd01a1", // "pending"
      });

      if (booking) {
        return res.status(200).send(
          success_function({
            status: 200,
            message: "Trip successfully booked for customer request",
            data: booking,
          })
        );
      } else {
        return res.status(400).send(
          error_function({
            status: 400,
            message: "Booking Failed",
          })
        );
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
      console.log("Booking error: ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.listBookings = async (req, res) => {
  try {
    const {
      userId,
      tripId,
      customerRequestId,
      status, // BookingStatusId
      startDate, // ISO or YYYY-MM-DD
      endDate, // ISO or YYYY-MM-DD
      page = 1,
      pageSize = 10,
    } = req.query;

    const filters = {};

    // ObjectId Validations
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filters.user = userId;
    } else if (userId) {
      return res.status(400).send(
        error_function({
          status: 400,
          message: "Invalid userId format",
        })
      );
    }

    if (tripId && mongoose.Types.ObjectId.isValid(tripId)) {
      filters.trip = tripId;
    } else if (tripId) {
      return res.status(400).send(
        error_function({
          status: 400,
          message: "Invalid tripId format",
        })
      );
    }

    if (
      customerRequestId &&
      mongoose.Types.ObjectId.isValid(customerRequestId)
    ) {
      filters.customerRequest = customerRequestId;
    } else if (customerRequestId) {
      return res.status(400).send(
        error_function({
          status: 400,
          message: "Invalid customerRequestId format",
        })
      );
    }

    if (status && mongoose.Types.ObjectId.isValid(status)) {
      filters.status = status;
    } else if (status) {
      return res.status(400).send(
        error_function({
          status: 400,
          message: "Invalid status ID format",
        })
      );
    }

    // Date filters (based on bookedAt)
    if (startDate || endDate) {
      filters.bookedAt = {};
      if (startDate) filters.bookedAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filters.bookedAt.$lte = end;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const total = await Booking.countDocuments(filters);

    const bookings = await Booking.find(filters)
      .populate("trip user customerRequest status", "-password -__v")
      .sort({ bookedAt: -1 })
      .skip(skip)
      .limit(parseInt(pageSize));

    return res.status(200).send(
      success_function({
        status: 200,
        message: "Bookings fetched successfully",
        data: {
          count: total,
          totalPages: Math.ceil(total / pageSize),
          currentPage: parseInt(page),
          bookings,
        },
      })
    );
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
      console.log("Error listng bookings : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const userId = extractUserIdFromToken(req);
    if (!userId) {
      return res
        .status(401)
        .send(error_function({ status: 401, message: "Unauthorized" }));
    }

    const myBookings = await Booking.find({ user: userId })
      .populate("trip customerRequest status", "-__v")
      .sort({ createdAt: -1 });

    return res.status(200).send(
      success_function({
        status: 200,
        message: "My bookings fetched successfully",
        data: myBookings,
      })
    );
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
      console.log("My bookings error: ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.updateBookingStatus = async function (req, res) {
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
    const { isValid, errors } = await updateBookingStatusValidator(
      req.body,
      user_id
    );

    if (isValid) {
      let bookingId = req.body.booking;
      let statusId = req.body.status;

      const updatedBooking = await bookings.findOneAndUpdate(
        { _id: bookingId },
        { $set: { status: statusId } }
      );

      if (updatedBooking) {
        //Change the status of custoemer_request also
        const customer_request_data = await CustomerRequest.findById(
          updatedBooking.customerRequest
        );
        const statusMap = {
          "685084f96bd3cba167bd01a2": "684da129412825ef8b404713", // active
          "685084f96bd3cba167bd01a3": "684da13e412825ef8b404715", // pickedUp
          "685084f96bd3cba167bd01a4": "684da149412825ef8b404716", // delivered
          "685084f96bd3cba167bd01a6": "684da154412825ef8b404717", // cancelled
        };

        if (statusMap[statusId]) {
          customer_request_data.status = statusMap[statusId];
          await customer_request_data.save();
        }
        await customer_request_data.save();

        let response = success_function({
          status: 200,
          message: "Booking status updated",
          data: updatedBooking,
        });
        return res.status(response.statusCode).send(response);
      } else {
        let response = error_function({
          status: 400,
          message: "Status updation failed",
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
      console.log("Booking status updation error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};
