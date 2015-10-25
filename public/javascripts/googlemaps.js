var introbox = $("#introbox");
introbox.on('click', function(e) {
    e.preventDefault();
    introbox.hide();
});

function determineWeekday() {
  var today = new Date();
  var weekday_integer = today.getDay(); // 0 for Sunday, 1 for Monday, etc
  var hour = today.getHours(); // 0 for midnight, 23:59 for 11:59pm

  // is it late night? food trucks might still be out from previous day
  if (hour >= 0 && hour < 4) {
    // is it sunday? rewinding one day needs to be 6, not -1
    if (weekday_integer === 0) {
      weekday_integer = 6;
    } else {
      weekday_integer -= 1;
    }
  }

  var weekdayMap = {
    0: "sunday",
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
    6: "saturday"
  };
  var weekday = weekdayMap[weekday_integer];
  return weekday;
}

function convertToAmPm(time) {
  var hour = time.split(":")[0]; // 12:00 => 12
  var min = time.split(":")[1]; // 12:00 => 00
  hour = parseInt(hour);

  var ampm;
  if (hour === 0) {
    hour = 12; // 0:00 => 12:00
    ampm = "am";
  } else if (hour === 12) {
    ampm = "pm";
  } else if (hour > 12) {
    hour -= 12; // 13:00 => 1:00
    ampm = "pm";
  } else {
    ampm = "am";
  }

  var converted_time = hour + ":" + min + ampm;
  return converted_time;
}

function foodtruckIsClosedHuh(open_time, close_time) {
  // var open_time = foodtruck.schedule[weekday][0].open; // "9:00"
  var open_hour = parseInt(open_time.split(":")[0]); // 9
  var open_min = parseInt(open_time.split(":")[1]); // 0

  // var close_time = foodtruck.schedule[weekday][0].close; // "17:30"
  var close_hour = parseInt(close_time.split(":")[0]); // 17
  var close_min = parseInt(close_time.split(":")[1]); // 30

  var now = new Date();
  var now_hour = now.getHours();

  var open = new Date().setHours(open_hour, open_min);
  var close = new Date().setHours(close_hour, close_min);

  // earliest any food truck opens is 6am.
  // latest any food truck closes is 4am.
  // for all food trucks that close after midnight,
  // weekday is set back one day.
  // must calculate current, open, and close times
  // based on that adjustment.
  // now could be 4:00-23:59, 0:00-3:59
  // open could be 4:00-23:59 // assumes no food truck opens after midnight
  // close could be 4:00-23:59, 0:00-3:59
  if (now_hour >= 4 && open_hour >= 4 && close_hour >= 4) {
    // if
      // now 4:00-23:59
      // &&
      // open 4:00-23:59
      // &&
      // close 4:00-23:59
    // now => today => 0
    // open => today => 0
    // close => today => 0

    // all good, do nothing

  } else if (now_hour < 4 && open_hour >= 4 && close_hour >= 4) {
    // if
      // now 0:00-3:59
      // &&
      // open 4:00-23:59
      // &&
      // close 4:00-23:59
    // now => today => 0
    // open => yesterday => -1
    // close => yesterday => -1
    open = new Date(open).setDate(now.getDate() -1);
    close = new Date(close).setDate(now.getDate() -1);

  } else if (now_hour >= 4 && open_hour >= 4 && close_hour < 4) {
    // if
      // now 4:00-23:59
      // &&
      // open 4:00-23:59
      // &&
      // close 0:00-3:59
    // now => today => 0
    // open => today => 0
    // close => tomorrow => +1
    close = new Date(close).setDate(now.getDate() +1);

  } else if (now_hour < 4 && open_hour >= 4 && close_hour < 4) {
    // if
      // now 0:00-3:59
      // &&
      // open 4:00-23:59
      // &&
      // close 0:00-3:59
    // now => today => 0
    // open => yesterday => -1
    // close => today => 0
    open = new Date(open).setDate(now.getDate() -1);

  } else {
    console.error("A food truck opening time may be after midnight. Or something went wrong.");
  }

  if (now >= open && now < close) {
    return false; // open now
  } else {
    return true; // closed now
  }
}

function generateDirectionsUrl(lat, lng) {
  // example
  // https://www.google.com/maps/dir/Current+Location/47.12345,-122.12345
  var directions = "https://www.google.com/maps/dir/Current+Location/" + lat + "," + lng;
  return directions;
}

function getFoodtrucks(map, infowindow) {
  $.ajax({
    type: "GET",
    url: '/api/foodtrucks',
    dataType: "json",
    success: function (res) {
      pinFoodtrucks(res, map, infowindow);
    }
  });
}

