import csv
import os
import random

os.makedirs('datasets', exist_ok=True)

genres = [
    'Pop', 'Hip-Hop / Rap', 'Afrobeats', 'R&B / Soul',
    'Electronic / EDM', 'Indie / Alternative', 'Latin', 'Jazz',
    'Classical', 'Amapiano'
]
stages = [
    'Emerging (0–2 yrs)', 'Developing (2–5 yrs)',
    'Mid-Career (5–10 yrs)', 'Established (10+ yrs)'
]

with open('datasets/career_training.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    header = [
        'artist_name','genre','career_stage','spotify_listeners',
        'monthly_streams','youtube_views','instagram_followers',
        'tiktok_followers','engagement_rate','gigs_per_year',
        'avg_show_revenue','annual_revenue','career_score'
    ]
    writer.writerow(header)
    for i in range(200):
        genre = random.choice(genres)
        stage = random.choices(stages, weights=[0.35, 0.30, 0.20, 0.15])[0]
        base_listeners = random.randint(500, 200_000)
        monthly_streams = int(base_listeners * random.uniform(2.0, 20.0))
        youtube_views = int(monthly_streams * random.uniform(0.15, 0.45))
        instagram_followers = int(base_listeners * random.uniform(0.5, 3.0))
        tiktok_followers = int(base_listeners * random.uniform(1.0, 5.0))
        engagement_rate = round(random.uniform(1.5, 12.0), 1)
        gigs_per_year = random.randint(2, 80)
        avg_show_revenue = round(random.uniform(200, 9_000), 2)
        annual_revenue = int(random.uniform(2_000, 180_000))
        score = (
            min(1.0, base_listeners / 500_000) * 0.18 +
            min(1.0, monthly_streams / 2_000_000) * 0.16 +
            min(1.0, youtube_views / 1_000_000) * 0.10 +
            min(1.0, instagram_followers / 200_000) * 0.08 +
            min(1.0, tiktok_followers / 500_000) * 0.10 +
            min(1.0, engagement_rate / 15) * 0.14 +
            min(1.0, gigs_per_year / 100) * 0.10 +
            min(1.0, avg_show_revenue / 10_000) * 0.06 +
            min(1.0, annual_revenue / 200_000) * 0.08
        )
        genre_mod = {
            'Afrobeats': 1.12, 'Amapiano': 1.15, 'Hip-Hop / Rap': 1.08,
            'R&B / Soul': 1.05, 'Electronic / EDM': 1.03, 'Pop': 1.0,
            'Indie / Alternative': 0.97, 'Latin': 1.10, 'Jazz': 0.88,
            'Classical': 0.85
        }.get(genre, 1.0)
        stage_mod = {
            'Emerging (0–2 yrs)': 1.10,
            'Developing (2–5 yrs)': 1.0,
            'Mid-Career (5–10 yrs)': 0.95,
            'Established (10+ yrs)': 0.90
        }[stage]
        career_score = max(
            10,
            min(
                98,
                int(score * 100 * genre_mod * stage_mod + random.gauss(0, 3))
            )
        )
        writer.writerow([
            f'Artist {i+1}', genre, stage, base_listeners,
            monthly_streams, youtube_views, instagram_followers,
            tiktok_followers, engagement_rate, gigs_per_year,
            avg_show_revenue, annual_revenue, career_score
        ])

with open('datasets/skill_training.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    header = [f'answer_{j+1}' for j in range(12)] + ['overall_score']
    writer.writerow(header)
    for i in range(200):
        answers = [random.randint(1, 5) for _ in range(12)]
        group_scores = [sum(answers[g*2:(g+1)*2]) / 6.0 * 100 for g in range(6)]
        overall = int(sum(group_scores) / len(group_scores) + random.gauss(0, 4))
        overall = max(0, min(100, overall))
        writer.writerow(answers + [overall])

print('Generated datasets/career_training.csv and datasets/skill_training.csv')
