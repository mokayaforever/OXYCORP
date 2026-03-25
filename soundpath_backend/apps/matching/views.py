from rest_framework import viewsets, permissions
from .models import CollaborationMatch
from .serializers import CollaborationMatchSerializer

class IsOwnerOrMatchedUser(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user == obj.user or request.user == obj.matched_user

class CollaborationMatchViewSet(viewsets.ModelViewSet):
    queryset = CollaborationMatch.objects.all()
    serializer_class = CollaborationMatchSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrMatchedUser]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        from django.db.models import Q
        return self.queryset.filter(Q(user=self.request.user) | Q(matched_user=self.request.user))
