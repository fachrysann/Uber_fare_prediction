// ----------------------
// Initialize the map
// ----------------------
var map = L.map('map').setView([40.7128, -74.0060], 12);

// ----------------------
// NYC boundary GeoJSON
// ----------------------
var nycOuterBoundary = {
    "type": "Feature",
    "properties": {"name": "New York City"},
    "geometry": {
        "type": "Polygon",
        "coordinates": [[
            [-73.91896298001514, 40.91953367586091],
            [-73.7507725228253, 40.87230145590103],
            [-73.76106989775528, 40.84529647637295],
            [-73.78097815595326, 40.826594272342476],
            [-73.78097815595326, 40.81152477116139],
            [-73.70340459814732, 40.75173270276329],
            [-73.70752354811933, 40.73092284589932],
            [-73.72811829797932, 40.71999506489763],
            [-73.72537233133131, 40.678869723296856],
            [-73.72939874094784, 40.664390642294514],
            [-73.72253382432785, 40.65188912564372],
            [-73.74278532835685, 40.64667946894695],
            [-73.76612604486482, 40.61801908757871],
            [-73.74038260753983, 40.60368428393291],
            [-73.75857463658282, 40.572397675508526],
            [-73.7618091585312, 40.532904612455276],
            [-73.90734539087507, 40.49636353426769],
            [-73.98972439031496, 40.516202590567346],
            [-74.22107208040876, 40.47651860995723],
            [-74.26226158012872, 40.49792998890819],
            [-74.25539666350872, 40.52090045488089],
            [-74.24853174688873, 40.545950171091384],
            [-74.23411542198676, 40.56107983633654],
            [-74.21969909708477, 40.55742816118087],
            [-74.20734224716877, 40.59080749025055],
            [-74.19979083888677, 40.6022777885039],
            [-74.20459628052076, 40.630423813111435],
            [-74.18537451398478, 40.64918124159052],
            [-74.12427675606685, 40.64397137349093],
            [-74.08308725634687, 40.652827907268616],
            [-74.0556275898669, 40.65543254645214],
            [-74.02748035480424, 40.702819212504856],
            [-74.0132808892989, 40.762498162393335],
            [-73.97243463540994, 40.81344653819269],
            [-73.95422622178786, 40.850073998643296],
            [-73.92997258208202, 40.890236475489125],
            [-73.91900465981077, 40.91864628507031]
        ]]
    }
};

// ----------------------
// Add NYC boundary to the map but keep reference for toggle
// ----------------------
var nycLayer = L.geoJSON(nycOuterBoundary, {
    style: {
        color: '#000000',     // Black border
        weight: 10,           // Thickness
        opacity: 1,
        fillColor: 'transparent',
        fillOpacity: 0,
        lineCap: 'square',
        lineJoin: 'square',
        dashArray: '10, 20'   // Dash pattern: 10px dash, 10px gap
    }
});

// ----------------------
// Toggle button control
// ----------------------
var toggleControl = L.Control.extend({
    options: {
        position: 'bottomright' // bottom-right corner
    },
    onAdd: function(map) {
        var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        container.style.backgroundColor = 'white';
        container.style.padding = '8px 12px';
        container.style.cursor = 'pointer';
        container.style.borderRadius = '6px';
        container.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        container.innerHTML = 'Toggle NYC Border';

        // 🔴 Prevent click/scroll from propagating to the map
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        container.onclick = function() {
            if (map.hasLayer(nycLayer)) {
                map.removeLayer(nycLayer);
            } else {
                nycLayer.addTo(map);
            }
        };

        return container;
    }
});

// ----------------------
// Add toggle button to map
// ----------------------
map.addControl(new toggleControl());

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

var pickupMarker, dropoffMarker, routeLine, outerLine;
var pickupSelected = false, dropoffSelected = false;
var predictionMade = false;

