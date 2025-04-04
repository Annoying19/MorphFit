from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)

class ImageModel(db.Model):
    id = db.Column(db.String(50), primary_key=True)
    image_path = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

class RecommendationResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    event = db.Column(db.String(50), nullable=False)
    outfit = db.Column(db.Text, nullable=False)
    scores = db.Column(db.Text, nullable=False)
    match_score = db.Column(db.Float, nullable=False)
    heatmap_paths = db.Column(db.Text, nullable=False)

class Saved(db.Model):
    __tablename__ = 'saved'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(100), nullable=False)
    event = db.Column(db.String(100), nullable=False)
    outfit = db.Column(db.JSON, nullable=False)  # stores list of image relative paths like ['/uploads/img.jpg', ...]
    clothes_ids = db.Column(db.JSON, nullable=False)  # stores list of image_ids like ['abc123', 'def456']

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'event': self.event,
            'outfit': self.outfit
        }
