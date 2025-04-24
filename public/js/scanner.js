
const config = {
  supabaseUrl: 'https://xjyzuzsasfozaqxvnofh.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqeXp1enNhc2ZvemFxeHZub2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwNTQ4NDUsImV4cCI6MjA2MDYzMDg0NX0.4qNZXArhs9OA7cvkC92CnWAP8-LB3y9dHsMLJ6JD6A',
  amityCoords: { lat: 28.3184502, lng: 76.9137212 },
  maxDistance: 1000, // meters
  gmapsApiKey: 'AIzaSyCHPwiRLla_8a-MczVS7c69qM4fGOZdnfw'
};

// Main Application
class AttendanceScanner {
  constructor() {
    this.video = document.getElementById('video');
    this.scanBtn = document.getElementById('scanBtn');
    this.resultDiv = document.getElementById('result');
    this.locationBox = document.getElementById('locationBox');
    this.coordinatesDisplay = document.getElementById('coordinates');
    this.cameraError = document.getElementById('camera-error');
    this.retryBtn = document.getElementById('retry-camera');

    this.isInCampus = false;
    this.stream = null;
    this.faceMatcher = null;
    this.supabase = null;
  }

  async init() {
    this.supabase = supabase.createClient(config.supabaseUrl, config.supabaseKey);
    await this.testConnection();
    await this.loadModels();
    this.retryBtn.addEventListener('click', () => this.initCamera());
    await this.initCamera();
    this.initGeolocation();
  }

  async testConnection() {
    try {
      const { data, error } = await this.supabase.from('students').select('*').limit(1);
      console.log('DB connectivity test:', data, error);
    } catch (err) {
      console.error('Supabase connectivity error:', err);
    }
  }

async loadModels() {
  const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js/models';
  try {
    console.log('Loading tinyFaceDetector...');
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    console.log('tinyFaceDetector loaded');
    
    console.log('Loading faceLandmark68Net...');
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    console.log('faceLandmark68Net loaded');
    
    console.log('Loading faceRecognitionNet...');
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    console.log('faceRecognitionNet loaded');
  } catch (err) {
    console.error('Model loading error:', err);
    this.showError('Face recognition system failed to load');
  }
}

  async initCamera() {
    try {
      if (this.stream) this.stream.getTracks().forEach(track => track.stop());
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (!devices.some(device => device.kind === 'videoinput')) throw new Error('No camera device found');

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      this.video.srcObject = this.stream;
      this.video.onloadedmetadata = () => this.video.play();
      this.cameraError.classList.add('hidden');
      this.scanBtn.disabled = false;
    } catch (err) {
      console.error('Camera Error:', err);
      this.cameraError.textContent = `Camera Error: ${err.message}`;
      this.cameraError.classList.remove('hidden');
      this.scanBtn.disabled = true;
    }
  }

  initGeolocation() {
    if (!navigator.geolocation) {
      this.coordinatesDisplay.textContent = 'Geolocation not supported';
      return;
    }
    navigator.geolocation.watchPosition(
      pos => this.updateLocation(pos),
      err => this.handleLocationError(err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  }

  updateLocation(position) {
    const { latitude, longitude } = position.coords;
    const distance = this.calculateDistance(latitude, longitude, config.amityCoords.lat, config.amityCoords.lng);
    this.isInCampus = distance <= config.maxDistance;

    this.coordinatesDisplay.innerHTML = `
      ${latitude.toFixed(6)}, ${longitude.toFixed(6)}<br>
      ${Math.round(distance)}m from campus<br>
      <strong>${this.isInCampus ? '✅ In Campus' : '❌ Out of Campus'}</strong>
    `;

    this.locationBox.className = this.isInCampus
      ? 'location-status p-4 text-center bg-green-100 text-green-800'
      : 'location-status p-4 text-center bg-red-100 text-red-800';
  }

  async scanFace() {
    if (!this.isInCampus) {
      this.showError('📍 You must be within the Amity campus to mark attendance.');
      return;
    }

    try {
      const detections = await faceapi.detectAllFaces(
        this.video,
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptors();

      if (!detections.length) throw new Error('😐 No face detected. Please center your face.');

      if (!this.faceMatcher) {
        const { data: students, error } = await this.supabase.from('students').select('student_id, face_descriptor');
        if (error || !students.length) throw new Error('No registered faces in database.');

        const labeled = students.map(s =>
          new faceapi.LabeledFaceDescriptors(
            s.student_id,
            [new Float32Array(JSON.parse(s.face_descriptor))]
          )
        );
        this.faceMatcher = new faceapi.FaceMatcher(labeled, 0.6);
      }

      const match = this.faceMatcher.findBestMatch(detections[0].descriptor);
      if (match.label === 'unknown') throw new Error('Face not recognized. Please register first.');

      const { error } = await this.supabase.from('attendance').insert([{
        student_id: match.label,
        location: this.coordinatesDisplay.textContent,
        timestamp: new Date().toISOString()
      }]);
      if (error) throw error;

      this.showSuccess(`🎉 Attendance marked for ${match.label}`);
    } catch (err) {
      console.error('Face scan failed:', err);
      this.showError(err.message);
    }
  }

  async fetchData() {
    const { data, error } = await this.supabase.from('students').select('*');
    if (error) {
      console.error('Error fetching data:', error);
    } else {
      console.log('Fetched Student Data:', data);
    }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  showError(message) {
    this.resultDiv.textContent = message;
    this.resultDiv.className = 'block mt-4 p-4 rounded-lg bg-red-100 text-red-800';
    this.resultDiv.classList.remove('hidden');
  }

  showSuccess(message) {
    this.resultDiv.textContent = message;
    this.resultDiv.className = 'block mt-4 p-4 rounded-lg bg-green-100 text-green-800';
    this.resultDiv.classList.remove('hidden');
  }

  handleLocationError(error) {
    let msg = 'Location Error: ';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        msg += 'Permission denied'; break;
      case error.POSITION_UNAVAILABLE:
        msg += 'Position unavailable'; break;
      case error.TIMEOUT:
        msg += 'Request timed out'; break;
      default:
        msg += 'Unknown error';
    }
    this.coordinatesDisplay.textContent = msg;
    this.locationBox.className = 'location-status p-4 text-center bg-yellow-100 text-yellow-800';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const scanner = new AttendanceScanner();
  await scanner.init();
  await scanner.fetchData();

  document.getElementById('scanBtn').addEventListener('click', async () => {
    scanner.scanBtn.disabled = true;
    scanner.scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Processing...';
    await scanner.scanFace();
    scanner.scanBtn.disabled = false;
    scanner.scanBtn.innerHTML = '<i class="fas fa-camera mr-2"></i> Mark Attendance';
  });
});

