from django.contrib import admin
from .models import CollaborationMatch

@admin.register(CollaborationMatch)
class CollaborationMatchAdmin(admin.ModelAdmin):
    list_display = ('user', 'matched_user', 'external_entity', 'match_type', 'compatibility_score', 'status')
    list_filter = ('match_type', 'status')
