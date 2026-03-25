from rest_framework import viewsets, permissions
from .models import MarketData, UserMetricsUpload
from .serializers import MarketDataSerializer, UserMetricsUploadSerializer

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user == request.user

class MarketDataViewSet(viewsets.ModelViewSet):
    queryset = MarketData.objects.all()
    serializer_class = MarketDataSerializer
    permission_classes = [permissions.IsAuthenticated] # Market data is shared

class UserMetricsUploadViewSet(viewsets.ModelViewSet):
    queryset = UserMetricsUpload.objects.all()
    serializer_class = UserMetricsUploadSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)
