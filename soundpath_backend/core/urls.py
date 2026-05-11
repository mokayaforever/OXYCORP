from django.contrib import admin
from django.urls import path, include
from rest_framework import routers

from apps.users.views import UserViewSet, UserProfileViewSet, login_view, register_view, logout_view, session_view
from apps.ai_engine.views import CareerAnalysisViewSet, SkillAssessmentViewSet, CareerRoadmapViewSet, MilestoneViewSet
from apps.communication.views import ChatSessionViewSet, ChatMessageViewSet
from apps.market.views import MarketDataViewSet, UserMetricsUploadViewSet, TrackViewSet
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
router.register(r'tracks', TrackViewSet)
# Matching
router.register(r'matches', CollaborationMatchViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/login', login_view, name='login'),
    path('api/register', register_view, name='register'),
    path('api/logout', logout_view, name='logout'),
    path('api/session', session_view, name='session'),
    path('api-auth/', include('rest_framework.urls')),
]