// ----------------------
// Draw route if available
// ----------------------
if (ROUTE_COORDS && ROUTE_COORDS.length >= 2) {
    const latlngs = ROUTE_COORDS;

    // Remove existing route line if present
    if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
    }

    if (outerLine) {
        map.removeLayer(outerLine);
        outerLine = null;
    }
    // Draw the polyline
    routeLine = L.polyline(latlngs, {
        color: '#000000',
        weight: 12,
        opacity: 1,
    }).addTo(map);

    // Draw the polyline
    outerLine = L.polyline(latlngs, {
        color: '#ffffff',
        weight: 4,
        opacity: 1,
    }).addTo(map);


    // Fit map to route bounds
    map.fitBounds(routeLine.getBounds(), {
        padding: [30, 30],
        maxZoom: 16
    });

    // Fit map to route bounds
    map.fitBounds(outerLine.getBounds(), {
        padding: [30, 30],
        maxZoom: 16
    });

    // Pickup marker
    if (!pickupSelected) {
        pickupMarker = L.marker(latlngs[0], { draggable: true }).addTo(map)
            .bindPopup(`<div class="popup-content"><h6><i class="fas fa-circle text-success"></i> Pickup Location</h6><button onclick='resetPickup()' class='btn btn-sm btn-outline-danger mt-2'><i class="fas fa-trash"></i> Remove</button></div>`);
        pickupSelected = true;
        pickupMarker.on('dragend', function() {
            if (!predictionMade) {
                const pos = pickupMarker.getLatLng();
                document.getElementById('pickup_lat').value = pos.lat.toFixed(6);
                document.getElementById('pickup_lon').value = pos.lng.toFixed(6);
                updateLocationStatus();
            }
        });
    } else {
        pickupMarker.setLatLng(latlngs[0]);
    }
    document.getElementById('pickup_lat').value = latlngs[0][0].toFixed(6);
    document.getElementById('pickup_lon').value = latlngs[0][1].toFixed(6);

    // Dropoff marker
    if (!dropoffSelected) {
        dropoffMarker = L.marker(latlngs[latlngs.length - 1], { draggable: true }).addTo(map)
            .bindPopup(`<div class="popup-content"><h6><i class="fas fa-map-pin text-danger"></i> Destination</h6><button onclick='resetDropoff()' class='btn btn-sm btn-outline-danger mt-2'><i class="fas fa-trash"></i> Remove</button></div>`);
        dropoffSelected = true;
        dropoffMarker.on('dragend', function() {
            if (!predictionMade) {
                const pos = dropoffMarker.getLatLng();
                document.getElementById('dropoff_lat').value = pos.lat.toFixed(6);
                document.getElementById('dropoff_lon').value = pos.lng.toFixed(6);
                updateLocationStatus();
            }
        });
    } else {
        dropoffMarker.setLatLng(latlngs[latlngs.length - 1]);
    }
    document.getElementById('dropoff_lat').value = latlngs[latlngs.length - 1][0].toFixed(6);
    document.getElementById('dropoff_lon').value = latlngs[latlngs.length - 1][1].toFixed(6);

    lockMarkers();
    updateLocationStatus();

    // Bind popup for distance info if available
    if (DISTANCE_KM) {
        routeLine.bindPopup(`
            <div class="popup-content text-center">
                <h6><i class="fas fa-route"></i> Route Information</h6>
                <p><strong>Distance:</strong> ${DISTANCE_KM}</p>
                <small class="text-muted">Use "Start New Trip" to modify</small>
            </div>
        `);
    }
}

// ----------------------
// Set today's date as default
// ----------------------
const dateInput = document.getElementById('date');
if (dateInput && CURRENT_DATE) {
    dateInput.value = CURRENT_DATE;
}

