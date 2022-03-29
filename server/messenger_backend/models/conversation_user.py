from django.db import models
from django.db.models import Q

from . import utils
from .user import User
from .conversation import Conversation


class ConversationUser(utils.CustomModel):

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, db_column="userId", related_name="+"
    )
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, db_column="conversationId", related_name="+", 
    )

    lastReadMessage = models.IntegerField(null=True) 
