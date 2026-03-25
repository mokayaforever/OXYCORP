from django.contrib import admin
from django.urls import path, include
from rest_framework import routers

from apps.users.views import UserViewSet, UserProfileViewSet
from apps.ai_engine.views import CareerAnalysisViewSet, SkillAssessmentViewSet, CareerRoadmapViewSet, MilestoneViewSet
from apps.communication.views import ChatSessionViewSet, ChatMessageViewSet
from apps.market.views import MarketDataViewSet, UserMetricsUploadViewSet
from apps.matching.views import CollaborationMatchViewSet

router = routers.DefaultRouter()
# Users
router.register(r'users', UserViewSet)
router.register(r'profiles', UserProfileViewSet)
# AI Engine
router.register(r'career-analysis', CareerAnalysisViewSet)
router.register(r'skill-assessments', SkillAssessmentViewSet)
router.register(r'roadmaps', CareerRoadmapViewSet)
router.register(r'milestones', MilestoneViewSet)
# Communication
router.register(r'chat-sessions', ChatSessionViewSet)
router.register(r'chat-messages', ChatMessageViewSet)
# Market
router.register(r'market-data', MarketDataViewSet)
router.register(r'metrics-uploads', UserMetricsUploadViewSet)
# Matching
router.register(r'matches', CollaborationMatchViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api-auth/', include('rest_framework.urls')),
]
