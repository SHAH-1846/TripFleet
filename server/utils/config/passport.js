const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const users = require("../../db/models/users");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const dotenv = require("dotenv");
dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URI,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let firstName = profile.name.givenName;
        let lastName = profile.name.familyName;
        let email = profile.emails[0].value;
        let user = await users.findOne({ email });

        async function generateAndHashRandomPassword() {
          const randomPassword = crypto.randomBytes(20).toString("hex");
          const saltRounds = 10;
          const hashedPassword = await bcrypt.hash(randomPassword, saltRounds);
          return hashedPassword;
        }

        let password = await generateAndHashRandomPassword();

        if (!user) {
          user = await users.create({
            firstName,
            lastName,
            googleId: profile.id,
            email: profile.emails[0].value,
            password,
          });
        } else {
          if (!user.googleId) {
            // If not linked, update user to add googleId
            user.googleId = profile.id;
            await user.save();
          }

        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);
