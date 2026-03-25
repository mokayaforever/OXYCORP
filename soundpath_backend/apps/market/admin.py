from django.contrib import admin
from .models import MarketData, UserMetricsUpload

@admin.register(MarketData)
class MarketDataAdmin(admin.ModelAdmin):
    list_display = ('title', 'data_type', 'is_trending', 'created_at', 'expires_at')
    list_filter = ('data_type', 'is_trending')

@admin.register(UserMetricsUpload)
class UserMetricsUploadAdmin(admin.ModelAdmin):
    list_display = ('user', 'platform', 'followers', 'uploaded_at')
    list_filter = ('platform',)
