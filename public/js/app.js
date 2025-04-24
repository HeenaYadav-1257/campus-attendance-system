// Initialize Supabase
const supabaseUrl = 'https://xjyzuzsasfozaqxvnofh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqeXp1enNhc2ZvemFxeHZub2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwNTQ4NDUsImV4cCI6MjA2MDYzMDg0NX0.4qNZXArhs9OA7cvkC92CnWAP8-LB3yY9dHsMLJ6JD6A';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Shared utility functions
async function checkLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const uniCoords = { lat: 28.3184502, lng: 76.9137212 };
                const distance = calculateDistance(
                    position.coords.latitude,
                    position.coords.longitude,
                    uniCoords.lat,
                    uniCoords.lng
                );
                resolve(distance <= 1000); // 1km radius
            },
            () => resolve(false)
        );
    });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}
