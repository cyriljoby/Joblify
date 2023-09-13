import React, { useReducer, useContext, useEffect, useRef } from "react";

import reducer from "./reducer";
import axios from "axios";
import {
  GET_USERS_SUCCESS,
  GET_RESOURCE_SUCCESS,
  DISPLAY_ALERT,
  MAX_ALERT,
  CLEAR_ALERT,
  SETUP_USER_BEGIN,
  SETUP_USER_SUCCESS,
  SETUP_USER_ERROR,
  TOGGLE_SIDEBAR,
  LOGOUT_USER,
  UPDATE_USER_BEGIN,
  UPDATE_USER_SUCCESS,
  UPDATE_USER_ERROR,
  HANDLE_CHANGE,
  CLEAR_VALUES,
  CREATE_STORY_BEGIN,
  CREATE_STORY_SUCCESS,
  CREATE_STORY_ERROR,
  GET_STORIES_BEGIN,
  GET_SAVES_SUCCESS,
  GET_STORIES_SUCCESS,
  GET_LOGS_SUCCESS,
  SET_EDIT_STORY,
  DELETE_STORY_BEGIN,
  EDIT_STORY_BEGIN,
  EDIT_STORY_SUCCESS,
  EDIT_STORY_ERROR,
  SHOW_STATS_BEGIN,
  SHOW_STATS_SUCCESS,
  CLEAR_FILTERS,
  CHANGE_PAGE,
  GET_REPLIES_SUCCESS,
  GET_SUBREPLIES_SUCCESS,
  CREATE_LOG_SUCCESS,
  SET_EDIT_LOG,
  EDIT_LOG_SUCCESS,
  POPUP_SUCESS,
  CREATE_WEBSOCKET,
  GET_CURRENT_MESSAGES_SUCCESS,
  GET_CHATS_SUCCESS,
} from "./actions";

import { io } from "socket.io-client";
import {
  GiButterfly,
  GiDeer,
  GiDolphin,
  GiElephant,
  GiTortoise,
} from "react-icons/gi";
import { RiUserFill } from "react-icons/ri";

const token = localStorage.getItem("token");
const user = localStorage.getItem("user");

const initialState = {
  isLoading: false,
  showAlert: false,
  subreplyIds: [],
  alertText: "",
  alertType: "",
  user: user ? JSON.parse(user) : null,
  token: token,
  showSidebar: false,
  isEditing: false,
  editStoryId: "",
  editLogId: "",
  title: "",
  story: "",
  status: "pending",
  totalStories: 0,
  numOfPages: 1,
  page: 1,
  stats: {},
  monthlyApplications: [],
  search: "",
  searchStatus: "all",
  searchType: "all",
  sort: "latest",
  sortOptions: ["latest", "oldest", "a-z", "z-a"],
  reply: "",
  storyId: "",
  day: "",
  log: "",
  saves: [],
  resource: "",
  socket: null,
  currentMessages: [],
  currentChat: null,
  currentChats: [],
  displayGreeting: true,
  totalUnreadMessages: 0,
  showFilteredPopup: false,
  chatIsBot: false,
  botMessages: [
    {
      position: "left",
      type: "text",
      title: "Chat Bot",
      text:
        "Hey there! I'm your friendly chatbot here to lend a helping hand when " +
        "it comes to alcohol-related topics. Whether you have questions about alcohol addiction, " +
        "or just need someone to talk to, I'm here for you. Feel free to ask me anything, and " +
        "let's start the conversation!",
    },
  ],
  rawBotMessages: [
    {
      role: "assistant",
      content:
        "Hey there! I'm your friendly chatbot here to lend a helping hand when" +
        "it comes to alcohol-related topics. Whether you have questions about alcohol addiction," +
        "or just need someone to talk to, I'm here for you. Feel free to ask me anything, and" +
        "let's start the conversation!",
    },
  ],
};

