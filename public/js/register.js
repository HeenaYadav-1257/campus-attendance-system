
const config = {
    supabaseUrl: 'https://xjyzuzsasfozaqxvnofh.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqeXp1enNhc2ZvemFxeHZub2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwNTQ4NDUsImV4cCI6MjA2MDYzMDg0NX0.4qNZXArhs9OA7cvkC92CnWAP8-LB3yY9dHsMLJ6JD6A',
    bucketName: 'faceimages'
};

class StudentRegistration {
    constructor() {
        // Initialize elements
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.capturedPhoto = document.getElementById('capturedPhoto');
        this.captureBtn = document.getElementById('captureBtn');
        this.registerBtn = document.getElementById('registerBtn');
        this.resultDiv = document.getElementById('result');
        this.form = document.getElementById('registrationForm');
        
        // State
        this.stream = null;
        this.photoData = null;
        this.faceDescriptor = null;
        this.supabase = null;
    }

    async init() {
        // Initialize Supabase
        this.supabase = supabase.createClient(config.supabaseUrl, config.supabaseKey);
        
        // Load face recognition models
        await this.loadFaceModels();
        
        // Start camera
        await this.initCamera();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    async loadFaceModels() {
        try {
            await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
            await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
            await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        } catch (err) {
            console.error("Model loading error:", err);
            this.showError("Face recognition system failed to load");
        }
    }

    async initCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            this.video.srcObject = this.stream;
            await this.video.play();
        } catch (err) {
            console.error("Camera error:", err);
            this.showError("Camera access denied. Please enable permissions.");
        }
    }

    setupEventListeners() {
        // Capture photo button
        this.captureBtn.addEventListener('click', async () => {
            await this.capturePhoto();
        });

        // Form submission
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.registerStudent();
        });
    }

    async capturePhoto() {
        try {
            // 1. Capture photo from video
            const canvas = this.canvas;
            const context = canvas.getContext('2d');
            context.drawImage(this.video, 0, 0, canvas.width, canvas.height);
            
            // 2. Convert to blob for upload
            canvas.toBlob(async (blob) => {
                this.photoData = blob;
                
                // 3. Display captured photo
                this.capturedPhoto.src = URL.createObjectURL(blob);
                this.capturedPhoto.classList.remove('hidden');
                this.video.classList.add('hidden');
                
                // 4. Detect face and get descriptor
                const detections = await faceapi.detectAllFaces(
                    canvas, 
                    new faceapi.TinyFaceDetectorOptions()
                ).withFaceLandmarks().withFaceDescriptors();
                
                if (detections.length === 0) {
                    throw new Error("No face detected. Please try again.");
                }
                
                this.faceDescriptor = Array.from(detections[0].descriptor);
                this.showSuccess("Face captured successfully!");
                
            }, 'image/jpeg', 0.95);
            
        } catch (err) {
            console.error("Capture error:", err);
            this.showError(err.message);
        }
    }

    async registerStudent() {
        const studentId = document.getElementById('student_id').value;
        const name = document.getElementById('name').value;
        
        if (!this.photoData || !this.faceDescriptor) {
            this.showError("Please capture a photo first");
            return;
        }

        this.registerBtn.disabled = true;
        this.registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Registering...';

        try {
            // 1. Upload photo to Supabase storage
            const filePath = `students/${studentId}_${Date.now()}.jpg`;
            const { error: uploadError } = await this.supabase.storage
                .from(config.faceimages)
                .upload(filePath, this.photoData);
            
            if (uploadError) throw uploadError;
            
            // 2. Get public URL of the photo
            const { data: { publicUrl } } = this.supabase.storage
                .from(config.bucketName)
                .getPublicUrl(filePath);
            
            // 3. Save student record to database
            const { error: dbError } = await this.supabase
                .from('students')
                .insert([{
                    student_id: studentId,
                    name: name,
                    face_descriptor: JSON.stringify(this.faceDescriptor),
                    photo_url: publicUrl,
                    registered_at: new Date().toISOString()
                }]);
            
            if (dbError) throw dbError;
            
            // 4. Show success and reset form
            this.showSuccess(`Student ${name} (${studentId}) registered successfully!`);
            this.form.reset();
            this.video.classList.remove('hidden');
            this.capturedPhoto.classList.add('hidden');
            this.photoData = null;
            this.faceDescriptor = null;
            
        } catch (err) {
            console.error("Registration error:", err);
            this.showError(`Registration failed: ${err.message}`);
        } finally {
            this.registerBtn.disabled = false;
            this.registerBtn.innerHTML = '<i class="fas fa-user-plus mr-2"></i> Register Student';
        }
    }

    showError(message) {
        this.resultDiv.textContent = message;
        this.resultDiv.className = "block p-3 rounded-lg bg-red-100 text-red-800";
        this.resultDiv.classList.remove('hidden');
    }

    showSuccess(message) {
        this.resultDiv.textContent = message;
        this.resultDiv.className = "block p-3 rounded-lg bg-green-100 text-green-800";
        this.resultDiv.classList.remove('hidden');
    }
}

// Initialize when ready
document.addEventListener('DOMContentLoaded', async () => {
    // Verify face-api.js is loaded
    if (typeof faceapi === 'undefined') {
        document.getElementById('result').textContent = "Error: Face recognition system failed to load";
        return;
    }
    
    const registration = new StudentRegistration();
    await registration.init();
});

async function fetchData() {
    const { data, error } = await supabase
      .from('students') // Your actual table name
      .select('*');
  
    if (error) {
      console.error('Error fetching data:', error);
    } else {
      console.log('📦 Students Table Data:', data);
    }
  }
  
