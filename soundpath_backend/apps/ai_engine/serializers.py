from rest_framework import serializers
from .models import CareerAnalysis, SkillAssessment, CareerRoadmap, Milestone

class MilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone
        fields = '__all__'

class CareerRoadmapSerializer(serializers.ModelSerializer):
    milestones = MilestoneSerializer(many=True, read_only=True)
    
    class Meta:
        model = CareerRoadmap
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')

class CareerAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = CareerAnalysis
        fields = '__all__'
        read_only_fields = ('user', 'last_analysis_date')

class SkillAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillAssessment
        fields = '__all__'
        read_only_fields = ('user', 'last_updated')