const iconMap = {
  GiTortoise: <GiTortoise />,
  GiDeer: <GiDeer />,
  RiUserFill: <RiUserFill />,
  GiButterfly: <GiButterfly />,
  GiDolphin: <GiDolphin />,
  GiElephant: <GiElephant />,
  AiOutlineUser: <RiUserFill />,
};

const AppContext = React.createContext();

const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // axios
  const authFetch = axios.create({
    baseURL: "/api/v1",
  });
  // request

  authFetch.interceptors.request.use(
    (config) => {
      config.headers.common["Authorization"] = `Bearer ${state.token}`;
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
  // response

  authFetch.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      if (error.response.status === 401) {
        logoutUser();
      }
      return Promise.reject(error);
    }
  );

  const displayAlert = () => {
    dispatch({ type: DISPLAY_ALERT });
    clearAlert();
  };
  const maxAlert = () => {
    dispatch({ type: MAX_ALERT });
    clearAlert();
  };
  const clearAlert = () => {
    setTimeout(() => {
      dispatch({ type: CLEAR_ALERT });
    }, 3000);
  };

  const addUserToLocalStorage = ({ user, token }) => {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("image", JSON.stringify(user.image));
    localStorage.setItem("_id", JSON.stringify(user._id));
    localStorage.setItem("alias", JSON.stringify(user.alias));
    localStorage.setItem("token", token);
  };

  const removeUserFromLocalStorage = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const setupUser = async ({ currentUser, endPoint, alertText }) => {
    dispatch({ type: SETUP_USER_BEGIN });
    try {
      const { data } = await axios.post(
        `/api/v1/auth/${endPoint}`,
        currentUser
      );

      const { user, token } = data;
      dispatch({
        type: SETUP_USER_SUCCESS,
        payload: { user, token, alertText },
      });
      addUserToLocalStorage({ user, token });
    } catch (error) {
      dispatch({
        type: SETUP_USER_ERROR,
        payload: { msg: error.response.data.msg },
      });
    }
    clearAlert();
  };
  const toggleSidebar = () => {
    dispatch({ type: TOGGLE_SIDEBAR });
  };

  const logoutUser = () => {
    dispatch({ type: LOGOUT_USER });
    removeUserFromLocalStorage();
  };
  const updateUser = async (currentUser) => {
    dispatch({ type: UPDATE_USER_BEGIN });
    try {
      const { data } = await authFetch.patch("/auth/updateUser", currentUser);

      const { user, token } = data;

      dispatch({
        type: UPDATE_USER_SUCCESS,
        payload: { user, token },
      });
      addUserToLocalStorage({ user, token });
    } catch (error) {
      if (error.response.status !== 401) {
        dispatch({
          type: UPDATE_USER_ERROR,
          payload: { msg: error.response.data.msg },
        });
      }
    }
    clearAlert();
  };

  const userSocketRef = useRef(state.user);
  const currentChatsSocketRef = useRef(state.currentChats);
  const currentChatSocketRef = useRef(state.currentChat);
  const currentMessagesSocketRef = useRef(state.currentMessages);
  const totalUnreadMessagesSocketRef = useRef(state.totalUnreadMessages);
  const chatIsBotSocketRef = useRef(state.chatIsBot);
  const botMessagesSocketRef = useRef(state.botMessages);
  const rawBotMessagesSocketRef = useRef(state.rawBotMessages);

  useEffect(() => {
    userSocketRef.current = state.user;
  }, [state.user]);

  useEffect(() => {
    currentChatsSocketRef.current = state.currentChats;
  }, [state.currentChats]);

  useEffect(() => {
    currentChatSocketRef.current = state.currentChat;
  }, [state.currentChat]);

  useEffect(() => {
    currentMessagesSocketRef.current = state.currentMessages;
  }, [state.currentMessages]);

  useEffect(() => {
    totalUnreadMessagesSocketRef.current = state.totalUnreadMessages;
  }, [state.totalUnreadMessages]);

  useEffect(() => {
    chatIsBotSocketRef.current = state.chatIsBot;
  }, [state.chatIsBot]);

  useEffect(() => {
    botMessagesSocketRef.current = state.botMessages;
  }, [state.botMessages]);

  useEffect(() => {
    rawBotMessagesSocketRef.current = state.rawBotMessages;
  }, [state.rawBotMessages]);

  const createWebsocket = () => {
    try {
      const socket = io(`${window.location.origin}`, {
        path: "/socket",
        auth: {
          token: state.token,
        },
      });

      socket.on("connect", () => {
        console.log("connected to socket");
      });

      socket.on("disconnect", () => {
        console.log("disconnected from socket");
      });

      socket.on("connect_error", (error) => {
        console.log(error);
      });

      socket.on("error", (error) => {
        console.log(error);
      });

      socket.on("unauthorized", (error) => {
        console.log(error);
      });

      socket.on("message-filtered", ({ message }) => {
        console.log("message filtered");
        console.log(message);
        dispatch({
          type: HANDLE_CHANGE,
          payload: { name: "showFilteredPopup", value: true },
        });
      });

      socket.on("chat-bot-reply", ({ message, input }) => {
        if (chatIsBotSocketRef) {
          const botFormattedMessage = {
            position: "left",
            type: "text",
            title: "Chat Bot",
            text: message,
          };
          const formattedMessage = {
            position: "right",
            type: "text",
            title: "You",
            text: input,
          };

          const rawBotMessage = { role: "assistant", content: message };
          const rawUserMessage = { role: "user", content: input };

          dispatch({
            type: HANDLE_CHANGE,
            payload: {
              name: "botMessages",
              value: [
                ...botMessagesSocketRef.current,
                formattedMessage,
                botFormattedMessage,
              ],
            },
          });
          dispatch({
            type: HANDLE_CHANGE,
            payload: {
              name: "rawBotMessages",
              value: [
                ...rawBotMessagesSocketRef.current,
                rawUserMessage,
                rawBotMessage,
              ],
            },
          });
        }
      });

      const handleMessageReceived = ({ message, sender }) => {
        if (
          currentChatSocketRef.current &&
          message.chat === currentChatSocketRef.current.chatRoomId
        ) {
          const formattedMessage = {
            position:
              sender._id === userSocketRef.current._id ? "right" : "left",
            type: "text",
            title: sender.alias,
            text: message.content,
          };

          dispatch({
            type: HANDLE_CHANGE,
            payload: {
              name: "currentMessages",
              value: [...currentMessagesSocketRef.current, formattedMessage],
            },
          });
        } else {
          dispatch({
            type: HANDLE_CHANGE,
            payload: {
              name: "totalUnreadMessages",
              value: totalUnreadMessagesSocketRef.current + 1,
            },
          });
        }

        const updatedChats = [...currentChatsSocketRef.current]
          .map((chat) => {
            if (chat.chatRoomId === message.chat) {
              return {
                ...chat,
                latestMessage: message.content.substring(0, 20),
                unreadMessages:
                  currentChatSocketRef.current &&
                  chat.chatRoomId === currentChatSocketRef.current.chatRoomId
                    ? 0
                    : chat.unreadMessages + 1,
                latestUpdate: message.createdAt,
              };
            } else {
              return chat;
            }
          })
          .sort((a, b) => {
            return new Date(b.latestUpdate) - new Date(a.latestUpdate);
          });

        dispatch({
          type: HANDLE_CHANGE,
          payload: { name: "currentChats", value: updatedChats },
        });
      };

      const handleNewChatReceived = ({ chat, message, users }) => {
        const filteredUsers = users.filter((filterUser) => {
          return filterUser._id !== userSocketRef.current._id;
        });

        const formattedChat = {
          image: iconMap[filteredUsers[0].image],
          alias: filteredUsers[0].alias,
          userId: filteredUsers[0]._id,
          latestMessage: chat.latestMessage.substring(0, 20),
          draft: false,
          chatRoomId: chat._id,
          latestUpdate: chat.updatedAt,
        };

        const formattedMessage = {
          position:
            users[0]._id === userSocketRef.current._id ? "right" : "left",
          type: "text",
          title: users[0].alias,
          text: message.content,
        };

        const filteredChats = currentChatsSocketRef.current.filter(
          (filterChat) => filterChat.draft !== true
        );

        if (
          currentChatSocketRef.current &&
          currentChatSocketRef.current.draft &&
          currentChatSocketRef.current.userId === formattedChat.userId
        ) {
          formattedChat.unreadMessages = 0;
          dispatch({
            type: HANDLE_CHANGE,
            payload: {
              name: "currentChats",
              value: [formattedChat, ...filteredChats],
            },
          });
          dispatch({
            type: HANDLE_CHANGE,
            payload: { name: "currentChat", value: formattedChat },
          });
          dispatch({
            type: HANDLE_CHANGE,
            payload: { name: "currentMessages", value: [formattedMessage] },
          });
        } else if (
          currentChatSocketRef.current &&
          currentChatSocketRef.current.draft
        ) {
          formattedChat.unreadMessages = 1;
          dispatch({
            type: HANDLE_CHANGE,
            payload: {
              name: "currentChats",
              value: [
                currentChatSocketRef.current,
                formattedChat,
                ...filteredChats,
              ],
            },
          });
          dispatch({
            type: HANDLE_CHANGE,
            payload: {
              name: "totalUnreadMessages",
              value: totalUnreadMessagesSocketRef.current + 1,
            },
          });
        } else if (
          currentChatSocketRef.current &&
          currentChatSocketRef.current.userId !== formattedChat.userId
        ) {
          const filteredChats = currentChatsSocketRef.current.filter(
            (filterChat) =>
              filterChat.userId !== currentChatSocketRef.current.userId
          );
          formattedChat.unreadMessages = 1;
          dispatch({
            type: HANDLE_CHANGE,
            payload: {
              name: "currentChats",
              value: [
                formattedChat,
                currentChatSocketRef.current,
                ...filteredChats,
              ],
            },
          });
          dispatch({
            type: HANDLE_CHANGE,
            payload: {
              name: "totalUnreadMessages",
              value: totalUnreadMessagesSocketRef.current + 1,
            },
          });
        } else if (!currentChatSocketRef.current) {
          formattedChat.unreadMessages = 1;
          dispatch({
            type: HANDLE_CHANGE,
            payload: {
              name: "currentChats",
              value: [formattedChat, ...currentChatsSocketRef.current].filter(
                (value) => Object.keys(value).length !== 0
              ),
            },
          });
          dispatch({
            type: HANDLE_CHANGE,
            payload: {
              name: "totalUnreadMessages",
              value: totalUnreadMessagesSocketRef.current + 1,
            },
          });
        }
      };

      socket.on("new-message", handleMessageReceived);
      socket.on("new-chat", handleNewChatReceived);

      dispatch({ type: CREATE_WEBSOCKET, payload: { socket } });
    } catch (error) {
      console.log(error);
    }
  };

  const readChat = async ({ chatRoomId }) => {
    const { socket } = state;
    try {
      let numberOfUnreadMessages;

      const updatedChats = [...currentChatsSocketRef.current].map((chat) => {
        if (chat.chatRoomId === chatRoomId) {
          numberOfUnreadMessages =
            totalUnreadMessagesSocketRef.current - chat.unreadMessages;
          return {
            ...chat,
            unreadMessages: 0,
          };
        } else {
          return chat;
        }
      });

      const newCurrentChat = updatedChats.find(
        (chat) => chat.chatRoomId === chatRoomId
      );

      dispatch({
        type: HANDLE_CHANGE,
        payload: {
          name: "currentChat",
          value: newCurrentChat,
        },
      });
      dispatch({
        type: HANDLE_CHANGE,
        payload: {
          name: "currentChats",
          value: updatedChats,
        },
      });
      dispatch({
        type: HANDLE_CHANGE,
        payload: {
          name: "totalUnreadMessages",
          value: numberOfUnreadMessages < 0 ? 0 : numberOfUnreadMessages,
        },
      });

      socket.emit("read-chat", { chatRoomId: chatRoomId });
    } catch (error) {
      console.log(error);
    }
  };

  const getCurrentMessages = async ({ recipient }) => {
    const { user } = state;
    try {
      const { data } = await authFetch.get("chat/messages", {
        params: {
          recipient,
        },
      });

      const { messages } = data;

      if (messages && messages.length > 0) {
        const formattedMessages = messages.map((message) => {
          return {
            position: message.sender._id === user._id ? "right" : "left",
            type: "text",
            title: message.sender.alias,
            text: message.content,
          };
        });
        dispatch({
          type: HANDLE_CHANGE,
          payload: { name: "displayGreeting", value: false },
        });
        dispatch({
          type: HANDLE_CHANGE,
          payload: { name: "currentMessages", value: formattedMessages },
        });
      }

      if (messages && messages.length === 0) {
        dispatch({
          type: HANDLE_CHANGE,
          payload: { name: "displayGreeting", value: true },
        });
        dispatch({
          type: HANDLE_CHANGE,
          payload: { name: "currentMessages", value: [] },
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getChatRooms = async () => {
    try {
      const { currentChat } = state;
      const { data } = await authFetch.get("chat");

      const { chatToUnreads } = data;

      if (chatToUnreads && chatToUnreads.length > 0) {
        let totalUnreadMessages = 0;
        const formattedChats = [...chatToUnreads]
          .map(({ chat, unreadMessages }) => {
            totalUnreadMessages += unreadMessages;
            const filteredUsers = chat.users.filter(
              (filterUser) => filterUser._id !== JSON.parse(user)._id
            );
            return {
              image: iconMap[filteredUsers[0].image],
              alias: filteredUsers[0].alias,
              userId: filteredUsers[0]._id,
              latestMessage: chat.latestMessage,
              unreadMessages: unreadMessages,
              draft: false,
              chatRoomId: chat._id,
              latestUpdate: chat.updatedAt,
            };
          })
          .sort((a, b) => {
            return new Date(b.latestUpdate) - new Date(a.latestUpdate);
          });

        if (currentChat && currentChat.draft) {
          const chatsWithCurrentRecipient = formattedChats.filter(
            (chat) => chat.userId === currentChat.userId
          );

          if (chatsWithCurrentRecipient.length > 0) {
            const nonDraftChats = formattedChats.filter(
              (chat) => chat.userId !== currentChat.userId
            );
            const existingChat = nonDraftChats.find(
              (chat) => chat.userId === currentChat.userId
            );

            dispatch({
              type: HANDLE_CHANGE,
              payload: {
                name: "currentChats",
                value: [existingChat, ...nonDraftChats],
              },
            });
            dispatch({
              type: HANDLE_CHANGE,
              payload: { name: "currentChat", value: existingChat },
            });
          } else {
            dispatch({
              type: HANDLE_CHANGE,
              payload: {
                name: "currentChats",
                value: [currentChat, ...formattedChats],
              },
            });
          }
        } else {
          dispatch({
            type: HANDLE_CHANGE,
            payload: { name: "currentChats", value: formattedChats },
          });
        }

        dispatch({
          type: HANDLE_CHANGE,
          payload: { name: "totalUnreadMessages", value: totalUnreadMessages },
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleChange = ({ name, value }) => {
    dispatch({ type: HANDLE_CHANGE, payload: { name, value } });
  };
  const clearValues = () => {
    dispatch({ type: CLEAR_VALUES });
  };
  const createStory = async () => {
    const alias = localStorage.getItem("alias").slice(1, -1);
    const image = localStorage.getItem("image").slice(1, -1);
    const { user } = state;
    const createdBy = user._id;

    try {
      let resource = "";
      dispatch({
        type: GET_RESOURCE_SUCCESS,
        payload: {
          resource,
        },
      });
      const { title, story } = state;
      await authFetch.post("/stories", {
        title,
        story,
        createdBy,
      });
      dispatch({ type: CREATE_STORY_SUCCESS });
      dispatch({ type: CLEAR_VALUES });
      findResource(story);
    } catch (error) {
      if (error.response.status === 401) return;
      dispatch({
        type: CREATE_STORY_ERROR,
        payload: { msg: error.response.data.msg },
      });
      if (error.response.status === 429) {
        dispatch({
          type: CREATE_STORY_ERROR,
          payload: {
            msg: "Try again later. You can only post a story once every 5 minutes.",
            warning: false,
          },
        });
      }
    }

    clearAlert();
  };

  const createLog = async () => {
    const { day, log } = state;
    const { user } = state;
    const createdBy = user._id;
    dispatch({ type: CREATE_STORY_BEGIN });
    if (isNaN(day)) {
      dispatch({
        type: CREATE_STORY_ERROR,
        payload: { msg: "Day Must be an Integer.", warning: false },
      });
    } else {
      try {
        let resource = "";
        dispatch({
          type: GET_RESOURCE_SUCCESS,
          payload: {
            resource,
          },
        });
        await authFetch.post("/stories/log", {
          day,
          log,
          createdBy,
        });
        if (day == 1 || day % 10 === 0) {
          findResource(log);
        }

        dispatch({ type: CREATE_LOG_SUCCESS });
        dispatch({ type: CLEAR_VALUES });
      } catch (error) {
        if (error.response.status === 401) return;
        if (error.response.status === 400) {
          dispatch({
            type: CREATE_STORY_ERROR,
            payload: {
              msg: "Try again later. You can only post a Dear Sobriety once every 5 minutes.",
              warning: false,
            },
          });
        }
      }
    }
    clearAlert();
  };

  const createReply = async (storyId, reply) => {
    const { user } = state;
    const createdBy = user._id;
    console.log(user);
    dispatch({ type: CREATE_STORY_BEGIN });
    try {
      await authFetch.post("/reply", {
        reply,
        storyId,
        createdBy,
      });
    } catch (error) {
      if (error.response.status === 401) return;
    }
  };

  const addSave = async (savedId) => {
    const { user } = state;
    const createdBy = user._id;
    dispatch({ type: CREATE_STORY_BEGIN });
    try {
      await authFetch.post("/stories/save", {
        savedId,
        createdBy,
      });
      getSaves();
    } catch (error) {
      if (error.response.status === 401) return;
    }
  };

  const createSubReply = async (subreply, replyId, createdByReplyId) => {
    const { user } = state;
    const createdBy = user._id;
    dispatch({ type: CREATE_STORY_BEGIN });
    try {
      await authFetch.post("/reply/sub", {
        subreply,
        replyId,
        createdByReplyId,
        createdBy,
      });
      // dispatch({ type: CLEAR_VALUES });
    } catch (error) {
      if (error.response.status === 401) return;
    }
  };

  const getStories = async (userId) => {
    const { page, search, searchStatus, searchType, sort } = state;

    let url = `/stories?page=${page}&status=${searchStatus}&jobType=${searchType}&sort=${sort}`;
    if (search) {
      url = url + `&search=${search}`;
    }
    dispatch({ type: GET_STORIES_BEGIN });
    try {
      const { data } = await authFetch(url, { userId });
      const { stories } = data;
      dispatch({
        type: GET_STORIES_SUCCESS,
        payload: {
          stories,
        },
      });
    } catch (error) {
      logoutUser();
    }
  };

  const getLogs = async (userId) => {
    const { page, search, searchStatus, searchType, sort } = state;

    let url = `/stories?page=${page}&status=${searchStatus}&jobType=${searchType}&sort=${sort}`;

    dispatch({ type: GET_STORIES_BEGIN });
    try {
      const { data } = await authFetch(url, { userId });
      const { logs } = data;
      dispatch({
        type: GET_LOGS_SUCCESS,
        payload: {
          logs,
        },
      });
    } catch (error) {
      logoutUser();
    }
  };

  const getReplies = async () => {
    let url = `/stories`;

    dispatch({ type: GET_STORIES_BEGIN });
    try {
      const { data } = await authFetch(url);
      const { replies } = data;

      dispatch({
        type: GET_REPLIES_SUCCESS,
        payload: {
          replies,
        },
      });
    } catch (error) {
      logoutUser();
    }
    // clearAlert();
  };

  const getSaves = async () => {
    let url = `/stories/getSave`;
    const { user } = state;
    const createdBy = user._id;

    dispatch({ type: GET_STORIES_BEGIN });
    try {
      const { data } = await authFetch.post(url, { createdBy });
      const { saves } = data;

      dispatch({
        type: GET_SAVES_SUCCESS,
        payload: {
          saves,
        },
      });
    } catch (error) {
      logoutUser();
    }
    // clearAlert();
  };

  const getSubReplies = async () => {
    let url = `/stories`;
    const { subreplyIds } = state;

    dispatch({ type: GET_STORIES_BEGIN });
    try {
      const { data } = await authFetch(url);
      const { subreplies } = data;

      subreplyIds.length = 0;
      subreplies?.map((subreply, index) => {
        subreplyIds.push(subreply["replyId"]);
      });

      dispatch({
        type: GET_SUBREPLIES_SUCCESS,
        payload: {
          subreplies,
          subreplyIds,
        },
      });
    } catch (error) {
      logoutUser();
    }
    // clearAlert();
  };

  const getUsers = async (userId) => {
    const { page, search, searchStatus, searchType, sort } = state;

    let url = `/stories?page=${page}&status=${searchStatus}&jobType=${searchType}&sort=${sort}&id=${userId}`;
    if (search) {
      url = url + `&search=${search}`;
    }
    dispatch({ type: GET_STORIES_BEGIN });
    try {
      const { data } = await authFetch(url);

      const { users } = data;
      dispatch({
        type: GET_USERS_SUCCESS,
        payload: {
          users,
        },
      });
    } catch (error) {
      logoutUser();
    }
  };

  const findResource = async (prompt) => {
    let resource = "";
    dispatch({
      type: GET_RESOURCE_SUCCESS,
      payload: {
        resource,
      },
    });
    try {
      const { data } = await axios.post(`/find-resource`, { prompt });
      resource = data.data.choices[0].text;
      dispatch({
        type: GET_RESOURCE_SUCCESS,
        payload: {
          resource,
        },
      });
    } catch (error) {
      // logoutUser();
    }
  };
  const setEditJob = (id) => {
    dispatch({ type: SET_EDIT_STORY, payload: { id } });
  };

  const setEditLog = (id) => {
    dispatch({ type: SET_EDIT_LOG, payload: { id } });
  };
  const editJob = async () => {
    dispatch({ type: EDIT_STORY_BEGIN });

    try {
      const { title, story } = state;
      await authFetch.patch(`/stories/${state.editStoryId}`, {
        story,
        title,
      });
      dispatch({ type: EDIT_STORY_SUCCESS });
      dispatch({ type: CLEAR_VALUES });
    } catch (error) {
      if (error.response.status === 401) return;
      dispatch({
        type: EDIT_STORY_ERROR,
        payload: { msg: error.response.data.msg },
      });
    }
    clearAlert();
  };

  const editLog = async () => {
    dispatch({ type: EDIT_STORY_BEGIN });
    try {
      const { day, log } = state;
      await authFetch.patch(`/stories/log/${state.editLogId}`, {
        day,
        log,
      });
      dispatch({ type: EDIT_LOG_SUCCESS });
      dispatch({ type: CLEAR_VALUES });
    } catch (error) {
      if (error.response.status === 401) return;
      dispatch({
        type: EDIT_STORY_ERROR,
        payload: { msg: error.response.data.msg },
      });
    }
    clearAlert();
  };
  const deleteJob = async (jobId) => {
    dispatch({ type: DELETE_STORY_BEGIN });
    try {
      await authFetch.delete(`/stories/${jobId}`);
      // deleteReplybyStory(jobId)
      getStories();
    } catch (error) {
      // logoutUser();
    }
  };
  const closePopup = async () => {
    const { user } = state;
    try {
      let userId = user._id;
      const { data } = await authFetch.post(`/auth/popup`, { userId });
      let newUser = data.user;
      dispatch({
        type: POPUP_SUCESS,
        payload: {
          newUser,
        },
      });
      localStorage.setItem("user", JSON.stringify(newUser));
    } catch (error) {
      logoutUser();
    }
  };

  const deleteSave = async (id) => {
    dispatch({ type: DELETE_STORY_BEGIN });
    try {
      await authFetch.delete(`/stories/save/${id}`);
      getSaves();
    } catch (error) {
      // logoutUser();
    }
  };

  const deleteLog = async (logId) => {
    dispatch({ type: DELETE_STORY_BEGIN });
    try {
      await authFetch.delete(`/stories/log/${logId}`);
      // deleteReplybyStory(jobId)
      getLogs();
    } catch (error) {
      // logoutUser();
    }
  };

  const deleteReply = async (replyId) => {
    dispatch({ type: DELETE_STORY_BEGIN });
    try {
      await authFetch.delete(`/reply/${replyId}`);
      getReplies();
    } catch (error) {}
  };

  const deleteSubReply = async (replyId) => {
    dispatch({ type: DELETE_STORY_BEGIN });
    try {
      await authFetch.delete(`/reply/sub/${replyId}`);
      getSubReplies();
    } catch (error) {}
  };
  const deleteReplybyStory = async (storyId) => {
    dispatch({ type: DELETE_STORY_BEGIN });
    try {
      await authFetch.delete(`/reply/${storyId}`);
    } catch (error) {}
  };
  const showStats = async () => {
    dispatch({ type: SHOW_STATS_BEGIN });
    try {
      const { data } = await authFetch("/stories/stats");
      dispatch({
        type: SHOW_STATS_SUCCESS,
        payload: {
          stats: data.defaultStats,
          monthlyApplications: data.monthlyApplications,
        },
      });
    } catch (error) {
      logoutUser();
    }
    clearAlert();
  };
  const clearFilters = () => {
    dispatch({ type: CLEAR_FILTERS });
  };
  const changePage = (page) => {
    dispatch({ type: CHANGE_PAGE, payload: { page } });
  };
  return (
    <AppContext.Provider
      value={{
        ...state,
        displayAlert,
        setupUser,
        toggleSidebar,
        logoutUser,
        updateUser,
        handleChange,
        clearValues,
        createStory,
        getStories,
        setEditJob,
        deleteJob,
        editJob,
        showStats,
        clearFilters,
        changePage,
        maxAlert,
        getUsers,
        createReply,
        getReplies,
        deleteReply,
        deleteReplybyStory,
        createSubReply,
        getSubReplies,
        deleteSubReply,
        createLog,
        getLogs,
        editLog,
        setEditLog,
        deleteLog,
        addSave,
        getSaves,
        deleteSave,
        findResource,
        closePopup,
        createWebsocket,
        getCurrentMessages,
        getChatRooms,
        readChat,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

const useAppContext = () => {
  return useContext(AppContext);
};

export { AppProvider, initialState, useAppContext };
