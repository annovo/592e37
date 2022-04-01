import React, { useCallback, useEffect, useState, useContext } from "react";
import axios from "axios";
import { useHistory } from "react-router-dom";
import { Grid, CssBaseline, Button } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

import { SidebarContainer } from "../components/Sidebar";
import { ActiveChat } from "../components/ActiveChat";
import { SocketContext } from "../context/socket";
import moment from "moment";

const useStyles = makeStyles((theme) => ({
  root: {
    height: "100vh",
  },
}));

const Home = ({ user, logout }) => {
  const history = useHistory();

  const socket = useContext(SocketContext);

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);

  const classes = useStyles();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const addSearchedUsers = (users) => {
    const currentUsers = {};

    // make table of current users so we can lookup faster
    conversations.forEach((convo) => {
      currentUsers[convo.otherUser.id] = true;
    });

    const newState = [...conversations];
    users.forEach((user) => {
      // only create a fake convo if we don't already have a convo with this user
      if (!currentUsers[user.id]) {
        let fakeConvo = { otherUser: user, messages: [], unreadCount: 0 };
        newState.push(fakeConvo);
      }
    });

    setConversations(newState);
  };

  const clearSearchedUsers = () => {
    setConversations((prev) => prev.filter((convo) => convo.id));
  };

  const saveMessage = async (body) => {
    const { data } = await axios.post("/api/messages", body);
    return data;
  };

  const saveLastReadMessage = async (id, body) => {
    const { data } = await axios.put(`/api/conversations/${id}`, body);
    return data;
  };

  const sendMessage = (data, body) => {
    socket.emit("new-message", {
      message: data.message,
      recipientId: body.recipientId,
      sender: data.sender,
    });
  };

  const setReadMessage = useCallback(
    (data, id) => {
      socket.emit("read-message", {
        lastRead: data.lastRead,
        readerId: data.readerId,
        conversationId: id,
      });
    },
    [socket],
  );

  const postMessage = async (body) => {
    try {
      const data = await saveMessage(body);

      if (!body.conversationId) {
        addNewConvo(body.recipientId, data.message);
      } else {
        addMessageToConversation(data);
      }

      sendMessage(data, body);
    } catch (error) {
      console.error(error);
    }
  };

  const addNewConvo = useCallback(
    (recipientId, message) => {
      setConversations((prev) =>
        prev.map((convo) => {
          if (convo.otherUser.id === recipientId) {
            const convoCopy = { ...convo };
            convoCopy.messages = [...convoCopy.messages, message];
            convoCopy.id = message.conversationId;
            convoCopy.latestMessageText = message.text;
            return convoCopy;
          } else {
            return convo;
          }
        }),
      );
    },
    [setConversations],
  );

  const updateUnreadCount = useCallback(
    (convo, senderId) => {
      const unreadCount = convo ? convo.unreadCount : 0;

      if (senderId === user.id || senderId === activeConversation)
        return unreadCount;

      return unreadCount + 1;
    },
    [user, activeConversation],
  );

  const updateLastReadMessage = useCallback(
    ({ lastRead, readerId, conversationId }) => {
      if (readerId !== user.id) {
        setConversations((prev) =>
          prev.map((convo) => {
            if (convo.id === conversationId) {
              const convoCopy = { ...convo };
              convoCopy.otherUser = { ...convoCopy.otherUser, lastRead };
              return convoCopy;
            } else {
              return convo;
            }
          }),
        );
      }
    },
    [user, setConversations],
  );

  const saveReadMessage = useCallback(
    async (conversationId, lastRead) => {
      try {
        const data = await saveLastReadMessage(conversationId, {
          lastRead,
        });

        setConversations((prev) =>
          prev.map((convo) => {
            if (conversationId === convo.id) {
              const convoCopy = { ...convo };
              convoCopy.unreadCount = 0;
              convoCopy.lastRead = data.conversation.lastRead;
              return convoCopy;
            } else {
              return convo;
            }
          }),
        );

        setReadMessage(data.conversation, conversationId);
      } catch (error) {
        console.error(error);
      }
    },
    [setConversations, setReadMessage],
  );

  const addMessageToConversation = useCallback(
    async (data) => {
      const { message, sender = null, recipientId } = data;

      if (recipientId !== user.id && message.senderId !== user.id) return;

      let conversation = conversations.find(
        (convo) => convo.id === message.conversationId,
      );

      // if message came from another chat we update count of unread messages
      const unreadCount = updateUnreadCount(conversation, message.senderId);

      //if we recieved message in active chat we update read message
      if (activeConversation === message.senderId)
        await saveReadMessage(message.conversationId, message.id);

      // if sender isn't null, that means the message needs to be put in a brand new convo
      if (sender !== null && !conversation) {
        conversation = conversations.find(
          (convo) => convo.otherUser.id === message.senderId,
        );

        if (conversation)
          return setConversations((prev) =>
            prev.map((convo) => {
              if (convo.otherUser.id === message.senderId) {
                const convoCopy = { ...convo };
                convoCopy.id = message.conversationId;
                convoCopy.messages = [...convoCopy.messages, message];
                convoCopy.latestMessageText = message.text;
                convoCopy.unreadCount = unreadCount;
                return convoCopy;
              } else {
                return convo;
              }
            }),
          );
        const newConvo = {
          id: message.conversationId,
          otherUser: sender,
          messages: [message],
          unreadCount,
        };
        newConvo.latestMessageText = message.text;
        return setConversations((prev) => [newConvo, ...prev]);
      }

      setConversations((prev) =>
        prev.map((convo) => {
          if (convo.id === message.conversationId) {
            const convoCopy = { ...convo };
            convoCopy.messages = [...convoCopy.messages, message];
            convoCopy.latestMessageText = message.text;
            convoCopy.unreadCount = unreadCount;
            return convoCopy;
          } else {
            return convo;
          }
        }),
      );
    },
    [
      setConversations,
      activeConversation,
      saveReadMessage,
      updateUnreadCount,
      user.id,
      conversations,
    ],
  );

  const findLastRead = (messages, otherUserId) => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.senderId === otherUserId) return message.id;
    }
    return null;
  };

  const setActiveChat = async (conversation) => {
    setActiveConversation(conversation.otherUser.id);

    const lastRead = findLastRead(
      conversation.messages,
      conversation.otherUser.id,
    );

    if (conversation.id && lastRead && lastRead !== conversation.lastRead) {
      await saveReadMessage(conversation.id, lastRead);
    }
  };

  const addOnlineUser = useCallback((id) => {
    setConversations((prev) =>
      prev.map((convo) => {
        if (convo.otherUser.id === id) {
          const convoCopy = { ...convo };
          convoCopy.otherUser = { ...convoCopy.otherUser, online: true };
          return convoCopy;
        } else {
          return convo;
        }
      }),
    );
  }, []);

  const removeOfflineUser = useCallback((id) => {
    setConversations((prev) =>
      prev.map((convo) => {
        if (convo.otherUser.id === id) {
          const convoCopy = { ...convo };
          convoCopy.otherUser = { ...convoCopy.otherUser, online: false };
          return convoCopy;
        } else {
          return convo;
        }
      }),
    );
  }, []);

  // Lifecycle

  useEffect(() => {
    // Socket init
    socket.on("add-online-user", addOnlineUser);
    socket.on("remove-offline-user", removeOfflineUser);
    socket.on("new-message", addMessageToConversation);
    socket.on("read-message", updateLastReadMessage);

    return () => {
      // before the component is destroyed
      // unbind all event handlers used in this component
      socket.off("add-online-user", addOnlineUser);
      socket.off("remove-offline-user", removeOfflineUser);
      socket.off("new-message", addMessageToConversation);
      socket.off("read-message", updateLastReadMessage);
    };
  }, [
    addMessageToConversation,
    addOnlineUser,
    updateLastReadMessage,
    removeOfflineUser,
    socket,
  ]);

  useEffect(() => {
    // when fetching, prevent redirect
    if (user?.isFetching) return;

    if (user && user.id) {
      setIsLoggedIn(true);
    } else {
      // If we were previously logged in, redirect to login instead of register
      if (isLoggedIn) history.push("/login");
      else history.push("/register");
    }
  }, [user, history, isLoggedIn]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data } = await axios.get("/api/conversations");
        data.forEach((conversation) =>
          conversation.messages.sort(
            (a, b) => moment(a.createdAt) - moment(b.createdAt),
          ),
        );
        setConversations(data);
      } catch (error) {
        console.error(error);
      }
    };
    if (!user.isFetching) {
      fetchConversations();
    }
  }, [user]);

  const handleLogout = async () => {
    if (user && user.id) {
      await logout(user.id);
    }
  };

  return (
    <>
      <Button onClick={handleLogout}>Logout</Button>
      <Grid container component="main" className={classes.root}>
        <CssBaseline />
        <SidebarContainer
          conversations={conversations}
          user={user}
          clearSearchedUsers={clearSearchedUsers}
          addSearchedUsers={addSearchedUsers}
          setActiveChat={setActiveChat}
        />
        <ActiveChat
          conversations={conversations}
          activeConversation={activeConversation}
          user={user}
          postMessage={postMessage}
        />
      </Grid>
    </>
  );
};

export default Home;
