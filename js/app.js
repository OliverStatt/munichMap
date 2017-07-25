// an Array of preset locations. A location contains LatLong and a title
var locations = [{
        title: "Mc Donalds",
        position: {
            lat: 48.161567,
            lng: 11.588543
        }
    },
    {
        title: "Ruff Burger",
        position: {
            lat: 48.161591,
            lng: 11.589599
        }
    },
    {
        title: "Schwabinger 7",
        position: {
            lat: 48.161272,
            lng: 11.589483
        }
    },
    {
        title: "China Express Restaurant",
        position: {
            lat: 48.160453,
            lng: 11.586371
        }
    },
    {
        title: "Vanilla Lounge",
        position: {
            lat: 48.162077,
            lng: 11.585814
        }
    }
];

var map;
var myInfoWindow;
var geocoder;

// initializes the google map, then invokes createMarkers(), then getInfo() for every marker to get additional Information through a 3rd party API
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {
            lat: 48.162577,
            lng: 11.58728
        },
        zoom: 12
    });
    createMarkers();
    myViewModel.markersArray().forEach(function(marker) {
        getInfo(marker);
    });
    myInfoWindow = new google.maps.InfoWindow();

    geocoder = new google.maps.Geocoder();
}
// displays an error if the google map api couldt not be loaded
function gMapError() {
    $("#map").css("text-align", "center");
    $("#map").html("<h3>error: map could not be loaded :(</h3>");
    $("#list").prepend("<h3>error: could not load data");
}

// creates a new marker for every location in the locations array. every marker gets a click event and a visibility observable. then every marker is saved in an observable Array
function createMarkers() {
    locations.forEach(function(location) {
        var marker = new google.maps.Marker({
            position: location.position,
            title: location.title,
            map: map
        });
        marker.addListener('click', function() {
            myViewModel.clicked(marker);
        });
        marker.visibility = ko.observable("true");
        var pushMarker = true;
        for (var i = 0; i < myViewModel.markersArray().length; i++) {
            if (myViewModel.markersArray()[i].position.lat() === marker.position.lat() && myViewModel.markersArray()[i].position.lng() === marker.position.lng()) {
                pushMarker = false;
            }
        }
        if (pushMarker) { // only push when not found in array before
            myViewModel.markersArray.push(marker);
        } else {
            marker.setMap(null);
        }
    });
}
/*
 makes an ajax request to the foursquare API to get additional information to a location.
 @param {object} marker - a marker, to which additional information should be displayed
 takes the latlong and the title of the marker object to make the ajax request to foursquare
 if the ajax request is successful, the new information gets saved in the marker object
*/
function getInfo(marker) {
    var lat = marker.getPosition().lat();
    var lng = marker.getPosition().lng();
    var clientID = 'B0K1OPRZ0Z54TWEKIE102UO0X3H3EHQGX1XLGEDQ4TJW0FY2';
    var client_secret = 'LS4HFFWYJPTKLKVQAS5XYM5GY3QPVSH1LA50E1T4JWZ0YIM0';
    var query = marker.title;

    var url = 'https://api.foursquare.com/v2/venues/search?ll=' + lat + ',' + lng + '&query=' + query + '&client_id=' + clientID + '&client_secret=' + client_secret + '&v=20170409';

    $.ajax({
        url: url,
        method: 'GET',
        dataType: 'json',
        success: function(data) {
            marker.formattedAddress = data.response.venues[0].location.formattedAddress || "no address available";
            marker.categorie = data.response.venues[0].categories[0].name || "no categorie available";
            marker.altName = data.response.venues[0].name || "no data available";
            if (myViewModel.filterOptions().indexOf(marker.categorie) === -1) {
                myViewModel.filterOptions.push(marker.categorie);
            }
        },
        error: function() {
            marker.formattedAddress = "could not load data";
            marker.categorie = "could not load data";
            marker.altName = "could not load data";

        }
    });
}



function geocodeAddress(geocoder, resultsMap, address) {
    geocoder.geocode({ 'address': address }, function(results, status) {
        if (status === 'OK') {
            var newLocation = {};
            newLocation.position = {};
            newLocation.title = address;
            newLocation.position.lat = results[0].geometry.location.lat();
            newLocation.position.lng = results[0].geometry.location.lng();
            locations.push(newLocation);
            createMarkers();
            var currentMarker = myViewModel.markersArray()[myViewModel.markersArray().length - 1];
            getInfo(currentMarker);
            console.log(results[0].geometry.location.lat());
        } else {
            alert("Diese Addresse wurde nicht gefunden!");
        }
    });
}

$("#addLocationButton").click(function() {
    var newLocation = $("#newLocation").val();
    if (newLocation) {
        geocodeAddress(geocoder, map, newLocation);
    }
});


var ViewModel = function() {
    var self = this;
    this.markersArray = ko.observableArray([]); // saves the google map markers
    this.filterOptions = ko.observableArray([]); // entries to the filter list droptdown menue
    this.filtered = false; // if false, no filter has been applied to the list
    this.buttonText = ko.observable("filter"); // label of the button, that applies the filter to the list
    this.errorMessage = ko.observable();

    /* if a marker on the map or the corresponding location on the list view gets clicked on, this function is invoked.
      @param {object} - can have a marker object as parameter
    */
    this.clicked = function(marker) {
        var clickedMarker;
        marker ? (clickedMarker = marker) : (clickedMarker = this); // when an item on the list is clicked, this function will be invoked without parameter --> 'this' will be used instead of a marker parameter
        map.setCenter(clickedMarker.getPosition());
        clickedMarker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function() {
            clickedMarker.setAnimation(null);
        }, 1400);
        myInfoWindow.setContent(clickedMarker.altName + "<br>" + clickedMarker.formattedAddress + "<br>" + "Kategorie: " + clickedMarker.categorie);
        myInfoWindow.open(map, clickedMarker); // opens a google maps infowindow with additional information
    };
    this.selection = ko.observable();
    /* gets invoked when the filter button is clicked. if the list view is already filtered, the filter will be removed and all elements will be made visible again.
      if the list view is not filtered, every marker and the corresponding element in the list view on which the filter applies on, will be made invisible.
    */
    this.buttonClicked = function() {
        if (self.filtered) {
            self.filtered = false;
            self.markersArray().forEach(function(marker) {
                marker.setVisible(true);
                marker.visibility(true);
            });
            self.buttonText("filter");
            return;
        }
        self.markersArray().forEach(function(marker) {
            if (!marker.categorie.includes(self.selection())) {
                marker.setVisible(false); // makes the markers on the map invisible
                marker.visibility(false); // makes the elements in the list view invisible
            }
        });
        self.buttonText("remove filter"); // when list view is filtered, button text of the filter button gets changed
        self.filtered = true;
    };

};

var myViewModel = new ViewModel();
ko.applyBindings(myViewModel);