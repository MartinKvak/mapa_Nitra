const places = [
    { id: 1, name: "Mestský park Sihoť", type: "park", lat: 48.3119, lng: 18.0865, occupancy: 75, suitableFor: ["prechádzka", "beh", "deti"], description: "Veľký park pri rieke Nitra." },
    { id: 2, name: "Park na Chrenovej", type: "park", lat: 48.3008, lng: 18.1012, occupancy: 30, suitableFor: ["relax", "deti"], description: "Pokojný park medzi bytovkami." },
    { id: 3, name: "Lesopark Borina", type: "lesopark", lat: 48.3264, lng: 18.1009, occupancy: 20, suitableFor: ["prechádzka", "beh", "relax"], description: "Lesopark s chodníkmi." },
    { id: 4, name: "Ihrisko Klokočina", type: "ihrisko", lat: 48.3162, lng: 18.0754, occupancy: 90, suitableFor: ["deti"], description: "Veľké detské ihrisko." },
    { id: 5, name: "Ihrisko Chrenová – Olympia", type: "ihrisko", lat: 48.2987, lng: 18.1104, occupancy: 40, suitableFor: ["deti"], description: "Moderné ihrisko." },
    { id: 6, name: "Fitness zóna Sihoť", type: "fitness", lat: 48.3125, lng: 18.0881, occupancy: 60, suitableFor: ["šport", "tréning"], description: "Vonkajšia posilňovňa." },
    { id: 7, name: "Fitness zóna Klokočina", type: "fitness", lat: 48.3184, lng: 18.0733, occupancy: 25, suitableFor: ["šport", "tréning"], description: "Menej známa fitness zóna." },
    { id: 8, name: "Park pod Zoborom", type: "park", lat: 48.3301, lng: 18.0928, occupancy: 50, suitableFor: ["prechádzka", "relax"], description: "Park s výhľadom." },
    { id: 9, name: "Zoborský les", type: "les", lat: 48.3345, lng: 18.0956, occupancy: 15, suitableFor: ["prechádzka", "beh", "turistika"], description: "Rozsiahly les." },
    { id: 10, name: "Park Družba", type: "park", lat: 48.3147, lng: 18.0799, occupancy: 35, suitableFor: ["relax", "deti"], description: "Menší park." },
    { id: 11, name: "Ihrisko Staré Mesto", type: "ihrisko", lat: 48.3171, lng: 18.0869, occupancy: 55, suitableFor: ["deti"], description: "Ihrisko blízko centra." },
    { id: 12, name: "Cvičná lúka Zobor", type: "šport", lat: 48.3322, lng: 18.0912, occupancy: 10, suitableFor: ["šport", "joga", "relax"], description: "Otvorený priestor." }
];

const map = L.map('map').setView([48.310, 18.085], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let markersLayer = L.layerGroup().addTo(map);

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Polomer Zeme v km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function getCoordinatesFromStreet(street) {
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(street)}, Nitra`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.length === 0) {
            alert("Adresa v Nitre nebola nájdená.");
            return null;
        }
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch (error) {
        console.error("Chyba pri hľadaní adresy:", error);
        return null;
    }
}

function calculateScore(user, place) {
    const distance = getDistance(user.lat, user.lng, place.lat, place.lng);
    
    // Skóre vzdialenosti (max 100, klesá po 5km na nulu)
    const distanceScore = Math.max(0, 100 - (distance / 5) * 100);
    
    // Skóre obsadenosti (čím nižšia, tým lepšie)
    const occupancyScore = 100 - place.occupancy;
    
    // Skóre preferencií
    const hasTypeMatch = place.type === user.typ;
    const hasPreferenceMatch = user.preferencie.some(pref => place.suitableFor.includes(pref));
    const preferenceScore = (hasTypeMatch || hasPreferenceMatch) ? 100 : 0;

    // Vážený priemer
    const finalScore = (distanceScore * 0.6) + (occupancyScore * 0.2) + (preferenceScore * 0.2);

    return {
        score: Math.round(finalScore),
        distance: distance.toFixed(2)
    };
}

// 4. Hlavná funkcia po kliknutí na tlačidlo
async function handleSubmit() {
    const streetInput = document.getElementById("poloha").value;
    const typInput = document.getElementById("typ").value;
    const prefElement = document.getElementById("preferencie");
    
    // Získanie vybraných preferencií zo selectu
    const preferencie = Array.from(prefElement.selectedOptions).map(option => option.value);

    if (!streetInput) {
        alert("Zadaj ulicu!");
        return;
    }

    // Získanie súradníc z Nominatim API
    const coords = await getCoordinatesFromStreet(streetInput);
    if (!coords) return;

    // Vyčistenie starých značiek
    markersLayer.clearLayers();

    // Pridanie značky používateľa
    L.marker([coords.lat, coords.lng], {
        icon: L.divIcon({
            className: 'user-pos', 
            html: '<span style="font-size: 24px;">📍</span>', 
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        })
    }).addTo(markersLayer).bindPopup("Tvoja poloha").openPopup();

    const user = { 
        lat: coords.lat, 
        lng: coords.lng, 
        typ: typInput, 
        preferencie: preferencie 
    };

    // Výpočet a zoradenie
    const results = places
        .map(p => ({ ...p, ...calculateScore(user, p) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

    // Vykreslenie do HTML a na mapu
    const div = document.getElementById("result");
    div.innerHTML = "<h3>TOP 3 odporúčané miesta</h3>";

    results.forEach((p, index) => {
        // Pridanie miesta na mapu
        const marker = L.marker([p.lat, p.lng])
            .addTo(markersLayer)
            .bindPopup(`<b>${index + 1}. ${p.name}</b><br>Skóre: ${p.score}/100<br>Vzdialenosť: ${p.distance} km`);

        // Pridanie do zoznamu pod mapou
        div.innerHTML += `
            <div style="margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">
                <b>${index + 1}. ${p.name}</b> (Skóre: ${p.score}/100)<br>
                <small>${p.description}</small><br>
                Vzdialenosť: ${p.distance} km | Obsadenosť: ${p.occupancy}%
            </div>
        `;
    });

    // Vycentrovať mapu tak, aby bolo vidieť používateľa aj výsledky
    if (results.length > 0) {
        const group = new L.featureGroup(markersLayer.getLayers());
        map.fitBounds(group.getBounds().pad(0.1));
    }
}