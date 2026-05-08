from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import MarketData, UserMetricsUpload
from .serializers import MarketDataSerializer, UserMetricsUploadSerializer
from services.market_intelligence import get_market_service

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user == request.user

class MarketDataViewSet(viewsets.ModelViewSet):
    queryset = MarketData.objects.all()
    serializer_class = MarketDataSerializer
    permission_classes = [permissions.IsAuthenticated] # Market data is shared

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def intelligence(self, request):
        """
        Fetch live market intelligence data from internet sources
        GET /api/market-data/intelligence/
        """
        try:
            service = get_market_service()
            data = service.get_market_data()
            return Response({
                'success': True,
                'data': data,
                'timestamp': data['last_updated']
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'data': {
                    'genres': [],
                    'trending_tracks': [],
                    'ticker': [],
                    'sources': ['error']
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserMetricsUploadViewSet(viewsets.ModelViewSet):
    queryset = UserMetricsUpload.objects.all()
    serializer_class = UserMetricsUploadSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)
