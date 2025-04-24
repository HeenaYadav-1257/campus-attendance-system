import os
from flask import Flask, request, jsonify
from supabase import create_client
import face_recognition
import tempfile

app = Flask(__name__)

# Supabase configuration
SUPABASE_URL = 'https://xjyzuzsasfozaqxvnofh.supabase.co'
SUPABASE_KEY = 'your-supabase-key'
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.route('/api/register', methods=['POST'])
def register_student():
    try:
        # Get form data
        student_id = request.form['student_id']
        name = request.form['name']
        image = request.files['image']

        # Save temporarily
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            image.save(tmp)
            tmp_path = tmp.name

        # Face detection and encoding
        image = face_recognition.load_image_file(tmp_path)
        face_locations = face_recognition.face_locations(image)
        
        if len(face_locations) == 0:
            return jsonify(error="No face detected"), 400

        encoding = face_recognition.face_encodings(image)[0].tolist()
        
        # Upload to Supabase Storage
        file_path = f"students/{student_id}_{int(time.time())}.jpg"
        with open(tmp_path, 'rb') as f:
            supabase.storage.from_("faceimages").upload(file_path, f)

        # Get public URL
        public_url = supabase.storage.from_("faceimages").get_public_url(file_path)

        # Insert into database
        supabase.table('students').insert({
            "student_id": student_id,
            "name": name,
            "face_descriptor": encoding,
            "photo_url": public_url
        }).execute()

        os.unlink(tmp_path)
        return jsonify(success=True, message=f"Student {name} registered")

    except Exception as e:
        return jsonify(error=str(e)), 500

@app.route('/api/verify', methods=['POST'])
def verify_face():
    try:
        image = request.files['image']
        
        # Save temporarily
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            image.save(tmp)
            tmp_path = tmp.name

        # Get encoding
        image = face_recognition.load_image_file(tmp_path)
        face_encoding = face_recognition.face_encodings(image)
        
        if not face_encoding:
            return jsonify(error="No face detected"), 400

        # Get all students from database
        students = supabase.table('students').select("*").execute().data
        
        # Compare with all known faces
        matches = []
        for student in students:
            known_encoding = student['face_descriptor']
            results = face_recognition.compare_faces(
                [known_encoding], 
                face_encoding[0]
            )
            if results[0]:
                matches.append(student)

        os.unlink(tmp_path)
        return jsonify(matches=matches)

    except Exception as e:
        return jsonify(error=str(e)), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)