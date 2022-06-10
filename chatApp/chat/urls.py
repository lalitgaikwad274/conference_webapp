from unicodedata import name
from django.urls import path
from . import views

urlpatterns = [
    path('', views.create_view, name ='create_view'),
    path('<str:room_name>/',views.room, name = 'room'),
]