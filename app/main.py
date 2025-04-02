from flask import Flask, request, jsonify, send_from_directory, abort
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import uuid
import threading
import io
import requests
from database import db, ImageModel, RecommendationResult, User, Saved
from recommend_outfits import generate_recommendations
import json
from mlxtend.frequent_patterns import fpgrowth
from mlxtend.preprocessing import TransactionEncoder
import pandas as pd
from rembg import remove
from PIL import Image

# Initialize Flask App
app = Flask(__name__)
CORS(app)  # Enable CORS for React Native

# Ensure Database & Uploads Folder Exists
os.makedirs("assets", exist_ok=True)
os.makedirs("uploads", exist_ok=True)

# SQLite3 Database Configuration
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.abspath("assets/database.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["UPLOAD_FOLDER"] = "uploads"

bcrypt = Bcrypt(app)
db.init_app(app)

# Automatically download model from Google Drive if not present
def download_model():
    model_path = "app/siamese_model.pt"
    model_url = "https://drive.google.com/uc?export=download&id=1KoyusogBnMQEtqAaY2JvlbaV1vRbHMql"

    if not os.path.exists(model_path):
        print("🔽 Downloading Siamese model from Google Drive...")
        try:
            response = requests.get(model_url)
            with open(model_path, 'wb') as f:
                f.write(response.content)
            print("✅ Model downloaded successfully.")
        except Exception as e:
            print(f"❌ Failed to download model: {e}")
    else:
        print("📦 Model already exists locally.")

with app.app_context():
    db.create_all()
    download_model()

# Endpoint to serve uploaded images
@app.route("/uploads/<filename>")
def get_uploaded_file(filename):
    upload_folder = os.path.abspath(app.config["UPLOAD_FOLDER"])
    file_path = os.path.join(upload_folder, filename)

    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return abort(404)

    try:
        with open(file_path, 'rb') as f:
            image_bytes = f.read()
            if len(image_bytes) < 1000:
                print(f"❌ Image too small or empty: {filename}")
                return abort(400, description="Corrupted or incomplete image")
            img = Image.open(io.BytesIO(image_bytes))
            img.verify()
        return send_from_directory(upload_folder, filename)
    except Exception as e:
        print(f"❌ Corrupted or unreadable image: {filename} - {e}")
        return abort(500, description="Corrupted image file.")

# All remaining routes (register, login, upload, recommend, etc.) stay unchanged.
# Only change: make sure image URLs use public API base URL like:
# https://your-backend.onrender.com/uploads/<filename>

# For example, in upload_multiple_images() and get_user_images(), replace:
#   "http://172.16.100.209:5000/uploads/{filename}"
# with:
#   f"{request.host_url}uploads/{filename}"  (automatically uses current domain)

# Example usage:
# image_path = f"{request.host_url}uploads/{filename}"

# The rest of your routes should follow same pattern for compatibility when deployed.

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
