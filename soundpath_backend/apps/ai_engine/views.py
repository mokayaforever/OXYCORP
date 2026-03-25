from rest_framework import viewsets, permissions
from .models import CareerAnalysis, SkillAssessment, CareerRoadmap, Milestone
from .serializers import CareerAnalysisSerializer, SkillAssessmentSerializer, CareerRoadmapSerializer, MilestoneSerializer

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        # Milestone doesn't have 'user', its roadmap does
        user = getattr(obj, 'user', None)
        if not user and hasattr(obj, 'roadmap'):
            user = obj.roadmap.user
        return user == request.user

class CareerAnalysisViewSet(viewsets.ModelViewSet):
    queryset = CareerAnalysis.objects.all()
    serializer_class = CareerAnalysisSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

class SkillAssessmentViewSet(viewsets.ModelViewSet):
    queryset = SkillAssessment.objects.all()
    serializer_class = SkillAssessmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

class CareerRoadmapViewSet(viewsets.ModelViewSet):
    queryset = CareerRoadmap.objects.all()
    serializer_class = CareerRoadmapSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

class MilestoneViewSet(viewsets.ModelViewSet):
    queryset = Milestone.objects.all()
    serializer_class = MilestoneSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
