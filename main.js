// main.js

document.addEventListener('DOMContentLoaded', () => {

    // Set Copyright Year
    const yearSpan = document.getElementById('year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // Mobile Menu Toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = hamburger.querySelector('i');
            if (icon) {
                if (navLinks.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });

        // Close menu when a link is clicked
        const navItems = navLinks.querySelectorAll('a');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                navLinks.classList.remove('active');
                const icon = hamburger.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        });
    }

    // Navbar Scroll Effect
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.add('scrolled'); // Force glass backgound. To remove comment.
            // navbar.classList.remove('scrolled'); 
        }
    });

    // Make navbar stay glass on start
    navbar.classList.add('scrolled');

    // Fleet Fare Calculators
    const calcBtns = document.querySelectorAll('.calc-btn');
    calcBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const vehicle = e.target.getAttribute('data-vehicle');
            let rate = e.target.getAttribute('data-rate');

            if (vehicle === 'tempo') {
                const seatSelect = document.getElementById('seats-tempo');
                rate = parseFloat(seatSelect.value);
            } else {
                rate = parseFloat(rate);
            }

            const distanceInput = document.getElementById(`distance-${vehicle}`);
            const resultBox = document.getElementById(`result-${vehicle}`);
            const fareAmount = resultBox.querySelector('.fare-amount');

            const distance = parseFloat(distanceInput.value);

            if (isNaN(distance) || distance <= 0) {
                alert("Please enter a valid distance in kilometers.");
                return;
            }

            const total = distance * rate;
            fareAmount.textContent = `₹${total.toFixed(2)}`;
            resultBox.classList.remove('hidden');
        });
    });

    // Handle Vehicle Selection from Fleet Cards
    window.selectVehicle = function (vehicleName) {
        const vehicleSelect = document.getElementById('vehicle');
        if (vehicleSelect) {
            vehicleSelect.value = vehicleName;
        }
    };

    // Map Location Selection
    let map = null;
    let mapMarker = null;
    let currentTargetInput = null;
    let selectedLatLon = null;
    let geocodedAddress = "";

    const mapModal = document.getElementById('mapModal');
    const closeMapModalBtn = document.querySelector('.close-modal');
    const confirmLocationBtn = document.getElementById('confirmLocationBtn');
    const mapBtns = document.querySelectorAll('.map-btn');
    const selectedAddressDisplay = document.getElementById('selectedAddress');
    const mapModalTitle = document.getElementById('mapModalTitle');

    // New elements for search
    const mapSearchBtn = document.getElementById('mapSearchBtn');
    const mapSearchInput = document.getElementById('mapSearchInput');

    mapBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentTargetInput = btn.getAttribute('data-target');
            if (currentTargetInput === 'pickup') {
                mapModalTitle.textContent = "Select Pickup Location";
            } else {
                mapModalTitle.textContent = "Select Drop-off Location";
            }

            mapModal.style.display = 'block';
            selectedAddressDisplay.textContent = "Click on the map to place a marker";
            confirmLocationBtn.disabled = true;
            if (mapSearchInput) {
                mapSearchInput.value = '';
            }

            if (!map) {
                // Initialize map (default to Pondicherry, India as per site name)
                map = L.map('mapContainer').setView([11.9416, 79.8083], 13);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(map);

                // Try to get user's current location to center map
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((pos) => {
                        const lat = pos.coords.latitude;
                        const lon = pos.coords.longitude;
                        map.setView([lat, lon], 13);
                    }, () => {
                        // Ignore error, fallback to Pondicherry
                    });
                }

                map.on('click', async (e) => {
                    const lat = e.latlng.lat;
                    const lon = e.latlng.lng;
                    selectedLatLon = { lat, lon };

                    if (mapMarker) {
                        mapMarker.setLatLng(e.latlng);
                    } else {
                        mapMarker = L.marker(e.latlng).addTo(map);
                    }

                    selectedAddressDisplay.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching address...';
                    confirmLocationBtn.disabled = true;

                    try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                        const data = await response.json();

                        if (data && data.display_name) {
                            geocodedAddress = data.display_name;
                            selectedAddressDisplay.textContent = geocodedAddress;
                            confirmLocationBtn.disabled = false;
                        } else {
                            geocodedAddress = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
                            selectedAddressDisplay.textContent = "Address not found. Using coordinates.";
                            confirmLocationBtn.disabled = false;
                        }
                    } catch (error) {
                        console.error("Geocoding error:", error);
                        geocodedAddress = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
                        selectedAddressDisplay.textContent = "Network error. Using coordinates.";
                        confirmLocationBtn.disabled = false;
                    }
                });
            } else {
                // Fix map rendering issue when unhidden
                setTimeout(() => {
                    map.invalidateSize();
                }, 100);
            }
        });
    });

    closeMapModalBtn.addEventListener('click', () => {
        mapModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target == mapModal) {
            mapModal.style.display = 'none';
        }
    });

    // Handle Search functionality
    if (mapSearchBtn && mapSearchInput) {
        mapSearchBtn.addEventListener('click', async () => {
            const query = mapSearchInput.value.trim();
            if (!query) return;

            mapSearchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            mapSearchBtn.disabled = true;

            try {
                // 1. Try Nominatim first with India countrycode bias for exact matches
                let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=1`);
                let data = await response.json();

                let found = false;
                let lat, lon, displayName;

                if (data && data.length > 0) {
                    lat = parseFloat(data[0].lat);
                    lon = parseFloat(data[0].lon);
                    displayName = data[0].display_name;
                    found = true;
                } else {
                    // 2. Fallback to Photon API, which handles typos natively. Pass map center to bias local results.
                    const center = map.getCenter();
                    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1&lon=${center.lng}&lat=${center.lat}`;
                    const photonResponse = await fetch(photonUrl);
                    const photonData = await photonResponse.json();

                    if (photonData && photonData.features && photonData.features.length > 0) {
                        const feature = photonData.features[0];
                        lon = parseFloat(feature.geometry.coordinates[0]);
                        lat = parseFloat(feature.geometry.coordinates[1]);

                        const props = feature.properties;
                        let parts = [];
                        if (props.name) parts.push(props.name);
                        if (props.street) parts.push(props.street);
                        if (props.locality) parts.push(props.locality);
                        if (props.district) parts.push(props.district);
                        if (props.city) parts.push(props.city);
                        if (props.state) parts.push(props.state);

                        displayName = parts.join(', ');
                        if (!displayName) {
                            displayName = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
                        }
                        found = true;
                    }
                }

                if (found) {
                    map.setView([lat, lon], 15);

                    if (mapMarker) {
                        mapMarker.setLatLng([lat, lon]);
                    } else {
                        mapMarker = L.marker([lat, lon]).addTo(map);
                    }

                    selectedLatLon = { lat, lon };
                    geocodedAddress = displayName;
                    selectedAddressDisplay.textContent = geocodedAddress;
                    confirmLocationBtn.disabled = false;
                } else {
                    alert("Location not found. Please try a different search or check spelling.");
                }
            } catch (error) {
                console.error("Search error:", error);
                alert("An error occurred while searching. Please try again.");
            } finally {
                mapSearchBtn.innerHTML = '<i class="fas fa-search"></i> Search';
                mapSearchBtn.disabled = false;
            }
        });

        // Allow pressing Enter to search
        mapSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                mapSearchBtn.click();
            }
        });
    }

    confirmLocationBtn.addEventListener('click', () => {
        if (currentTargetInput && geocodedAddress) {
            document.getElementById(currentTargetInput).value = geocodedAddress;
            mapModal.style.display = 'none';
        }
    });

    // Booking Form -> WhatsApp Integration
    const bookingForm = document.getElementById('bookingForm');

    if (bookingForm) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Collect Data
            const name = document.getElementById('name').value;
            const phone = document.getElementById('phone').value;
            const pickup = document.getElementById('pickup').value;
            const dropoff = document.getElementById('dropoff').value;
            const date = document.getElementById('date').value;

            // Reconstruct time from the select dropdowns
            const timeHours = document.getElementById('timeHours').value;
            const timeMinutes = document.getElementById('timeMinutes').value;
            const timeAMPM = document.getElementById('timeAMPM').value;
            const time = `${timeHours}:${timeMinutes} ${timeAMPM}`;

            const vehicle = document.getElementById('vehicle') ? document.getElementById('vehicle').value : 'Not specified';

            // Target Driver WhatsApp Number (Sample: REPLACE THIS LATER)
            // Number must be in international format without + or - (e.g. 1234567890)
            const targetPhone = "916369637671";

            // Construct Message
            const message = `*NEW BOOKING REQUEST*%0A%0A` +
                `*Vehicle:* ${vehicle}%0A` +
                `*Name:* ${name}%0A` +
                `*Phone:* ${phone}%0A` +
                `*Pickup Location:* ${pickup}%0A` +
                `*Drop-off Location:* ${dropoff}%0A` +
                `*Date:* ${date}%0A` +
                `*Time:* ${time}%0A%0A` +
                `Please confirm if you are available.`;

            // Redirect to WhatsApp Link
            const whatsappUrl = `https://wa.me/${targetPhone}?text=${message}`;
            window.open(whatsappUrl, '_blank');
        });
    }
});
