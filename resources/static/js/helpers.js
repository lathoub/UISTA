var dictSelected = {}

function getThingCard(id) {
    var contentPanel = document.getElementById("contentPanel")
    for (const thingCard of contentPanel.childNodes) {
        var headerItem = thingCard.childNodes[0]
        var thingSpan = headerItem.childNodes[0]
        if (thingSpan.attributes['thingId'].value == id)
            return thingCard
    }
    console.log("getThingCard returned null")
    return null
}

function getDatastreamItem(thingId, datastreamId) {
    var thingCard = getThingCard(thingId)
    if (thingCard) {
        var listGroup = thingCard.childNodes[2]
        for (const datastreamItem of listGroup.childNodes)
            if (datastreamItem.childNodes[0].attributes['datastream'].value == datastreamId)
                return datastreamItem
    }
    console.log("getDatastreamItem returned null")
    return null
}

function getThing(id) {
    var thingProxy = dictSelected[id]
    if (!thingProxy)
        return null
    return thingProxy.thing
}

function getDatastream(thing, id) {
    for (const datastream of thing.datastreams) {
        if (datastream["@iot.id"] == id)
            return datastream
    }
    return null
}

function getDatastreamFromId(thing, id) {
    for (const datastream of thing.datastreams) {
        if (datastream["@iot.id"] == id)
            return datastream
    }
    return null
}