function createCustomUberMarker(latlng, type = 'pickup') {
    let shapeSVG = '';

    if (type === 'pickup') {
        // Outer blue circle with inner white circle
        shapeSVG = `
            <circle cx="12.5" cy="12.5" r="10" fill="#000000" />
            <circle cx="12.5" cy="12.5" r="3" fill="white" />
        `;
    } else if (type === 'dropoff') {
        // Outer red square with inner white square
        shapeSVG = `
            <rect x="2.5" y="2.5" width="20" height="20" fill="#000000" />
            <rect x="9.5" y="9.5" width="6" height="6" fill="white" />
        `;
    }

    return L.marker(latlng, {
        draggable: true,
        icon: L.icon({
            iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                <svg width="25" height="25" viewBox="0 0 25 25" xmlns="http://www.w3.org/2000/svg">
                    ${shapeSVG}
                </svg>`),
            iconSize: [25, 25],
            iconAnchor: [12, 12], // center of shape
            popupAnchor: [0, -12]
        })
    });
}

// ----------------------
// scroll functions
// ----------------------
function scrollToResultsSection() {
    const container = document.querySelector('.left-panel') || document.scrollingElement || document.documentElement;
    const target = document.getElementById('results-section');
    if (!target || !container) return;

    const header = document.querySelector('.sticky-header'); 
    const headerHeight = header ? header.offsetHeight : 0;

    const scrollTop = target.offsetTop - headerHeight;
    container.scrollTo({ top: scrollTop});
}

function scrollToResultsWhenReady() {
    let attempts = 0;
    const maxAttempts = 100;  // Add a limit
    const interval = setInterval(() => {
        attempts++;
        const resultsSection = document.getElementById('results-section');
        if (resultsSection || attempts >= maxAttempts) {
            clearInterval(interval);
            if (resultsSection) {
                requestAnimationFrame(() => scrollToResultsSection());
            }
        }
    }, 50);
}

function scrollToTop() {
    const container = document.querySelector('.left-panel');
    if (container) container.scrollTo({ top: 0});
    else window.scrollTo({ top: 0});
}

function scrollToBottom() {
    const container = document.querySelector('.left-panel');
    if (container) container.scrollTo({ top: container.scrollHeight});
    else window.scrollTo({ top: document.body.scrollHeight});
}

// ----------------------
// Progress tracking
// ----------------------
function updateProgress() {
    const steps = ['step-locations', 'step-schedule', 'step-passengers', 'step-estimate'];
    const pickupLat = document.getElementById('pickup_lat').value;
    const dropoffLat = document.getElementById('dropoff_lat').value;
    const date = document.getElementById('date').value;
    const hour = document.getElementById('hour').value;
    const passengerCount = document.getElementById('passenger_count').value;

    // Reset all steps
    steps.forEach(stepId => {
        const step = document.getElementById(stepId);
        step.classList.remove('active', 'completed');
    });

    let currentStep = 0;

    if (pickupLat && dropoffLat) {
        document.getElementById('step-locations').classList.add('completed');
        currentStep = 1;
    }

    if (currentStep >= 1 && date && hour) {
        document.getElementById('step-schedule').classList.add('completed');
        currentStep = 2;
    }

    if (currentStep >= 2 && passengerCount) {
        document.getElementById('step-passengers').classList.add('completed');
        currentStep = 3;
    }

    if (predictionMade) {
        document.getElementById('step-estimate').classList.add('completed');
        currentStep = 4;
    }

    if (currentStep < steps.length) {
        document.getElementById(steps[currentStep]).classList.add('active');
    }
}

function setPassengers(count) {
    document.getElementById('passenger_count').value = count;
    document.querySelectorAll('.passenger-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i + 1 === count);
    });
    updateProgress();
}

setPassengers(1);

// ----------------------
// Location status
// ----------------------
function updateLocationStatus() {
    const pickupCard = document.getElementById('pickup-card');
    const dropoffCard = document.getElementById('dropoff-card');
    const pickupStatus = document.getElementById('pickup-status');
    const dropoffStatus = document.getElementById('dropoff-status');
    const pickupCoords = document.getElementById('pickup-coords');
    const dropoffCoords = document.getElementById('dropoff-coords');
    const mapInstruction = document.getElementById('map-instruction');

    // Pickup
    if (pickupSelected) {
        pickupCard.classList.add('selected');
        pickupCard.classList.remove('pending');
        pickupStatus.textContent = 'Pickup location confirmed';
        const lat = document.getElementById('pickup_lat').value;
        const lon = document.getElementById('pickup_lon').value;
        pickupCoords.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(4)}`;
        pickupCoords.style.display = 'block';
        if (!dropoffSelected) {
            mapInstruction.innerHTML = '<i class="fas fa-map-pin"></i> Click to select destination';
            dropoffCard.classList.add('pending');
        }
    } else {
        pickupCard.classList.remove('selected', 'pending');
        pickupStatus.textContent = 'Select pickup location';
        pickupCoords.style.display = 'none';
        mapInstruction.innerHTML = '<i class="fas fa-mouse-pointer"></i> Click to select pickup location';
    }

    // Dropoff
    if (dropoffSelected) {
        dropoffCard.classList.add('selected');
        dropoffCard.classList.remove('pending');
        dropoffStatus.textContent = 'Destination confirmed';
        const lat = document.getElementById('dropoff_lat').value;
        const lon = document.getElementById('dropoff_lon').value;
        dropoffCoords.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(4)}`;
        dropoffCoords.style.display = 'block';
        if (pickupSelected) {
            mapInstruction.innerHTML = '<i class="fas fa-check-circle"></i> Both locations selected';
        }
    } else {
        dropoffCard.classList.remove('selected', 'pending');
        dropoffStatus.textContent = 'Select destination';
        dropoffCoords.style.display = 'none';
    }

    updateProgress();
}

// ----------------------
// Toast
// ----------------------
function showToast(title, message) {
    return;
    //const toast = document.getElementById('successToast');
    //toast.querySelector('.toast-body').textContent = message;
    //toast.querySelector('.me-auto').textContent = title;
    //new bootstrap.Toast(toast).show();

}

// ----------------------
// Lock/Unlock markers
// ----------------------
function lockMarkers() {
    predictionMade = true;
    document.body.classList.add('prediction-locked');

    [pickupMarker, dropoffMarker].forEach((marker, i) => {
        if (!marker) return;
        marker.dragging.disable();

        let shapeSVG;
        if (i === 0) {
            // Pickup: circle with circle inside
            shapeSVG = `
                <circle cx="12.5" cy="12.5" r="10" fill="#000000" />
                <circle cx="12.5" cy="12.5" r="3" fill="white" />
            `;
        } else {
            // Dropoff: square with smaller square inside
            shapeSVG = `
                <rect x="2.5" y="2.5" width="20" height="20" fill="#000000" />
                <rect x="9.5" y="9.5" width="6" height="6" fill="white" />
            `;
        }

        marker.setIcon(L.icon({
            iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                <svg width="25" height="25" viewBox="0 0 25 25" xmlns="http://www.w3.org/2000/svg">
                    ${shapeSVG}
                </svg>
            `),
            iconSize: [25, 25],
            iconAnchor: [12, 12],
            popupAnchor: [1, -12],
        }));
    });

    updateProgress();

    setTimeout(() => {
        if (document.getElementById('results-section'));
        else scrollToBottom();
    }, 100);
}

