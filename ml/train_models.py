from pathlib import Path
import csv
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.feature_extraction import DictVectorizer
from sklearn.pipeline import Pipeline
import joblib

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / 'datasets'
MODEL_DIR = ROOT_DIR / 'ml_models'
MODEL_DIR.mkdir(exist_ok=True)

CAREER_DATA_FILE = DATA_DIR / 'career_training.csv'
SKILL_DATA_FILE = DATA_DIR / 'skill_training.csv'
CAREER_MODEL_FILE = MODEL_DIR / 'career_model.pkl'
SKILL_MODEL_FILE = MODEL_DIR / 'skill_model.pkl'


def load_career_data(path):
    X = []
    y = []
    with path.open('r', encoding='utf-8', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            X.append({
                'genre': row['genre'],
                'career_stage': row['career_stage'],
                'spotify_listeners': float(row['spotify_listeners']),
                'monthly_streams': float(row['monthly_streams']),
                'youtube_views': float(row['youtube_views']),
                'instagram_followers': float(row['instagram_followers']),
                'tiktok_followers': float(row['tiktok_followers']),
                'engagement_rate': float(row['engagement_rate']),
                'gigs_per_year': float(row['gigs_per_year']),
                'avg_show_revenue': float(row['avg_show_revenue']),
                'annual_revenue': float(row['annual_revenue']),
            })
            y.append(float(row['career_score']))
    return X, np.array(y, dtype=np.float32)


def load_skill_data(path):
    X = []
    y = []
    with path.open('r', encoding='utf-8', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            answers = [float(row[f'answer_{i}']) for i in range(1, 13)]
            X.append(answers)
            y.append(float(row['overall_score']))
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)


def build_career_pipeline():
    return Pipeline([
        ('vectorizer', DictVectorizer(sparse=False)),
        ('regressor', RandomForestRegressor(n_estimators=150, random_state=42, n_jobs=-1))
    ])


def build_skill_model():
    return RandomForestRegressor(n_estimators=150, random_state=42, n_jobs=-1)


def train_and_save():
    if not CAREER_DATA_FILE.exists() or not SKILL_DATA_FILE.exists():
        raise FileNotFoundError('Dataset files not found in datasets/. Run generate_datasets.py first.')

    career_X, career_y = load_career_data(CAREER_DATA_FILE)
    skill_X, skill_y = load_skill_data(SKILL_DATA_FILE)

    career_pipeline = build_career_pipeline()
    career_pipeline.fit(career_X, career_y)
    joblib.dump(career_pipeline, CAREER_MODEL_FILE)

    skill_model = build_skill_model()
    skill_model.fit(skill_X, skill_y)
    joblib.dump(skill_model, SKILL_MODEL_FILE)

    print(f'Trained career model saved to {CAREER_MODEL_FILE}')
    print(f'Trained skill model saved to {SKILL_MODEL_FILE}')


if __name__ == '__main__':
    train_and_save()
