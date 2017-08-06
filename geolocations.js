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

  var angularDistance = parseInt(distance, 10) / radius; // angular distance in radians
  var bearing = toRadians(parseInt(angle, 10));

  if (
    typeof angularDistance !== 'number' ||
    typeof bearing !== 'number' ||
    typeof this.lat !== 'number' ||
    typeof this.lon !== 'number'
  ) {
    return this;
  }

  var φ1 = toRadians(this.lat);
  var λ1 = toRadians(this.lon);

  var sinLat = Math.sin(φ1),
    cosLat = Math.cos(φ1);
  var sinDist = Math.sin(angularDistance),
    cosDist = Math.cos(angularDistance);
  var sinBearing = Math.sin(bearing),
    cosBearing = Math.cos(bearing);

  var sinLat2 = sinLat * cosDist + cosLat * sinDist * cosBearing;
  var φ2 = Math.asin(sinLat2);
  // var y = sinBearing * sinDist * cosLat;
  // var x = cosDist - sinLat * sinLat2;
  var λ2 =
    λ1 + Math.atan2(sinBearing * sinDist * cosLat, cosDist - sinLat * sinLat2);

  return new LatLon(toDegrees(φ2), (toDegrees(λ2) + 540) % 360 - 180); // normalise to −180..+180°
};

/* processing array buffers, only required for readAsArrayBuffer */
function fixdata(data) {
  var o = '',
    l = 0,
    w = 10240;
  for (; l < data.byteLength / w; ++l)
    o += String.fromCharCode.apply(
      null,
      new Uint8Array(data.slice(l * w, l * w + w)),
    );
  o += String.fromCharCode.apply(null, new Uint8Array(data.slice(l * w)));
  return o;
}

var rABS = true; // true: readAsBinaryString ; false: readAsArrayBuffer

var searchForKey = (row, str) => {
  var k = Object.keys(row).filter(k => {
    if (k.toLowerCase().indexOf(str) > -1) return k;
  })[0];
  return row[k];
};
/* fixdata and rABS are defined in the drag and drop example */
function handleFile(e) {
  var files = e.target.files;
  var i, f;
  for (i = 0; i != files.length; ++i) {
    f = files[i];
    var reader = new FileReader();
    var name = f.name;
    reader.onload = function(e) {
      var data = e.target.result;

      var workbook;
      if (rABS) {
        /* if binary string, read with type 'binary' */
        window.x = workbook = XLSX.read(data, { type: 'binary' });
      } else {
        /* if array buffer, convert to base64 */
        var arr = fixdata(data);
        window.x = workbook = XLSX.read(btoa(arr), { type: 'base64' });
      }

      /* Get worksheet */
      var worksheet = workbook.Sheets[workbook.SheetNames[0]];
      var newJson = XLSX.utils.sheet_to_json(worksheet).map(row => {
        const lat = Number(searchForKey(row, 'latitude'));
        const lon = Number(searchForKey(row, 'longitude'));
        const location = LatLon(lat, lon);

        return {
          ...row,
          ...location.destinationPoint(
            searchForKey(row, 'distance'),
            searchForKey(row, 'angle'),
          ),
        };
      });

      workbook.Sheets[workbook.SheetNames[0]] = XLSX.utils.json_to_sheet(
        newJson,
      );

      var wopts = { bookType: 'xlsx', bookSST: false, type: 'binary' };

      var wbout = XLSX.write(workbook, wopts);

      function s2ab(s) {
        var buf = new ArrayBuffer(s.length);
        var view = new Uint8Array(buf);
        for (var i = 0; i != s.length; ++i) view[i] = s.charCodeAt(i) & 0xff;
        return buf;
      }

      /* the saveAs call downloads a file on the local machine */
      saveAs(
        new Blob([s2ab(wbout)], { type: 'application/octet-stream' }),
        `${new Date().getTime()}_${name}`,
      );
    };
    reader.readAsBinaryString(f);
  }
}
document.getElementById('upload').addEventListener('change', handleFile, false);