function unlockMarkers() {
    predictionMade = false;
    document.body.classList.remove('prediction-locked');
    if (pickupMarker) pickupMarker.dragging.enable();
    if (dropoffMarker) dropoffMarker.dragging.enable();
    updateProgress();
}

// ----------------------
// Reset functions
// ----------------------
function resetPickup() {
    if (pickupMarker) map.removeLayer(pickupMarker);
    pickupMarker = null;
    pickupSelected = false;
    document.getElementById('pickup_lat').value = '';
    document.getElementById('pickup_lon').value = '';
    if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
    if (outerLine) { map.removeLayer(outerLine); outerLine = null; }
    updateLocationStatus();
}

function resetDropoff() {
    if (dropoffMarker) map.removeLayer(dropoffMarker);
    dropoffMarker = null;
    dropoffSelected = false;
    document.getElementById('dropoff_lat').value = '';
    document.getElementById('dropoff_lon').value = '';
    if (outerLine) { map.removeLayer(outerLine); outerLine = null; }
    updateLocationStatus();
}

function resetForm() {
    unlockMarkers();
    resetPickup();
    resetDropoff();
    if (dateInput) dateInput.value = CURRENT_DATE;
    document.getElementById('hour').value = '';
    setPassengers(1);

    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    const loadingSpinner = document.getElementById('loadingSpinner');

    submitBtn.disabled = false;
    submitText.innerHTML = '<i class="fas fa-calculator"></i> Calculate Fare Estimate';
    loadingSpinner.classList.add('d-none');

    const resultsSection = document.getElementById('results-section');
    if (resultsSection) resultsSection.style.display = 'none';

    updateProgress();
    setTimeout(scrollToTop, 100);
}

