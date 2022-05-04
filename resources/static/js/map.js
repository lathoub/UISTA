// array of serice endpoints
serviceEndpoints = []

var serviceEndpoint = prompt("Enter SensorThings API endpoint", "http://aardvark.myDS.me/FROST-Server/v1.1");
serviceEndpoints.push({ "name": "test", "url": serviceEndpoint });

// Leaflet map initial view
let map = L.map('map').setView([0, 0], 12);

// Leaflet map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Layergroups allows for multiple Things to be at the same location
// and still be able to select them indivisually
let markersClusterGroup = L.markerClusterGroup().addTo(map);
markersClusterGroup.on("click", markerOnClick);

// var dictEndpoints
serviceEndpoints.forEach(function (endpoint) {

    var url = endpoint.url + "/Things?$expand=Locations,Datastreams($orderby=name asc)"
    console.log(url)

    fetch(url)
        .then(response => {
            if (!response.ok)
                throw new Error('Error ${response.ok} from get', { cause: response.message })
            return response.json()
        })
        .then(body => {
            // Convert the Locations into GeoJSON Features
            var geoJsonFeatures = body.value.map(function (thing) {
                var id = thing['@iot.id']
                if (isNaN(id))
                    id = "'" + id + "'"
                return {
                    type: 'Feature',
                    id: thing['@iot.id'],
                    resource: endpoint.url + "/Things(" + id + ")",
                    name: thing.name,
                    properties: thing.properties,
                    location: thing.Locations[0],   // cache location info
                    datastreams: thing.Datastreams, // cache Datastreams
                    geometry: thing.Locations[0].location,
                };
            });

            // Convert to geoJSON features (and add title for the tooltip )
            var geoJsonLayerGroup = L.geoJSON(geoJsonFeatures, {
                pointToLayer: function (feature, latlng) {
                    var marker = L.marker(latlng, {
                        title: feature.name,
                    });
                    return marker
                }
            }).addTo(markersClusterGroup);

            // Zoom in the map so that it fits the Things
            if (Object.keys(geoJsonLayerGroup._layers).length)
                map.fitBounds(geoJsonLayerGroup.getBounds())
        })
        .catch((error) => {
            alert(error)
        })
})

// Create empty chart. Observation will be added
// to the chart when the user click on the Marker and Datastream

// Display time as local time
Highcharts.setOptions({
    time: {
        useUTC: false
    }
});

let chart = new Highcharts.stockChart("chart", {
    xAxis: { type: "datetime" },
    series: []
});

