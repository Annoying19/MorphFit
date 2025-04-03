from flask import Flask, request, jsonify, send_from_directory, abort
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import uuid
import threading
import io
import requests
from app.database import db, ImageModel, RecommendationResult, User, Saved
from app.recommend_outfits import load_model, generate_recommendations
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
    model_path = os.path.join("siamese_model.pt")
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
    download_model()       # ✅ Downloads the model file
    model = load_model()   # ✅ Load model only after download is guaranteed


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
# REGISTERS USERS
@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data or "username" not in data or "password" not in data:
        return jsonify({"error": "Missing required fields"}), 400

    username = data["username"]
    password = bcrypt.generate_password_hash(data["password"]).decode("utf-8")

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 400

    new_user = User(username=username, password=password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully!"}), 201

# LOGIN USERS
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data or "username" not in data or "password" not in data:
        return jsonify({"error": "Missing required fields"}), 400   

    username = data["username"]
    password = data["password"]

    user = User.query.filter_by(username=username).first()
    if user and bcrypt.check_password_hash(user.password, password):
        # ✅ Check if recommendations already exist
        existing = RecommendationResult.query.filter_by(user_id=user.id).first()
        print(existing)
        if not existing:
            def threaded_recommendation(uid):
                with app.app_context():
                    generate_recommendations(uid)
            print(f"🟢 NO EXISTING recommendations found for user {user.id}, triggering generation")
            background_thread = threading.Thread(target=threaded_recommendation, args=(user.id,))
            background_thread.start()

            print(f"🔥 Background thread started for user {user.id}")
        else:
            print("EXISTING RECOMMENDATIONS")
        return jsonify({"message": "Login successful", "user_id": user.id}), 200
    else:
        return jsonify({"error": "Invalid username or password"}), 401


# UPLOAD CLOTHES
@app.route("/upload-multiple", methods=["POST"])
def upload_multiple_images():
    try:
        if "images" not in request.files or "user_id" not in request.form or "category" not in request.form:
            return jsonify({"error": "Missing required fields"}), 400

        user_id = int(request.form["user_id"])
        category = request.form["category"]

        if not db.session.get(User, user_id):
            return jsonify({"error": "Invalid user ID"}), 400

        RecommendationResult.query.filter_by(user_id=user_id).delete()
        db.session.commit()
        print(f"🧹 Cleared old recommendations for user {user_id}")

        heatmap_dir = "static"
        if os.path.exists(heatmap_dir):
            for f in os.listdir(heatmap_dir):
                if f.startswith(f"heatmap_{user_id}_"):
                    os.remove(os.path.join(heatmap_dir, f))
            print(f"🧹 Cleared heatmaps for user {user_id}")

        category_prefix = {
            "Tops": "TOP",
            "Bottoms": "BTM",
            "Shoes": "SHO",
            "Outerwear": "OUT",
            "All-wear": "ALL",
            "Accessories": "ACC",
            "Hats": "HAT",
            "Sunglasses": "SUN"
        }

        category_code = category_prefix.get(category, "GEN")
        existing_images = ImageModel.query.filter_by(category=category).count()
        start_number = existing_images + 1

        uploaded_images = []
        images = request.files.getlist("images")
        os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

        for idx, image in enumerate(images):
            unique_number = start_number + idx
            image_id = f"{category_code}{unique_number:02d}"

            base_name = secure_filename(image.filename).rsplit('.', 1)[0]
            filename = f"{uuid.uuid4().hex}_{base_name}.jpg"
            save_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)

            # ✅ Read image bytes into memory
            image_bytes = image.read()
            if len(image_bytes) < 1000:
                return jsonify({"error": "Uploaded image is too small or empty."}), 400

            # ✅ Validate image (corruption check)
            input_image = Image.open(io.BytesIO(image_bytes))
            input_image.verify()

            # ✅ Reopen after verify and convert to RGBA
            input_image = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
            output_image = remove(input_image)

            # ✅ Paste onto white background
            white_bg = Image.new("RGB", output_image.size, (255, 255, 255))
            white_bg.paste(output_image, mask=output_image.split()[3])
            white_bg.save(save_path, format="JPEG")

            # ✅ Save record to DB
            new_image = ImageModel(
                id=image_id,
                image_path=filename,
                category=category,
                user_id=user_id
            )
            db.session.add(new_image)
            uploaded_images.append({
                "image_id": image_id,
                "image_path": f"http://172.16.100.209:5000/uploads/{filename}"
            })

        db.session.commit()

        def run_with_context(uid):
            with app.app_context():
                generate_recommendations(uid)

        background_thread = threading.Thread(target=run_with_context, args=(user_id,))
        background_thread.start()

        return jsonify({
            "message": "Images uploaded successfully! Background removed and recommendations are being generated.",
            "images": uploaded_images
        }), 201

    except Exception as e:
        print(f"❌ Flask Image Upload Error: {str(e)}")
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500



