from django.db import models
from django.conf import settings

class MarketData(models.Model):
    TYPE_CHOICES = [
        ('genre_trends', 'Genre Trends'),
        ('streaming_insights', 'Streaming Insights'),
        ('touring_data', 'Touring Data'),
        ('sync_opportunities', 'Sync Opportunities'),
    ]
    data_type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    content = models.JSONField(help_text="Dynamic data like chart positions, venue availability")
    is_trending = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(help_text="When this data becomes stale")

    def __str__(self):
        return self.title

class UserMetricsUpload(models.Model):
    PLATFORM_CHOICES = [
        ('spotify', 'Spotify'),
        ('apple_music', 'Apple Music'),
        ('instagram', 'Instagram'),
        ('tiktok', 'TikTok'),
        ('youtube', 'YouTube'),
        ('other', 'Other'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='metrics_uploads')
    platform = models.CharField(max_length=50, choices=PLATFORM_CHOICES)
    data_file = models.FileField(upload_to='metrics_uploads/', help_text="CSV/JSON data file")
    followers = models.IntegerField(null=True, blank=True)
    monthly_listeners = models.IntegerField(null=True, blank=True)
    engagement_rate = models.FloatField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.platform} ({self.uploaded_at})"

class Track(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tracks', null=True, blank=True)
    track_id = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=255)
    artist = models.CharField(max_length=255)
    album = models.CharField(max_length=255, blank=True)
    year = models.IntegerField()
    genre = models.CharField(max_length=100)
    sub_genre = models.CharField(max_length=100, blank=True)
    bpm = models.IntegerField()
    key = models.CharField(max_length=50, blank=True)
    duration = models.CharField(max_length=10, blank=True)
    moods = models.JSONField(default=list)
    tags = models.TextField(blank=True)
    audio_file_url = models.URLField(blank=True)
    cover_art_url = models.URLField(blank=True)
    streaming_links = models.JSONField(default=dict)
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} by {self.artist} ({self.track_id})"
