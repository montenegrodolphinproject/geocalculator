function getQueryVariable(variable) {
  var query = window.location.search.substring(1);
  var vars = query.split('&');
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split('=');
    if (decodeURIComponent(pair[0]) == variable) {
      return decodeURIComponent(pair[1]);
    }
  }
  console.log('Query variable %s not found', variable);
}

function getFlightplanfromQueryparams() {
  var from = getQueryVariable('from');
  var to = getQueryVariable('to');
  var fromLocation;
  var toLocation;

  if (typeof from === 'string') {
    var fromArray = from.split(',');
    fromLocation = {
      lat: Number(fromArray[0]),
      lng: Number(fromArray[1]),
    };
  }
  if (typeof to === 'string') {
    var toArray = to.split(',');
    toLocation = {
      lat: Number(toArray[0]),
      lng: Number(toArray[1]),
    };
  }
  return [fromLocation, toLocation];
}

function initMap() {
  var flightPlanCoordinates = getFlightplanfromQueryparams();

  var map = new google.maps.Map(document.getElementById('map'), {
    zoom: 14,
    center: flightPlanCoordinates[0],
    mapTypeId: 'terrain',
  });
  var flightPath = new google.maps.Polyline({
    path: flightPlanCoordinates,
    geodesic: true,
    strokeColor: '#FF0000',
    strokeOpacity: 1.0,
    strokeWeight: 2,
  });
  var markers = flightPlanCoordinates.forEach(function(loc, idx) {
    new google.maps.Marker({
      position: loc,
      map: map,
      icon: idx === 0 ? '/img/boat.png' : '/img/dolphin.png',
    });
  });

  flightPath.setMap(map);
}
