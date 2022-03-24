from calendar import c
from django.contrib.auth.middleware import get_user
from django.http import HttpResponse, JsonResponse
from messenger_backend.models import Conversation
from rest_framework.views import APIView
from rest_framework.request import Request

class ConversationById(APIView):

    def put(self, request: Request, id: int):
        try:
            user = get_user(request)

            if user.is_anonymous:
                return HttpResponse(status=401)

            user_id = user.id
            conversation_id = id
            body = request.data
            last_read_id = body.get("lastReadId")
            
            conversation = Conversation.objects.filter(id=conversation_id).first()
            conversation.update_last_read(user_id, last_read_id)
            conversation.save()
            
            convo_dict = {
                "lastReadId": last_read_id,
                "readerId": user_id,
            }

            return JsonResponse({"conversation": convo_dict})
        except Exception as e:
            return HttpResponse(status=500)