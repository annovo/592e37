import React from "react";
import { Box } from "@material-ui/core";
import { BadgeAvatar, ChatContent, UnreadMessages } from "../Sidebar";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    borderRadius: 8,
    height: 80,
    boxShadow: "0 2px 10px 0 rgba(88,133,196,0.05)",
    marginBottom: 10,
    display: "flex",
    alignItems: "center",
    "&:hover": {
      cursor: "grab",
    },
  },
  bubble: {
    backgroundColor: " #007FFF",
    borderRadius: "46%",
    height: 24,
    marginRight: 17,
  },
  text: {
    fontSize: 12,
    color: "#FFFFFF",
    padding: "3px 8px 0px 8px",
    letterSpacing: -0.17,
  },
}));

const Chat = ({ conversation, setActiveChat }) => {
  const classes = useStyles();
  const { otherUser } = conversation;
  const isUnread = conversation.unreadCount && conversation.unreadCount !== 0;

  const handleClick = async (conversation) => {
    await setActiveChat(conversation);
  };

  return (
    <Box onClick={() => handleClick(conversation)} className={classes.root}>
      <BadgeAvatar
        photoUrl={otherUser.photoUrl}
        username={otherUser.username}
        online={otherUser.online}
        sidebar={true}
      />
      <ChatContent conversation={conversation} isUnread={isUnread} />
      {isUnread ? <UnreadMessages count={conversation.unreadCount} /> : null}
    </Box>
  );
};

export default Chat;