# DELETE CLOTHES ONE AT A TIME
@app.route("/delete-images", methods=["POST"])
def delete_images():
    try:
        data = request.get_json()
        image_ids = data.get("image_ids", [])

        if not image_ids:
            return jsonify({"error": "No images selected"}), 400

        ImageModel.query.filter(ImageModel.id.in_(image_ids)).delete(synchronize_session=False)
        db.session.commit()
        return jsonify({"message": "Selected images deleted"}), 200

    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

# DELETE ALL CLOTHES
@app.route("/delete-all/<category>", methods=["DELETE"])
def delete_all_images(category):
    try:
        ImageModel.query.filter_by(category=category).delete()
        db.session.commit()
        return jsonify({"message": "All images deleted"}), 200

    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

# GETS THE CLOTHES BY CATEGORY
@app.route("/images/<category>", methods=["GET"])
def get_images_by_category(category):
    images = ImageModel.query.filter_by(category=category).all()

    image_list = [
        {
            "id": img.id,
            "image_path": f"http://172.16.100.209:5000/uploads/{img.image_path}",
            "category": img.category
        }
        for img in images
    ]

    return jsonify(image_list), 200

# GETS ALL CLOTHINGS OF USER
@app.route("/images/user/<user_id>", methods=["GET"])
def get_user_images(user_id):
    images = ImageModel.query.filter_by(user_id=user_id).all()

    return jsonify([
        {
            "id": img.id,
            "image_path": f"http://172.16.100.209:5000/uploads/{img.image_path}",
            "category": img.category
        }
        for img in images
    ])

@app.route("/recommend", methods=["POST"])
def recommend_outfit():
    try:
        data = request.get_json()
        event = data.get("event")
        user_id = data.get("user_id")
        
        if not event or not user_id:
            return jsonify({"error": "Missing event or user ID"}), 400

        threshold = 0.60  # 🔵 75% threshold

        user_recommendations = RecommendationResult.query.filter_by(user_id=user_id).all()

        if not user_recommendations:
            return jsonify({"error": "No recommendations found. Please upload images first."}), 404

        filtered_outfits = []
        for rec in user_recommendations:
            event_scores = json.loads(rec.scores)
            score = event_scores.get(event)
            if score is not None and score >= threshold:
                filenames = json.loads(rec.outfit)
                image_urls = [f"http://172.16.100.209:5000/uploads/{filename}" for filename in filenames]
                filtered_outfits.append({
                    "match_score": score,
                    "outfit": image_urls,
                    "raw_filenames": filenames,
                    "scores": event_scores
                })

        if not filtered_outfits:
            return jsonify({"error": f"No outfits found for '{event}' above {threshold * 100:.0f}%"}), 404

        # Optional: sort results from highest to lowest
        filtered_outfits.sort(key=lambda x: x["match_score"], reverse=True)

        return jsonify({
            "event": event,
            "results": filtered_outfits
        }), 200

    except Exception as e:
        print(f"❌ Recommend API Error: {str(e)}")
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500


