function jsonAnalysis(json){
    let waypoints = [];
    let tracks = [];
    json.features.forEach(feature => {
        if(feature.geometry.type === "Point"){
            waypoints.push(feature)
        }else if(feature.geometry.type === "LineString"){
            tracks.push(feature)
        }
    });
    return {
        waypoints,
        tracks
    }
}
//Get current position
const successLocation = (position) => {
    setupMap([position.coords.longitude, position.coords.latitude])
}
const errroLocation = (err) => {
    console.warn(`Impossibile prendere la posizione corrente (${err.code}): ${err.message}`);
    setupMap([41.117143, 16.871871])
}
navigator.geolocation.getCurrentPosition(successLocation, errroLocation, {enableHighAccuracy:true})


//Generate Map with Mapbox
let map = null;
function setupMap(position){
    mapboxgl.accessToken = 'pk.eyJ1IjoibWFudWVsbWFubmEiLCJhIjoiY2wzdWE1ZzZ4MDBlYzNqbDgyazljbml3diJ9.D7lwXQ7YZ4sUBif0Yggcgw';
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: position,
        zoom: 8
    });
}


//Parse GPX to JSON
let gpx = new gpxParser();
fetch("./static/gpx/example2.gpx")
    .then(response => response.text())
    .then(data => gpx.parse(data))
    .then(g => gpx.toGeoJSON())

    .then(json => jsonAnalysis(json))
    .then(json => {
        const coordinates = json.tracks[0].geometry.coordinates;
        if(map){
            map.on('load', () => {
                //Add track on map
                map.addSource('route', {
                    'type': 'geojson',
                    'data': {
                        'type': 'Feature',
                        'properties': {},
                        'geometry': json.tracks[0].geometry
                    }
                });
                map.addLayer({
                    'id': 'route',
                    'type': 'line',
                    'source': 'route',  
                    'layout': {
                        'line-join': 'round',
                        'line-cap': 'round'
                    },
                    'paint': {
                        'line-color': getRandomColor(),
                        'line-width': 8
                    }
                });
            
                //Add START/END markers on map
                new mapboxgl.Marker({ color: 'red'})
                .setLngLat(coordinates[0])
                .addTo(map);
                
                new mapboxgl.Marker({ color: 'red'})
                .setLngLat(coordinates[(coordinates.length - 1)])
                .addTo(map);

                //Add waypoints on map
                json.waypoints.forEach(waypoint => {
                    console.log(waypoint)

                    const popup = new mapboxgl.Popup({ 
                        offset: 25,
                        closeOnMove: true,
                        closeOnClick: true,
                        closeButton: false,
                        className: "popup"
                    })
                    if(waypoint.properties){
                        popup.setHTML(`
                        ${waypoint.properties.cmt ? `<a href="${waypoint.properties.cmt}" target="_blank"><h2>${waypoint.properties.name}</h2></a>` : `<h2>${waypoint.properties.name}</h2>`}
                        <p>${waypoint.properties.desc}</p>
                        `);
                    }
                    
                    
                    new mapboxgl.Marker({ color: 'blue'})
                    .setLngLat(waypoint.geometry.coordinates)
                    .setPopup(popup)
                    .addTo(map);
                });
            })
        }else{
            console.error("La mappa non è stata ancora caricata")
        }
        

        //Create bounds
        const bounds = new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]);
        for (const coord of coordinates) {
            bounds.extend(coord);
        }
        return bounds
    })

    //Move map to bounds
    .then(bounds  => { 
        map.fitBounds(bounds, {
            padding: 20
        });
    });

function getRandomColor() {
    let letters = '0123456789ABCDEF';
    let color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}