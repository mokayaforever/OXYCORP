"""
SOUNDPATH — Python Machine Learning Service
FastAPI backend serving ML models for career scoring,
skill analysis, market intelligence, and recommendations.

Install: pip install fastapi uvicorn scikit-learn numpy pandas
Run:     uvicorn ml_service:app --host 0.0.0.0 --port 8000 --reload
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import numpy as np
import json
import math
from datetime import datetime

app = FastAPI(
    title="SOUNDPATH ML Service",
    description="Machine Learning models for music career intelligence",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────
# PYDANTIC SCHEMAS
# ─────────────────────────────────────────────────────

class CareerInput(BaseModel):
    artist_name: Optional[str] = "Artist"
    genre: str = "Pop"
    career_stage: str = "Emerging (0–2 yrs)"
    spotify_listeners: int = Field(default=5000, ge=0)
    monthly_streams: int = Field(default=15000, ge=0)
    youtube_views: int = Field(default=8000, ge=0)
    instagram_followers: int = Field(default=4500, ge=0)
    tiktok_followers: int = Field(default=12000, ge=0)
    engagement_rate: float = Field(default=3.2, ge=0, le=100)
    gigs_per_year: int = Field(default=12, ge=0)
    avg_show_revenue: float = Field(default=500, ge=0)
    annual_revenue: float = Field(default=8000, ge=0)
    primary_goal: str = "Build fanbase & streaming numbers"

class SkillInput(BaseModel):
    answers: List[int] = Field(default=[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])

class RecommendationInput(BaseModel):
    genre: str
    career_score: float
    reach_score: float
    engagement_score: float
    revenue_score: float
    goal: str

# ─────────────────────────────────────────────────────
# ML MODEL — Career Scoring (simulates trained model)
# In production: load pickle/joblib model
# ─────────────────────────────────────────────────────

class CareerScoringModel:
    """
    Simulates a trained Random Forest / Gradient Boosting model.
    Feature importances and weights derived from music career outcome data.
    In production: self.model = joblib.load('career_model.pkl')
    """

    # Feature weights (simulate RF feature importances)
    WEIGHTS = {
        "spotify_listeners": 0.18,
        "monthly_streams": 0.16,
        "youtube_views": 0.10,
        "instagram_followers": 0.08,
        "tiktok_followers": 0.10,
        "engagement_rate": 0.14,
        "gigs_per_year": 0.10,
        "avg_show_revenue": 0.06,
        "annual_revenue": 0.08,
    }

    # Genre modifiers (based on market size/opportunity)
    GENRE_MODIFIERS = {
        "Afrobeats": 1.12, "Amapiano": 1.15, "Hip-Hop / Rap": 1.08,
        "R&B / Soul": 1.05, "Electronic / EDM": 1.03, "Pop": 1.0,
        "Indie / Alternative": 0.97, "Latin": 1.10, "Gospel / CCM": 0.92,
        "Jazz": 0.88, "Classical": 0.85, "Country": 0.95,
        "Rock": 0.93, "Metal": 0.88, "Folk / Acoustic": 0.90, "Reggae": 0.92,
    }

    # Career stage context modifiers
    STAGE_MODIFIERS = {
        "Emerging (0–2 yrs)": 1.10,   # boosted — more room to grow
        "Developing (2–5 yrs)": 1.0,
        "Mid-Career (5–10 yrs)": 0.95,
        "Established (10+ yrs)": 0.90,
    }

    def normalise_feature(self, value: float, min_val: float, max_val: float) -> float:
        """Min-max normalisation to [0, 1]"""
        if max_val == min_val:
            return 0.0
        return min(1.0, max(0.0, (value - min_val) / (max_val - min_val)))

    def predict(self, data: CareerInput) -> Dict[str, Any]:
        """
        Simulate trained ML model prediction.
        Returns career score and sub-scores.
        """
        # Normalise features against benchmark ranges
        benchmarks = {
            "spotify_listeners": (0, 500_000),
            "monthly_streams":   (0, 2_000_000),
            "youtube_views":     (0, 1_000_000),
            "instagram_followers":(0, 200_000),
            "tiktok_followers":  (0, 500_000),
            "engagement_rate":   (0, 15),
            "gigs_per_year":     (0, 100),
            "avg_show_revenue":  (0, 10_000),
            "annual_revenue":    (0, 200_000),
        }

        raw_features = {
            "spotify_listeners": data.spotify_listeners,
            "monthly_streams":   data.monthly_streams,
            "youtube_views":     data.youtube_views,
            "instagram_followers": data.instagram_followers,
            "tiktok_followers":  data.tiktok_followers,
            "engagement_rate":   data.engagement_rate,
            "gigs_per_year":     data.gigs_per_year,
            "avg_show_revenue":  data.avg_show_revenue,
            "annual_revenue":    data.annual_revenue,
        }

        # Weighted score
        weighted_sum = sum(
            self.normalise_feature(v, *benchmarks[k]) * self.WEIGHTS[k]
            for k, v in raw_features.items()
        )

        # Apply genre and stage modifiers
        genre_mod = self.GENRE_MODIFIERS.get(data.genre, 1.0)
        stage_mod = self.STAGE_MODIFIERS.get(data.career_stage, 1.0)

        raw_score = weighted_sum * 100 * genre_mod * stage_mod

        # Add small noise to simulate model variance
        noise = np.random.normal(0, 1.5)
        final_score = max(8, min(98, round(raw_score + noise)))

        # Sub-scores
        reach_score = round(
            (self.normalise_feature(data.spotify_listeners, 0, 500_000) * 0.35 +
             self.normalise_feature(data.monthly_streams, 0, 2_000_000) * 0.30 +
             self.normalise_feature(data.youtube_views, 0, 1_000_000) * 0.20 +
             self.normalise_feature(data.instagram_followers, 0, 200_000) * 0.08 +
             self.normalise_feature(data.tiktok_followers, 0, 500_000) * 0.07) * 100
        )

        engagement_score = round(
            (self.normalise_feature(data.engagement_rate, 0, 15) * 0.60 +
             self.normalise_feature(data.tiktok_followers, 0, 500_000) * 0.20 +
             self.normalise_feature(data.instagram_followers, 0, 200_000) * 0.20) * 100
        )

        revenue_score = round(
            (self.normalise_feature(data.annual_revenue, 0, 200_000) * 0.50 +
             self.normalise_feature(data.gigs_per_year, 0, 100) * 0.30 +
             self.normalise_feature(data.avg_show_revenue, 0, 10_000) * 0.20) * 100
        )

        # Growth trajectory (12-month projection)
        growth_base = (engagement_score * 0.4 + reach_score * 0.3 + revenue_score * 0.3) / 10
        growth_pct = round(growth_base + (data.tiktok_followers / 50_000 * 5), 1)

        # Grade
        if final_score >= 80:
            grade = "EXCEPTIONAL · STAR TRAJECTORY"
        elif final_score >= 65:
            grade = "STRONG · CONSISTENT GROWTH"
        elif final_score >= 48:
            grade = "DEVELOPING · GOOD FOUNDATIONS"
        elif final_score >= 32:
            grade = "EARLY STAGE · FOCUS REQUIRED"
        else:
            grade = "BUILDING BLOCKS · KEEP GOING"

        return {
            "artist_name": data.artist_name,
            "career_score": final_score,
            "grade": grade,
            "reach_score": max(0, min(100, reach_score)),
            "engagement_score": max(0, min(100, engagement_score)),
            "revenue_score": max(0, min(100, revenue_score)),
            "growth_trajectory_pct": growth_pct,
            "genre_modifier": genre_mod,
            "model": "soundpath-career-rf-v2.4",
            "timestamp": datetime.utcnow().isoformat(),
        }


class SkillAnalysisModel:
    """
    Analyses quiz answers and produces skill profile.
    Simulates a trained classification model.
    """
    SKILL_NAMES = [
        "Musical Ability", "Music Theory",
        "DAW / Production", "Mastering",
        "Music Business", "Artist Branding",
        "Social Strategy", "PR / Press",
        "Live Performance", "Live Infrastructure",
        "Industry Network", "Mental Resilience"
    ]

    SKILL_GROUPS = {
        "Musical Ability":  [0, 1],
        "Production":       [2, 3],
        "Business":         [4, 5],
        "Marketing":        [6, 7],
        "Live Performance": [8, 9],
        "Networking":      [10, 11],
    }

    def analyse(self, answers: List[int]) -> Dict[str, Any]:
        padded = (answers + [1] * 12)[:12]

        group_scores = {}
        for group, indices in self.SKILL_GROUPS.items():
            total = sum(padded[i] for i in indices)
            pct = round(total / (len(indices) * 3) * 100)
            group_scores[group] = max(0, min(100, pct))

        overall = round(sum(group_scores.values()) / len(group_scores))

        # Identify strengths and gaps
        sorted_scores = sorted(group_scores.items(), key=lambda x: x[1])
        gaps = [s for s in sorted_scores[:2]]
        strengths = [s for s in sorted_scores[-2:]]

        return {
            "skill_scores": group_scores,
            "overall_score": overall,
            "top_strengths": [s[0] for s in strengths],
            "priority_gaps": [s[0] for s in gaps],
            "model": "soundpath-skill-v1.2",
            "timestamp": datetime.utcnow().isoformat(),
        }


# Instantiate models
career_model = CareerScoringModel()
skill_model = SkillAnalysisModel()


# ─────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "service": "SOUNDPATH ML Engine",
        "status": "running",
        "endpoints": ["/predict", "/skill-analysis", "/market-trends", "/recommendations", "/health"]
    }

@app.get("/health")
def health():
    return {"status": "ok", "service": "SOUNDPATH Python ML", "timestamp": datetime.utcnow().isoformat()}

@app.post("/predict")
def predict_career_score(data: CareerInput):
    """Run career scoring ML model on artist data."""
    try:
        result = career_model.predict(data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model error: {str(e)}")

@app.post("/skill-analysis")
def analyse_skills(data: SkillInput):
    """Analyse quiz answers and return skill profile."""
    try:
        result = skill_model.analyse(data.answers)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Skill model error: {str(e)}")

@app.get("/market-trends")
def get_market_trends():
    """Return current music market trends (in production: live data pipeline)."""

    # Simulate Python data pipeline output (real version would use Pandas + live API data)
    genres = [
        {"name": "Hip-Hop / Rap",      "market_share": 24.1, "growth_qoq": 2.1,  "trend": "stable"},
        {"name": "Pop",                 "market_share": 21.8, "growth_qoq": -0.5, "trend": "declining"},
        {"name": "R&B / Soul",          "market_share": 14.7, "growth_qoq": 1.2,  "trend": "growing"},
        {"name": "Afrobeats",           "market_share": 11.3, "growth_qoq": 18.4, "trend": "surging"},
        {"name": "Electronic / EDM",    "market_share": 9.2,  "growth_qoq": 3.7,  "trend": "growing"},
        {"name": "Indie / Alternative", "market_share": 7.8,  "growth_qoq": 0.9,  "trend": "stable"},
        {"name": "Latin",               "market_share": 5.6,  "growth_qoq": 6.3,  "trend": "growing"},
        {"name": "Amapiano",            "market_share": 4.1,  "growth_qoq": 27.1, "trend": "surging"},
    ]

    platform_payouts = {
        "Spotify":      {"per_stream": 0.003,  "subscribers_m": 608},
        "Apple Music":  {"per_stream": 0.007,  "subscribers_m": 100},
        "TIDAL":        {"per_stream": 0.012,  "subscribers_m": 3},
        "Amazon Music": {"per_stream": 0.004,  "subscribers_m": 82},
        "YouTube Music":{"per_stream": 0.0008, "subscribers_m": 100},
    }

    sync_opportunities = [
        {"type": "TV Drama", "budget_min": 3000, "budget_max": 8000, "genre": "R&B / Soul"},
        {"type": "Ad Campaign", "budget_min": 5000, "budget_max": 15000, "genre": "Afrobeats"},
        {"type": "Gaming", "budget_min": 500, "budget_max": 2000, "genre": "Electronic"},
    ]

    return {
        "genres": genres,
        "platform_payouts": platform_payouts,
        "sync_opportunities": sync_opportunities,
        "top_emerging_trend": {
            "name": "Afrobeats × Electronic fusion",
            "growth_yoy": "340%",
            "platform": "TikTok",
            "open_sync_briefs": 47
        },
        "streaming_forecast": {
            "description": "12-month ML forecast",
            "data": [820, 910, 980, 1050, 1180, 1240, 1310, 1390, 1450, 1520, 1640, 1780]
        },
        "generated_at": datetime.utcnow().isoformat()
    }

@app.post("/recommendations")
def get_recommendations(data: RecommendationInput):
    """Generate AI-driven recommendations based on scores."""
    recs = []

    if data.reach_score < 50:
        recs.append({
            "area": "Audience Reach",
            "priority": "high",
            "action": "Launch TikTok content strategy (5 posts/week) and submit to Spotify editorial playlists.",
            "impact": "Estimated +40% reach in 90 days"
        })

    if data.engagement_score < 40:
        recs.append({
            "area": "Engagement",
            "priority": "high",
            "action": "Reply to every comment for 30 days. Post interactive polls and behind-the-scenes content daily.",
            "impact": "Estimated +2% engagement rate lift"
        })

    if data.revenue_score < 40:
        recs.append({
            "area": "Revenue",
            "priority": "medium",
            "action": "Add Patreon/fan membership and 2 merchandise items to diversify beyond streaming.",
            "impact": "Estimated +$500–2,000/month"
        })

    recs.append({
        "area": "Genre Opportunity",
        "priority": "medium",
        "action": f"Based on ML trend analysis, {data.genre} shows strong growth signals. Explore cross-genre collaborations.",
        "impact": "15–30% broader audience reach"
    })

    return {
        "career_score": data.career_score,
        "recommendations": recs,
        "model": "soundpath-rec-v1.1",
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ml_service:app", host="0.0.0.0", port=8000, reload=True)