@app.route('/save_outfit', methods=['POST'])
def save_outfit():
    data = request.json
    user_id = data.get('user_id')
    event = data.get('event')
    outfit_paths = data.get('outfit')  # e.g., ['/uploads/xxx.jpg', '/uploads/yyy.jpg']

    if not all([user_id, event, outfit_paths]):
        return jsonify({'error': 'Missing data'}), 400

    # 🔵 Normalize path and get image_ids
    image_ids = []
    for path in outfit_paths:
        # Extract filename only (e.g., '595eb00cfb374e0989e512f2894f0213_upload_0.jpg')
        filename = path.split('/')[-1]
        image_record = ImageModel.query.filter(
            ImageModel.image_path.like(f"%{filename}"),
            ImageModel.user_id == int(user_id)
        ).first()
        if image_record:
            image_ids.append(image_record.id)
        else:
            print(f"⚠️ Image not found for {filename}")

    new_saved = Saved(
        user_id=user_id,
        event=event,
        outfit=outfit_paths,
        clothes_ids=image_ids
    )
    db.session.add(new_saved)
    db.session.commit()

    return jsonify({'message': 'Outfit saved successfully!', 'image_ids': image_ids}), 201


# REMOVE SAVE
@app.route('/remove_outfit', methods=['POST'])
def remove_outfit():
    data = request.json
    user_id = data.get('user_id')
    event = data.get('event')
    outfit = data.get('outfit')

    if not all([user_id, event, outfit]):
        return jsonify({'error': 'Missing data'}), 400

    # Find the outfit entry based on user_id, event, and outfit
    saved_entry = Saved.query.filter_by(user_id=user_id, event=event, outfit=outfit).first()
    if saved_entry:
        db.session.delete(saved_entry)
        db.session.commit()
        return jsonify({'message': 'Outfit removed successfully!'}), 200
    else:
        return jsonify({'error': 'Outfit not found'}), 404

from mlxtend.frequent_patterns import fpgrowth
from mlxtend.preprocessing import TransactionEncoder
import pandas as pd

@app.route('/fp_growth_saved', methods=['GET'])
def fp_growth_saved():
    user_id = request.args.get('user_id')

    if not user_id:
        return jsonify({'error': 'Missing user_id'}), 400

    saved_outfits = Saved.query.filter_by(user_id=user_id).all()
    transactions = []
    item_details = {}

    for saved in saved_outfits:
        clothing_ids = []
        for image_id in saved.clothes_ids:
            image = ImageModel.query.filter_by(id=image_id, user_id=int(user_id)).first()
            if image:
                clothing_ids.append(image.id)
                item_details[image.id] = {
                    "id": image.id,
                    "image_path": image.image_path
                }
        if clothing_ids:
            transactions.append(clothing_ids)

    if not transactions:
        return jsonify({'error': 'No transactions available for this user'}), 404

    te = TransactionEncoder()
    te_ary = te.fit(transactions).transform(transactions)
    df = pd.DataFrame(te_ary, columns=te.columns_)

    frequent_itemsets = fpgrowth(df, min_support=0.3, use_colnames=True)

    result = []
    for row in frequent_itemsets.to_dict(orient='records'):
        items = [item_details[i] for i in row['itemsets']]
        result.append({
            'itemsets': items,
            'support': row['support']
        })
    return jsonify({'frequent_itemsets': result})


@app.route('/get_saved_outfits', methods=['GET'])
def get_saved_outfits():
    user_id = request.args.get('user_id')

    if not user_id:
        return jsonify({'error': 'Missing user_id'}), 400

    saved_outfits = Saved.query.filter_by(user_id=user_id).all()
    if not saved_outfits:
        return jsonify({'saved_outfits': []}), 200

    # Build a list of outfits with their details
    response_data = []
    for saved in saved_outfits:
        response_data.append({
            'id': saved.id,
            'event': saved.event,
            'outfit': saved.outfit,        # ['/uploads/img1.jpg', ...]
            'clothes_ids': saved.clothes_ids
        })

    return jsonify({'saved_outfits': response_data}), 200

@app.route('/remove_outfit_by_id', methods=['POST'])
def remove_outfit_by_id():
    data = request.json
    saved_id = data.get('id')

    if not saved_id:
        return jsonify({'error': 'Missing outfit id'}), 400

    # Find by primary key
    saved_outfit = Saved.query.get(saved_id)
    if not saved_outfit:
        return jsonify({'error': 'Saved outfit not found'}), 404

    # Delete from DB
    db.session.delete(saved_outfit)
    db.session.commit()

    return jsonify({'message': 'Saved outfit removed successfully'}), 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