// ----------------------
// Form validation
// ----------------------
function showLoading() {
    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    const loadingSpinner = document.getElementById('loadingSpinner');

    submitBtn.disabled = true;
    submitText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating fare...';
    loadingSpinner.classList.remove('d-none');

    const form = document.getElementById('predictionForm');
    if (!form.querySelector('.loading-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="loading-spinner"></div>';
        form.style.position = 'relative';
        form.appendChild(overlay);
    }
}

// ----------------------
// Map click handling
// ----------------------
map.on('click', function(e) {
    if (!pickupSelected) {
        pickupMarker = createCustomUberMarker(e.latlng, 'pickup').addTo(map)
            .bindPopup(`<div class="popup-content">
                <h6><i class="fas fa-circle text-primary"></i> Pickup Location</h6>
                <button onclick='resetPickup()' class='btn btn-sm btn-outline-dark mt-2'>
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>`).openPopup();

        document.getElementById('pickup_lat').value = e.latlng.lat.toFixed(6);
        document.getElementById('pickup_lon').value = e.latlng.lng.toFixed(6);
        pickupSelected = true;

        pickupMarker.on('dragend', function() {
            if (!predictionMade) {
                var pos = pickupMarker.getLatLng();
                document.getElementById('pickup_lat').value = pos.lat.toFixed(6);
                document.getElementById('pickup_lon').value = pos.lng.toFixed(6);
                updateLocationStatus();
            }
        });

        updateLocationStatus();

    } else if (!dropoffSelected) {
        dropoffMarker = createCustomUberMarker(e.latlng, 'dropoff').addTo(map)
            .bindPopup(`<div class="popup-content">
                <h6><i class="fas fa-square text-danger"></i> Destination</h6>
                <button onclick='resetDropoff()' class='btn btn-sm btn-outline-dark mt-2'>
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>`).openPopup();


        document.getElementById('dropoff_lat').value = e.latlng.lat.toFixed(6);
        document.getElementById('dropoff_lon').value = e.latlng.lng.toFixed(6);
        dropoffSelected = true;

        dropoffMarker.on('dragend', function() {
            if (!predictionMade) {
                var pos = dropoffMarker.getLatLng();
                document.getElementById('dropoff_lat').value = pos.lat.toFixed(6);
                document.getElementById('dropoff_lon').value = pos.lng.toFixed(6);
                updateLocationStatus();
            }
        });

        updateLocationStatus();

    }
});

// ----------------------
// Initialize
// ----------------------
updateLocationStatus();
updateProgress();

document.addEventListener('DOMContentLoaded', scrollToResultsWhenReady);