// event handler that picks up on Marker clicks
function markerOnClick(event) {
    let thing = event.layer.feature;

    if (dictSelected[thing.id]) return;
    dictSelected[thing.id] = { "thing": thing, "datastreams": [] }

    var datastreamsHtml = ''
    thing.datastreams.forEach(function (datastream) {
        datastreamsHtml += '<label class="list-group-item">'
            + '<input class="form-check-input me-1" type="checkbox" value="" datastream="' + datastream["@iot.id"] + '">' + datastream.name
            + '<span class="p-0"></span>'
            + '<span class="badge bg-primary rounded-pill"></span>'
            + '</label>'

        var observationsUrl = datastream["@iot.selfLink"]

        console.log(observationsUrl)

        fetch(observationsUrl) // get last observation
            .then(response => {
                if (!response.ok)
                    throw new Error('Error ${response.ok} from get', { cause: response.message });
                return response.json()
            })
            .then(body => {
                var datastreamItem = getDatastreamItem(thing.id, datastream['@iot.id'])
                if (body && body.phenomenonTime) {
                    var phenomenonTimeInterval = body.phenomenonTime.split("/")
                    var toen = moment(phenomenonTimeInterval[phenomenonTimeInterval.length - 1])
                    datastreamItem.childNodes[2].textContent += " (" + body.unitOfMeasurement.symbol + ")"
                    datastreamItem.className = "list-group-item"
                    datastreamItem.childNodes[3].textContent = toen.fromNow()
                    datastreamItem.childNodes[3].className = "badge bg-primary rounded-pill float-end"
                } else {
                    datastreamItem.className = "list-group-item" // "list-group-item disabled"
                    datastreamItem.childNodes[2].textContent += " (" + body.unitOfMeasurement.symbol + ")"
                    datastreamItem.childNodes[3].textContent = "no data"
                    datastreamItem.childNodes[3].className = "badge bg-warning rounded-pill float-end"
                }
            })
            .catch((error) => {
                alert(error)
            })
    });

    var myCard = $('<div class="card card-outline-info" id="bbb">'
        + '<h5 class="card-header">'
        + '<span thingId="' + thing.id + '">' + thing.name + '</span>'
        + '<button type="button" class="btn-close btn-close-white float-end" aria-label="Close"></button>'
        + '</h5>'
        + '<div id="card-title" class="card-title">' + thing.location.name + ", " + thing.location.description
        + '</div>'
        + '<div class="list-group">'
        + datastreamsHtml
        + '</div>'
        + '</div>');
    myCard.appendTo('#contentPanel');

    $('.btn-close').on('click', function (e) {
        e.stopPropagation();

        const thingId = this.parentNode.childNodes[0].attributes['thingId'].value
        const thing = getThing(thingId)
        if (!thing) return // hmm, should already be selected 

        // remove from chart
        for (const datastreamId of dictSelected[thing.id].datastreams)
            chart.get(datastreamId)?.remove()

        // remove thing from selected things
        delete dictSelected[thing.id]

        var $target = $(this).parents('.card');
        $target.hide('fast', function () {
            $target.remove();
        });
    });

    $('.form-check-input').change(function (e) {
        // from UI
        const datastreamId = this.parentNode.childNodes[0].attributes['datastream'].value
        const thingId = this.parentNode.parentNode.parentNode.childNodes[0].childNodes[0].attributes['thingId'].value

        const thing = getThing(thingId)
        if (!thing) return // hmm, should already be selected 

        // get datastream from cached datastreams in Things
        const datastream = getDatastream(thing, datastreamId)
        if (!datastream) return // hmm, should already be selected 

        if ($(this).prop('checked')) {

            dictSelected[thing.id].datastreams.push(datastream["@iot.id"])

            var id = datastream['@iot.id']
            if (isNaN(id))
                id = "'" + id + "'"

            let observationsUrl = thing.resource + "/Datastreams(" + id + ")"
                + "/Observations"
                + "?$count=true"
                + "&$top=1000"
                + "&$resultFormat=dataArray" // request the more optimal dataArray for the results
                + "&$select=result,phenomenonTime"
                //         + "&$filter=phenomenonTime%20ge%20" + startDateTime.toISOString()
                + "&$orderby=phenomenonTime asc"

            console.log(observationsUrl)

            fetch(observationsUrl)
                .then(response => {
                    if (!response.ok)
                        throw new Error("errorke", { cause: response.status })
                    return response.json()
                })
                .then(observations => {
                    if (observations.value.length <= 0)
                        return

                    const components = observations.value[0].components
                    const dataArray = observations.value[0].dataArray
                    const it = components.indexOf("phenomenonTime")
                    const ir = components.indexOf("result")

                    const data = dataArray.map(function (observation) {
                        let timestamp = moment(observation[it]).valueOf();
                        let value = parseFloat(observation[ir])
                        return [timestamp, value];
                    });

                    chart.addSeries({
                        id: datastream["@iot.id"],
                        name: thing.name + '(' + thing.location.name + ')' + ", " + datastream.name,
                        data: data
                    })
                })
                .catch((error) => {
                    alert(error)
                })
        } else {
            // remove datastream id
            dictSelected[thing.id].datastreams = dictSelected[thing.id].datastreams.filter(function (value, index, arr) {
                return value != datastream["@iot.id"];
            });
            chart.get(datastream["@iot.id"]).remove();
        }
    })

    return;

}