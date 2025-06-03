const path = require("path");
const fs = require("fs");
const disposableDomains = require("disposable-email-domains");
const EMAILS_FILE_PATH = path.join(
  __dirname,
  "disposable_email_blacklist.conf"
);

exports.isDisposableEmail = function (email) {
  try {
    const domain = email.split("@")[1].toLowerCase();
    return disposableDomains.includes(domain);
  } catch (error) {
    console.log("Problem validating disposable email : ", error);
    return;
  }
};

exports.isTemporaryEmail = function (email) {
  try {
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) return false;

    const domainList = fs
      .readFileSync(EMAILS_FILE_PATH, "utf-8")
      .split("\n")
      .map((d) => d.trim().toLowerCase());

    return domainList.includes(domain);
  } catch (error) {
    console.log("Problem validating temporary email : ", error);
    return;
  }
};
