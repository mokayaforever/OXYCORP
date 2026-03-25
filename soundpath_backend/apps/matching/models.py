from django.db import models
from django.conf import settings

class CollaborationMatch(models.Model):
    MATCH_TYPE_CHOICES = [
        ('collaborator', 'Collaborator'),
        ('label', 'Label'),
        ('publisher', 'Publisher'),
        ('sync_supervisor', 'Sync Supervisor'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='my_matches')
    matched_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='matched_to_me', null=True, blank=True)
    external_entity = models.CharField(max_length=255, null=True, blank=True, help_text="e.g. 'Atlantic Records'")
    match_type = models.CharField(max_length=50, choices=MATCH_TYPE_CHOICES)
    compatibility_score = models.FloatField(help_text="Score from compatibility algorithm")
    reasoning = models.TextField(help_text="AI generated explanation of the match")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Match for {self.user.username} - {self.match_type}"
