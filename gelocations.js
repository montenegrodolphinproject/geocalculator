#!/usr/bin/env node

const { exec } = require('child_process');
console.log = function(msg) {
  process.stdout.write(`${msg}\n`);
};

/** Extend Number object with method to convert numeric degrees to radians */
if (Number.prototype.toRadians === undefined) {
  Number.prototype.toRadians = () => this * Math.PI / 180;
}

/** Extend Number object with method to convert radians to numeric (signed) degrees */
if (Number.prototype.toDegrees === undefined) {
  Number.prototype.toDegrees = () => this * 180 / Math.PI;
}

function LatLon(lat, lon) {
  // allow instantiation without 'new'
  if (!(this instanceof LatLon)) return new LatLon(lat, lon);

  this.lat = Number(lat);
  this.lon = Number(lon);
}

LatLon.prototype.destinationPoint = function(distance, angle, radius) {
  radius = radius === undefined ? 6371e3 : Number(radius);
  const toDegrees = num => num * 180 / Math.PI;
  const toRadians = num => num * Math.PI / 180;

  // sinφ2 = sinφ1⋅cosδ + cosφ1⋅sinδ⋅cosθ
  // tanΔλ = sinθ⋅sinδ⋅cosφ1 / cosδ−sinφ1⋅sinφ2
  // see http://williams.best.vwh.net/avform.htm#LL

  var angularDistance = Number(distance) / radius; // angular distance in radians
  var bearing = toRadians(Number(angle));

  var φ1 = toRadians(this.lat);
  var λ1 = toRadians(this.lon);

  var sinLat = Math.sin(φ1),
    cosLat = Math.cos(φ1);
  var sinDist = Math.sin(angularDistance),
    cosDist = Math.cos(angularDistance);
  var sinBearing = Math.sin(bearing),
    cosBearing = Math.cos(bearing);

  var sinLat2 = sinLat * cosDist + cosLat * sinDist * cosBearing;
  console.log(sinLat2);
  var φ2 = Math.asin(sinLat2);

  console.log(φ2);
  // var y = sinBearing * sinDist * cosLat;
  // var x = cosDist - sinLat * sinLat2;
  var λ2 =
    λ1 + Math.atan2(sinBearing * sinDist * cosLat, cosDist - sinLat * sinLat2);

  return new LatLon(toDegrees(φ2), (toDegrees(λ2) + 540) % 360 - 180); // normalise to −180..+180°
};
const ll = LatLon(41.924477, 19.2105454);
const newLoc = ll.destinationPoint(500, 180);

exec(
  `open http://maps.google.com/maps?q=loc:${newLoc.lat},${newLoc.lon}`,
  (err, stdout, stderr) => {
    if (err) {
      // node couldn't execute the command

      console.log(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  },
);
