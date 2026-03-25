from rest_framework import serializers
from .models import CollaborationMatch

class CollaborationMatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = CollaborationMatch
        fields = '__all__'
        read_only_fields = ('user', 'created_at')
