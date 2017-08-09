function LatLon(lat, lon) {
  // allow instantiation without 'new'
  if (!(this instanceof LatLon)) return new LatLon(lat, lon);

  this.lat = Number(lat);
  this.lon = Number(lon);
}

// http://www.movable-type.co.uk/scripts/latlong.html

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
function stringToNumber(str) {
  return Number(str.match(/\d+/)[0]);
}

function getMapUrlById(id) {
  var data = WORKBOOK.json[id];

  return (
    '/map?from=' +
    searchForKey(data, 'latitude') +
    ',' +
    searchForKey(data, 'longitude') +
    '&to=' +
    data['lat'] +
    ',' +
    data['lon']
  );
}
// print as html
function to_html(workbook) {
  var el = document.querySelector('.content');
  el.innerHTML = '';
  var result = [];
  workbook.SheetNames.forEach(function(sheetName) {
    try {
      var htmlstr = XLSX.utils.sheet_to_html(workbook.Sheets[sheetName], {
        header: '<div class="table">',
        footer: '</div>',
      });
      el.innerHTML += htmlstr;
    } catch (e) {
      console && console.error(e);
    }
  });

  var table = document.getElementsByTagName('table')[0];

  if (table) {
    table.addEventListener('click', function(e) {
      if (e.target && e.target.nodeName == 'TD') {
        console.log(stringToNumber(e.target.id));
        window.open(getMapUrlById(stringToNumber(e.target.id) - 2), '_blank');
      }
    });
  }
}

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

function s2ab(s) {
  var buf = new ArrayBuffer(s.length);
  var view = new Uint8Array(buf);
  for (var i = 0; i != s.length; ++i) view[i] = s.charCodeAt(i) & 0xff;
  return buf;
}
var rABS = true; // true: readAsBinaryString ; false: readAsArrayBuffer

function searchForKey(row, str) {
  var k = Object.keys(row).filter(function(k) {
    if (k.toLowerCase().indexOf(str) > -1) return k;
  })[0];
  return row[k];
}

function calculateAndEnrichData(rows) {
  return rows.map(function(row) {
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
}

function export_to_excel(type, wb) {
  var wb = window.WORKBOOK;
  var wbout = XLSX.write(wb.wb, {
    bookType: type,
    bookSST: true,
    type: 'binary',
  });
  try {
    saveAs(
      new Blob([s2ab(wbout)], { type: 'application/octet-stream' }),
      `${new Date().getTime()}_${wb.name}`,
    );
  } catch (e) {
    if (typeof console != 'undefined') console.log(e, wbout);
  }
  return wbout;
}

function doit(type) {
  return export_to_excel(type || 'xlsx', window.WORKBOOK);
}

function process_wb(wb, name) {
  /* Get worksheet */
  var worksheet = wb.Sheets[wb.SheetNames[0]];
  /* Get json */
  var json = XLSX.utils.sheet_to_json(worksheet);
  var enrichedJson = calculateAndEnrichData(json);
  /* replace wokbook sheetdata with enriched version */
  wb.Sheets[wb.SheetNames[0]] = XLSX.utils.json_to_sheet(enrichedJson);
  /* publish workbook globally to download later*/
  window.WORKBOOK = {
    name: name,
    wb: wb,
    json: enrichedJson,
  };
  /* print as html */
  to_html(wb);
}

function handleFile(e) {
  var files = e.target.files;
  var i, f;
  for (i = 0; i != files.length; ++i) {
    f = files[i];
    var reader = new FileReader();
    var name = f.name;
    var reader = getReaderForFile(f);
    reader.readAsBinaryString(f);
  }
}

var uploadButton = document.getElementById('file-1-input');
uploadButton.addEventListener('change', handleFile, false);

var use_worker = false;
var drop = document.getElementById('drop');
function handleDrop(e) {
  e.stopPropagation();
  e.preventDefault();
  var files = e.dataTransfer.files;
  var f = files[0];
  var reader = getReaderForFile(f);
  if (rABS) reader.readAsBinaryString(f);
  else reader.readAsArrayBuffer(f);
}

function getReaderForFile(file) {
  var reader = new FileReader();
  var name = file.name;
  reader.onload = function(e) {
    if (typeof console !== 'undefined')
      console.log('onload', new Date(), rABS, use_worker);
    var data = e.target.result;
    var wb;
    if (rABS) {
      wb = XLSX.read(data, { type: 'binary' });
    } else {
      var arr = fixdata(data);
      wb = XLSX.read(btoa(arr), { type: 'base64' });
    }
    process_wb(wb, name);
  };
  return reader;
}

function handleDragover(e) {
  e.stopPropagation();
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
}

if (drop.addEventListener) {
  drop.addEventListener('dragenter', handleDragover, false);
  drop.addEventListener('dragover', handleDragover, false);
  drop.addEventListener('drop', handleDrop, false);
}
