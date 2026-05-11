from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import MarketData, UserMetricsUpload, Track
from .serializers import MarketDataSerializer, UserMetricsUploadSerializer, TrackSerializer
from services.market_intelligence import get_market_service
# from services.bunny_storage import BunnyStorage
import uuid

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

class TrackViewSet(viewsets.ModelViewSet):
    queryset = Track.objects.all()
    serializer_class = TrackSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def submit(self, request):
        """
        Submit a track with files uploaded to Bunny Storage
        """
        data = request.data.copy()
        # bunny = BunnyStorage()

        # Generate track ID
        track_id = 'OC-' + str(uuid.uuid4())[:8].upper()

        # Upload audio file
        audio_file = request.FILES.get('audio_file')
        if audio_file:
            # audio_url = bunny.upload_file(audio_file, f'tracks/{track_id}/audio/{audio_file.name}')
            data['audio_file_url'] = f'https://oxycorp.b-cdn.net/tracks/{track_id}/audio/{audio_file.name}'  # Placeholder

        # Upload cover art
        cover_file = request.FILES.get('cover_file')
        if cover_file:
            # cover_url = bunny.upload_file(cover_file, f'tracks/{track_id}/cover/{cover_file.name}')
            data['cover_art_url'] = f'https://oxycorp.b-cdn.net/tracks/{track_id}/cover/{cover_file.name}'  # Placeholder

        data['track_id'] = track_id
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

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
