from django.contrib import admin
from .models import CareerAnalysis, SkillAssessment, CareerRoadmap, Milestone

@admin.register(CareerAnalysis)
class CareerAnalysisAdmin(admin.ModelAdmin):
    list_display = ('user', 'career_score', 'status', 'last_analysis_date')
    list_filter = ('status',)

@admin.register(SkillAssessment)
class SkillAssessmentAdmin(admin.ModelAdmin):
    list_display = ('user', 'musical_skill_score', 'technical_skill_score', 'business_skill_score')

class MilestoneInline(admin.TabularInline):
    model = Milestone
    extra = 1

@admin.register(CareerRoadmap)
class CareerRoadmapAdmin(admin.ModelAdmin):
    list_display = ('user', 'time_horizon', 'total_revenue_target', 'created_at')
    inlines = [MilestoneInline]

@admin.register(Milestone)
class MilestoneAdmin(admin.ModelAdmin):
    list_display = ('title', 'roadmap', 'target_date', 'is_completed')
    list_filter = ('is_completed',)
