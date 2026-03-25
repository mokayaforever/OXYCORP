from django.contrib import admin
from .models import User, UserProfile

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'artist_name', 'is_artist')
    search_fields = ('username', 'email', 'artist_name')

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'genre', 'career_stage', 'location', 'created_at')
    list_filter = ('genre', 'career_stage')
