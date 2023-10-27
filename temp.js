var LMS = require("./lms");

var lms = new LMS("pagrawal1_be22@thapar.edu", "SHA6129#lms");

void async function() {
  await lms.login();
  var crs = await lms.getCourses();
  console.log(crs);
  // await lms.loadSavedEvents();
}();
