var dictSelected = {}

function getThingCard(thingName) {
    var contentPanel = document.getElementById("contentPanel")
    for (const thingCard of contentPanel.childNodes) {
        var headerItem = thingCard.childNodes[0]
        var thingItem = headerItem.childNodes[0]
        if (thingItem.textContent == thingName)
            return thingCard
    }
    console.log("getThingCard returned null")
    return null
}

function getDatastreamItem(thingName, datastreamName) {
    var thingCard = getThingCard(thingName)
    if (thingCard) {
        var listGroup = thingCard.childNodes[2]
        for (const datastreamItem of listGroup.childNodes)
            if (datastreamItem.childNodes[1].textContent == datastreamName)
                return datastreamItem
    }
    console.log("getDatastreamItem returned null")
    return null
}

function getThing(name) {
    var thingProxy = dictSelected[name]
    if (!thingProxy) return null
    return thingProxy.thing
}

function getDatastream(thing, name) {
    for (const datastream of thing.datastreams) {
        if (datastream.name == name)
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