function pinFoodtrucks(foodtrucks, map, infowindow) {
  var weekday = determineWeekday();

  for (i = 0; i < foodtrucks.length; i++) {
    var lng = foodtrucks[i].schedule["" + weekday + ""][0].geometry.coordinates[0];
    var lat = foodtrucks[i].schedule["" + weekday + ""][0].geometry.coordinates[1];
    var latLng = new google.maps.LatLng(lat, lng);
    var name = foodtrucks[i].name;
    var cuisine = foodtrucks[i].cuisine;
    var payment = foodtrucks[i].payment.toLowerCase();
    var description = foodtrucks[i].description;
    var open = foodtrucks[i].schedule["" + weekday + ""][0].open;
    var open_ampm, close_ampm;
    if (open !== undefined) {
      open_ampm = convertToAmPm(open);
    } else {
      open_ampm = "";
    }
    var close = foodtrucks[i].schedule["" + weekday + ""][0].close;
    if (close !== undefined) {
      close_ampm = convertToAmPm(close);
    } else {
      close_ampm = "";
    }
    var address = foodtrucks[i].schedule["" + weekday + ""][0].address;
    var directions_url = generateDirectionsUrl(lat, lng);
    var directions_link = "<a href='" + directions_url + "' target='_blank'>Directions</a>";
    var facebook_url = foodtrucks[i].contact.facebook;
    var facebook_link = "<a href='" + facebook_url + "' target='_blank'>Facebook</a>";
    var twitter_url = foodtrucks[i].contact.twitter_link;
    var twitter_link = "<a href='" + twitter_url + "' target='_blank'>Twitter</a>";
    var website_url = foodtrucks[i].contact.website;
    var website_link = "<a href='" + website_url + "' target='_blank'>website</a>";

    // add way to only append urls if they are defined

    var content = "<div class='infowindow'><p>" + name + "</p><p>Cuisine: " + cuisine + "</p><p>Accepted payment: " + payment + "</p><p>" + description + "</p><p>Hours: " + open_ampm + " - " + close_ampm + "</p><p class='warning'>*** Location and hours may not be accurate. Check the schedule directly. ***</p>" + facebook_link + " - " + twitter_link + " - " + website_link + "<p>Address (approximate): " + address + "</p><p>" + directions_link + "</p></div>";

    var image;
    if (open !== undefined && close !== undefined) {
      var is_closed = foodtruckIsClosedHuh(open, close);
      if (is_closed === true) {
        image = 'images/foodtruck_closed.png';
      } else {
        image = 'images/foodtruck.png';
      }
    } else {
      image = 'images/foodtruck.png';
    }

    var marker = new google.maps.Marker({
      position: latLng,
      map: map,
      icon: image,
      content: content
    });

    marker.addListener('click', function(e) {
      infowindow.setContent(this.content);
      infowindow.open(map, this);
    });
  }
}

function getBreweries(map, infowindow) {
  $.ajax({
    type: "GET",
    url: '/api/breweries',
    dataType: "json",
    success: function (res) {
      pinBreweries(res, map, infowindow);
    }
  });
}

function pinBreweries(breweries, map, infowindow) {
  // var weekday = determineWeekday();

  for (i = 0; i < breweries.length; i++) {
    var lng = breweries[i].geometry.coordinates[0];
    var lat = breweries[i].geometry.coordinates[1];
    var latLng = new google.maps.LatLng(lat, lng);

    var name = breweries[i].name;
    var address = breweries[i].address;
    var directions_url = generateDirectionsUrl(lat, lng);
    var directions_link = "<a href='" + directions_url + "' target='_blank'>Directions</a>";
    // var facebook_url = breweries[i].contact.facebook;
    // var facebook_link = "<a href='" + facebook_url + "' target='_blank'>Facebook</a>";
    // var twitter_url = breweries[i].contact.twitter_link;
    // var twitter_link = "<a href='" + twitter_url + "' target='_blank'>Twitter</a>";
    // var website_url = breweries[i].contact.website;
    // var website_link = "<a href='" + website_url + "' target='_blank'>website</a>";

    var content = "<div class='infowindow'><p>" + name + "</p><p>Address: " + address + "</p><p>" + directions_link + "</p></div>";

    var image = 'images/brewery.png';

    var marker = new google.maps.Marker({
      position: latLng,
      map: map,
      icon: image,
      content: content
    });

    marker.addListener('click', function(e) {
      infowindow.setContent(this.content);
      infowindow.open(map, this);
    });
  }
}

function getDistilleries(map, infowindow) {
  $.ajax({
    type: "GET",
    url: '/api/distilleries',
    dataType: "json",
    success: function (res) {
      pinDistilleries(res, map, infowindow);
    }
  });
}

function pinDistilleries(distilleries, map, infowindow) {
  // var weekday = determineWeekday();

  for (i = 0; i < distilleries.length; i++) {
    var lng = distilleries[i].geometry.coordinates[0];
    var lat = distilleries[i].geometry.coordinates[1];
    var latLng = new google.maps.LatLng(lat, lng);

    var name = distilleries[i].name;
    var address = distilleries[i].address;
    var directions_url = generateDirectionsUrl(lat, lng);
    var directions_link = "<a href='" + directions_url + "' target='_blank'>Directions</a>";
    // // var facebook_url = distilleries[i].contact.facebook;
    // // var facebook_link = "<a href='" + facebook_url + "' target='_blank'>Facebook</a>";
    // var twitter_url = distilleries[i].contact.twitter_link;
    // var twitter_link = "<a href='" + twitter_url + "' target='_blank'>Twitter</a>";
    // var website_url = distilleries[i].contact.website;
    // var website_link = "<a href='" + website_url + "' target='_blank'>website</a>";

    var content = "<div class='infowindow'><p>" + name + "</p><p>Address: " + address + "</p><p>" + directions_link + "</p></div>";

    var image = 'images/distillery.png';

    var marker = new google.maps.Marker({
      position: latLng,
      map: map,
      icon: image,
      content: content
    });

    marker.addListener('click', function(e) {
      infowindow.setContent(this.content);
      infowindow.open(map, this);
    });
  }
}

function initMap() {
  var map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: {lat: 47.6097, lng: -122.3331}
  });

  var infowindow = new google.maps.InfoWindow({});

  getFoodtrucks(map, infowindow);
  getBreweries(map, infowindow);
  getDistilleries(map, infowindow);
}
