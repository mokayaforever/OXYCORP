from rest_framework import serializers
from .models import MarketData, UserMetricsUpload

class MarketDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketData
        fields = '__all__'

class UserMetricsUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserMetricsUpload
        fields = '__all__'
        read_only_fields = ('user', 'uploaded_at')
