from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    is_artist = models.BooleanField(default=True)
    artist_name = models.CharField(max_length=255, unique=True, db_index=True)
    bio = models.TextField(blank=True)
    profile_picture = models.URLField(blank=True)

    REQUIRED_FIELDS = ['artist_name', 'email']

    def __str__(self):
        return self.username

class UserProfile(models.Model):
    GENRE_CHOICES = [
        ('pop', 'Pop'),
        ('hip_hop', 'Hip Hop'),
        ('electronic', 'Electronic'),
        ('rock', 'Rock'),
        ('jazz', 'Jazz'),
        ('classical', 'Classical'),
        ('other', 'Other'),
    ]
    STAGE_CHOICES = [
        ('aspiring', 'Aspiring (0-2 yrs)'),
        ('developing', 'Developing (2-5 yrs)'),
        ('established', 'Established (5-10 yrs)'),
        ('mainstream', 'Mainstream (10+ yrs)'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    genre = models.CharField(max_length=50, choices=GENRE_CHOICES)
    career_stage = models.CharField(max_length=50, choices=STAGE_CHOICES)
    goals = models.TextField(help_text="e.g., 'Get a sync license', 'Grow Spotify followers'")
    location = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"
