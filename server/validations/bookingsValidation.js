const isEmpty = require("./is_empty");
const users = require("../db/models/users");
const customer_requests = require("../db/models/customer_requests");
const bookings = require("../db/models/bookings");
const booking_status = require("../db/models/booking_status");
const { Types } = require("mongoose");
const trips = require("../db/models/trips");

exports.createBookingValidator = async function (
  data,
  userId,
  tripId,
  customerRequestId
) {
  try {
    let errors = {};

    data = !isEmpty(data) ? data : "";
    userId = !isEmpty(userId) ? userId : "";
    tripId = !isEmpty(tripId) ? tripId : "";
    customerRequestId = !isEmpty(customerRequestId) ? customerRequestId : "";

    if (isEmpty(data)) {
      errors.data = "Please complete all the required fields to continue";
    } else {
      if (isEmpty(userId)) {
        errors.user = "Please login to continue";
      } else if (!Types.ObjectId.isValid(userId)) {
        errors.user = "Invalid user ID";
      } else if (isEmpty(tripId)) {
        errors.trip = "TripId is required";
      } else if (!Types.ObjectId.isValid(tripId)) {
        errors.trip = "Invalid trip ID";
      } else if (isEmpty(customerRequestId)) {
        errors.customerRequest = "Customer request is required";
      } else if (!Types.ObjectId.isValid(customerRequestId)) {
        errors.customerRequest = "Invalid customer request ID";
      } else {
        const user = await users.findById(userId);
        const trip = await trips.findById(tripId);
        const customerRequest = await customer_requests.findById(
          customerRequestId
        );
        const booking = await bookings.findOne({
          customerRequest: customerRequestId,
        });

        if (!user) {
          errors.user = "User not found";
        } else if (!trip) {
          errors.trip = "Trip not found";
        } else if (!customerRequest) {
          errors.customerRequest = "Customer request not found";
        } else if (user._id.toString() !== customerRequest.user.toString()) {
          //Checking if the customer request is created by login user or not, if not then not allowed for booking, customers only are allowed to book a trip
          errors.user = "Not allowed";
        } else if (booking) {
          errors.booking = "Already booked";
        }
      }
    }

    return {
      errors,
      isValid: isEmpty(errors),
    };
  } catch (error) {
    console.log("Error validating booking : ", error);
  }
};

exports.updateBookingStatusValidator = async function (data, user_id) {
  try {
    let errors = {};

    data = !isEmpty(data) ? data : "";
    let statusId = !isEmpty(data.status) ? data.status : "";
    let bookingId = !isEmpty(data.booking) ? data.booking : "";

    if (isEmpty(data)) {
      errors.data = "Please complete all required fields to continue";
    } else {
      //Validating user
      if (!user_id) {
        errors.user = "Please login to continue";
      } else if (!Types.ObjectId.isValid(user_id)) {
        errors.user = "User must be a valid MongoDB ObjectId";
      }

      //Validating booking
      if (bookingId) {
        if (!Types.ObjectId.isValid(bookingId)) {
          errors.booking = "Booking must be a valid MongoDB ObjectId";
        } else {
          const booking = await bookings.findById(bookingId);
          if (!booking) {
            errors.booking = "Booking does not exist";
          }
        }
      } else {
        errors.booking = "Booking is required";
      }

      //Validating booking status
    if (statusId) {
      if (!Types.ObjectId.isValid(statusId)) {
        errors.status = "Booking status must be a valid MongoDB ObjectId";
      } else {
        const status = await booking_status.findById(statusId);
        if (!status) {
          errors.status = "Booking status does not exist";
        }
      }
    } else {
      errors.status = "Booking status is required";
    }

    }

    return {
      errors,
      isValid: isEmpty(errors),
    };
  } catch (error) {
    console.log("Vehicle status updation validation error : ", error);
  }
};
