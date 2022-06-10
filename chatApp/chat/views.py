from django.shortcuts import render
 
# Create your views here.

def create_view(request):
    return render(request, 'chat/createRoom.html', {})


def room(request, room_name):
    return render(request, 'chat/main.html', {
            'room_name' : room_name
    })