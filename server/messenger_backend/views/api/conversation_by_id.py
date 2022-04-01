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
            last_read = body.get("lastRead")

            conversation = Conversation.objects.filter(id=conversation_id).first()

            if conversation.user1_id != user_id and conversation.user2_id != user_id:
                return HttpResponse(status=401)

            conversation.update_last_read(user_id, last_read)
            conversation.save()

            convo_dict = {
                "lastRead": last_read,
                "readerId": user_id,
            }

            return JsonResponse({"conversation": convo_dict})
        except Exception as e:
            return HttpResponse(status=500)
