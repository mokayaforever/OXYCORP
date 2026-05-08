from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from .models import User, UserProfile
from .serializers import UserSerializer, UserProfileSerializer

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        # Profile has 'user', User is the object itself
        owner = getattr(obj, 'user', obj)
        return owner == request.user

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({'success': False, 'message': 'Email and password are required'})
    
    # Authenticate using email as username (since we're using email for login)
    user = authenticate(request, username=email, password=password)
    
    if user:
        login(request, user)
        serializer = UserSerializer(user)
        return Response({
            'success': True,
            'user': serializer.data
        })
    else:
        return Response({'success': False, 'message': 'Invalid credentials'})

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_view(request):
    name = request.data.get('name')
    email = request.data.get('email')
    password = request.data.get('password')
    role = request.data.get('role', 'artist')
    genre = request.data.get('genre')
    experience = request.data.get('experience')
    
    if not name or not email or not password:
        return Response({'success': False, 'message': 'Name, email, and password are required'})
    
    if User.objects.filter(email=email).exists():
        return Response({'success': False, 'message': 'Email already exists'})
    
    # Create user
    user = User.objects.create_user(
        username=email,  # Use email as username
        email=email,
        password=password,
        first_name=name.split(' ')[0],
        last_name=' '.join(name.split(' ')[1:]) if len(name.split(' ')) > 1 else '',
        artist_name=name
    )
    
    # Create profile if additional data provided
    if genre or experience:
        UserProfile.objects.create(
            user=user,
            genre=genre,
            career_stage=experience
        )
    
    return Response({'success': True})

@api_view(['GET'])
def session_view(request):
    if request.user.is_authenticated:
        serializer = UserSerializer(request.user)
        return Response({'user': serializer.data})
    return Response({'user': None})

@api_view(['POST'])
def logout_view(request):
    from django.contrib.auth import logout
    logout(request)
    return Response({'success': True})
