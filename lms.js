const Request = require('request-promise');
const fs = require('fs');



class LMS {
  username;
  password;
  req;
  sessKey;
  events;

  constructor(username, password) {
    this.username = username;
    this.password = password;

    var cookieJar = Request.jar();
    this.req = Request.defaults({ jar: cookieJar });
  }

  async login() {
    // login to lms

    // get csrf token
    var res = await this.req.get("https://lms.thapar.edu/moodle/login/");
    var csrfToken = res.match(/name="logintoken" value="(.*)"/)[1];


    //start login
    var loginRes = await this.req.post("https://lms.thapar.edu/moodle/login/index.php", {
      form: {
        username: this.username,
        password: this.password,
        logintoken: csrfToken
      },
      resolveWithFullResponse: true,
      followAllRedirects: true
    });

    var sessKey = loginRes.body.match(/name="sesskey" value="(.*)"/)[1];
    this.sessKey = sessKey;
    console.log(sessKey);

  }

  async getCourses() {
    if (!this.sessKey) {
      throw new Error("Not logged in");
    } else {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const day = currentDate.getDate();

      var data = JSON.stringify(
        [
          {
            'index': 0,
            'methodname': 'core_calendar_get_calendar_monthly_view',
            'args': {
              'year': year,
              'month': month,
              'courseid': 1,
              'categoryid': 0,
              'includenavigation': true,
              'mini': true,
              'day': day,
            }
          }
        ]
      );
      var events = await this.req.post(`https://lms.thapar.edu/moodle/lib/ajax/service.php?sesskey=${this.sessKey}&info=core_calendar_get_calendar_monthly_view`, {
        body: data,
      });
      events = JSON.parse(events);



      events = events[0];
      events = events.data;
      events = events.weeks;

      var finalEvents = [];

      events.forEach(week => {
        // console.log(week);
        week.days.forEach(day => {
          day.events.forEach(e => {
            finalEvents.push({ id: e.id, name: e.name, cname: e.course.fullname, url: e.url, start: e.timestart, end: (e.timestart + e.timeduration) });
          });
        });

      });

      this.events = finalEvents;

      // return JSON.stringify(finalEvents);
      fs.writeFile('events.json', JSON.stringify(finalEvents), (err) => {
        if (err) {
          console.error('Error writing to file:', err);
        } else {
          console.log('Data has been written to the file.');
        }
      });


    }
  }

  getCurrentEvent(eventLst) {
    var current_time = new Date().getTime() / 1000;
    for (var i = 0; i < eventLst.length; i++) {
      if (eventLst[i]['start'] <= current_time && current_time <= eventLst[i]['end']) {
        return eventLst[i];
      }
    }
    return null;
  }


  async applyAttendance(code_qr) {
    // var events = require('./events'); // no need to add the .json extension
    var event = this.getCurrentEvent(this.events);
    if (event) {
      var link = event.url;
      console.log(link);
      var res = await this.req.get(link);
      var sessId = res.match(/name="sessid" value="(\d+)"/)[1];
      var final_aten = `https://lms.thapar.edu/moodle/mod/attendance/attendance.php?sessid=${sessId}&qrpass=${code_qr}`;

      var final_aten_res;

      try {
        final_aten_res = await this.req.get(final_aten);
      } catch (err) {
        console.error("Error response:");
        final_aten_res = err.response.body;
      }

      // return JSON.stringify(finalEvents);
      fs.writeFile('data.html', final_aten_res, (err) => {
        if (err) {
          console.error('Error writing to file:', err);
        } else {
          console.log('Data has been written to the file.');
        }
      });

      console.log("Attendance Lag Gyi!");
      // console.log(event);
    } else {
      console.log("No attendance event found");
    }
    // data = JSON.parse(data);
  }


}

module.exports = LMS;