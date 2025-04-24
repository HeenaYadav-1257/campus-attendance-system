import os
from dotenv import load_dotenv

load_dotenv()

# Supabase Configuration
SUPABASE_URL = "https://xjyzuzsasfozaqxvnofh.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqeXp1enNhc2ZvemFxeHZub2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwNTQ4NDUsImV4cCI6MjA2MDYzMDg0NX0.4qNZXArhs9OA7cvkC92CnWAP8-LB3yY9dHsMLJ6JD6A"

# University coordinates (Amity University)
UNIVERSITY_COORDS = (28.3184502, 76.9137212)
ALLOWED_RADIUS_METERS = 1000  # 1km around campus

# Google Maps API
GMAPS_API_KEY = "AIzaSyCHPwiRLla_8a-MczVS7c69qM4fGOZdnfw"

# Firebase Configuration (for hosting)
FIREBASE_CONFIG = {
    "apiKey": "AIzaSyCHPwiRLla_8a-MczVS7c69qM4fGOZdnfw",
    "authDomain": "campus-attendance-system-1257.firebaseapp.com",
    "projectId": "campus-attendance-system-1257",
    "storageBucket": "campus-attendance-system-1257.appspot.com",
    "messagingSenderId": "1234567890",
    "appId": "1:1234567890:web:abcdef123456"
}
