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
        let fakeConvo = { otherUser: user, messages: [] };
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
    [setConversations, conversations],
  );

  const updateUnreadCount = (senderId) => {
    const unreadCount = conversations.find(
      (conversation) => conversation.otherUser.id === senderId,
    )?.unreadCount;

    return senderId !== user.id && senderId !== activeConversation
      ? unreadCount
        ? unreadCount + 1
        : 1
      : unreadCount;
  };

  const updateLastReadMessage = (conversationId, lastReadId) => {
    setConversations((prev) =>
      prev.map((convo) => {
        if (convo.id === conversationId) {
          const convoCopy = { ...convo };
          convoCopy.otherUser = { ...convoCopy.otherUser, lastReadId };
          return convoCopy;
        } else {
          return convo;
        }
      }),
    );
  };

  // const  = (data, body) => {
  //   socket.emit("read-message", {
  //     conversationId: data.message,
  //     lastReadId: body.recipientId,
  //     senderId: data.sender,
  //   });
  // };

  const addMessageToConversation = useCallback(
    (data) => {
      const { message, sender = null } = data;

      // if message came from another chat we update count of unread messages
      const unreadCount = updateUnreadCount(message.senderId);

      //if we recieved message in active chat we update read message
      // if (
      //   message.senderId !== user.id &&
      //   message.senderId=== activeConversation
      // )
      //   data = await saveLastReadMessage(message.conversationId, message.id);
      //   lastReadId = data.lastReadId;
      //

      // if sender isn't null, that means the message needs to be put in a brand new convo
      if (sender !== null) {
        const newConvo = {
          id: message.conversationId,
          otherUser: sender,
          messages: [message],
          unreadCount,
        };
        newConvo.latestMessageText = message.text;
        setConversations((prev) => [newConvo, ...prev]);
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
    [setConversations, conversations],
  );

  const setActiveChat = async (conversation) => {
    const lastReadId = conversation.messages
      .filter((message) => message.senderId === conversation.otherUser.id)
      .pop()?.id;

    if (conversation.id && lastReadId && lastReadId !== conversation.lastRead) {
      try {
        const data = await saveLastReadMessage(conversation.id, {
          lastReadId,
        });

        setConversations((prev) =>
          prev.map((convo) => {
            if (conversation.id === convo.id) {
              const convoCopy = { ...convo };
              convoCopy.unreadCount = 0;
              convoCopy.lastReadId = data.lastReadId;
              return convoCopy;
            } else {
              return convo;
            }
          }),
        );
      } catch (error) {
        console.error(error);
      }
    }

    setActiveConversation(conversation.otherUser.id);
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
  }, [addMessageToConversation, addOnlineUser, removeOfflineUser, socket]);

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
