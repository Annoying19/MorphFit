import os
import json
import torch
from itertools import product
from PIL import Image
from torchvision import transforms
from flask_sqlalchemy import SQLAlchemy
from siamese_network import SiameseNetwork
from database import db, ImageModel, RecommendationResult

# Setup device and model
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = SiameseNetwork().to(device)
model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "siamese_model.pt")
model.load_state_dict(torch.load(model_path, map_location=device))
model.eval()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
])

def create_blank_image_tensor():
    blank_image = Image.new("RGB", (224, 224), (255, 255, 255))
    return transform(blank_image).unsqueeze(0)


def generate_recommendations(user_id):
    print(f"🔄 Generating recommendations for user: {user_id}")

    user_images = ImageModel.query.filter_by(user_id=user_id).all()
    category_mapping = {}
    for img in user_images:
        category_mapping.setdefault(img.category, []).append(img.image_path)

    combined_top_wear = category_mapping.get("Tops", []) + category_mapping.get("All-wear", [])
    if combined_top_wear:
        category_mapping["All-body/Tops"] = combined_top_wear

    # ✅ START replacing from here:
    core_categories = {
        "All-body/Tops": category_mapping.get("All-body/Tops", []),
        "Bottoms": category_mapping.get("Bottoms", []),
        "Shoes": category_mapping.get("Shoes", [])
    }

    optional_categories = {
        k: v for k, v in category_mapping.items()
        if k not in ["Tops", "All-wear", "Bottoms", "Shoes", "All-body/Tops"]
    }

    valid_combinations = []
    combo_logs = {}

    for r in range(2, 8):  # Allow 2 to 7 items
        slots = []

        if (core_categories["All-body/Tops"] and 
            core_categories["Bottoms"] and 
            core_categories["Shoes"]):
            slots = [
                core_categories["All-body/Tops"],
                core_categories["Bottoms"],
                core_categories["Shoes"]
            ]
        
        elif (core_categories["All-body/Tops"] and core_categories["Shoes"]):
            slots = [
                core_categories["All-body/Tops"],
                core_categories["Shoes"]
            ]
        else:
            continue

        optional_slots = [v for k, v in optional_categories.items()]
        optional_slots = optional_slots[:r - len(slots)]
        slots.extend(optional_slots)

        if len(slots) == r:
            combos = list(product(*slots))
            valid_combinations.extend(combos)
            combo_logs[r] = combo_logs.get(r, 0) + len(combos)

    if not valid_combinations:
        print("⚠️ No valid filtered combinations found")
        return

    for size, count in combo_logs.items():
        print(f"✔️ Generated {count} outfits with {size} items")
    # ✅ STOP here.

    # 🚀 The rest of your image_tensor, DB save, etc. stays the same:
    upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
    blank_tensor = create_blank_image_tensor()

    for outfit in valid_combinations:
        images_tensors = []
        outfit_with_blanks = list(outfit)
        while len(outfit_with_blanks) < 7:
            outfit_with_blanks.append("BLANK")

        for img_filename in outfit_with_blanks:
            if img_filename == "BLANK":
                images_tensors.append(blank_tensor)
            else:
                full_img_path = os.path.join(upload_dir, img_filename)
                img = Image.open(full_img_path).convert("RGB")
                images_tensors.append(transform(img).unsqueeze(0))

        with torch.no_grad():
            feature_embeddings = torch.stack([model.forward_once(img.to(device)) for img in images_tensors], dim=1)
            logits, _ = model(*images_tensors)
            probabilities = torch.sigmoid(logits)

        event_labels = ["Job Interviews", "Birthday", "Graduations", "MET Gala", "Business Meeting",
                        "Beach", "Picnic", "Summer", "Funeral", "Romantic Dinner", "Cold", "Casual", "Wedding"]
        prob_array = probabilities.cpu().detach().numpy().flatten()
        event_scores = {event_labels[i]: float(prob_array[i]) for i in range(len(event_labels))}

        new_result = RecommendationResult(
            user_id=user_id,
            event="N/A",
            outfit=json.dumps([img for img in outfit if img != "BLANK"]),
            scores=json.dumps(event_scores),
            match_score=max(event_scores.values()),
            heatmap_paths="[]"
        )
        db.session.add(new_result)

    db.session.commit()
    print(f"✅ Filtered recommendations saved for user {user_id}")

