import "react-chat-elements/dist/main.css";
import { Button, Input, MessageList } from "react-chat-elements";
import {
  GiButterfly,
  GiDeer,
  GiDolphin,
  GiElephant,
  GiTortoise,
} from "react-icons/gi";
import ChatList from "../../components/ChatList";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAppContext } from "../../context/appContext";
import queryString from "query-string";
import { RiUserFill } from "react-icons/ri";
import Popup from "reactjs-popup";

const iconMap = {
  GiTortoise: <GiTortoise />,
  GiDeer: <GiDeer />,
  RiUserFill: <RiUserFill />,
  GiButterfly: <GiButterfly />,
  GiDolphin: <GiDolphin />,
  GiElephant: <GiElephant />,
  AiOutlineUser: <RiUserFill />,
};

const DirectMessages = () => {
  const {
    socket,
    getChatRooms,
    currentMessages,
    getCurrentMessages,
    user,
    currentChat,
    currentChats,
    handleChange,
    displayGreeting,
    showFilteredPopup
  } = useAppContext();

  const messagesEndRef = useRef(null);

  const [chatInput, setChatInput] = useState("");

  const location = useLocation();

  useEffect(() => {
    if (location.search) {
      const parsed = queryString.parse(location.search);
      if (parsed.recipient && parsed.alias && parsed.icon) {
        const chatDraft = {
          image: iconMap[parsed.icon],
          alias: parsed.alias,
          userId: parsed.recipient,
          draft: true,
        };

        const cleanedChats = currentChats.filter((chat) => !chat.draft);

        handleChange({
          name: "displayGreeting",
          value: false,
        });

        handleChange({
          name: "currentChat",
          value: chatDraft,
        });

        handleChange({
          name: "currentChats",
          value: [chatDraft, ...cleanedChats],
        });
      }
    }

    return () => {
      handleChange({
        name: "currentChat",
        value: null,
      });

      handleChange({
        name: "currentMessages",
        value: [],
      });

      handleChange({
        name: "displayGreeting",
        value: true,
      });
    };
  }, []);

  useEffect(() => {
    if (currentChat) {
      if (currentChat.draft) {
        const nonDraftChats = currentChats.filter(
          (chat) => chat.draft !== true
        );
        const existingChat = nonDraftChats.find(
          (chat) => ((chat.userId === currentChat.userId) && !chat.draft)
        );

        if (existingChat) {
          handleChange({
            name: "currentChats",
            value: nonDraftChats,
          });

          handleChange({
            name: "currentChat",
            value: existingChat,
          });

          changeChat(existingChat.userId);
        }
      }
      handleChange({
        name: "displayGreeting",
        value: false,
      });
    }
  }, [currentChats, currentChat]);


  useEffect(() => {
    if (currentMessages && currentMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentMessages]);


  const changeChat = (recipient) => {
    const chat = currentChats.find((chat) => chat.userId === recipient && !chat.draft);
    if (
      chat &&
      ((currentChat && currentChat.userId !== chat.userId) || (!currentChat || currentChat.draft))
    ) {
      console.log("Changing chat");
      // TODO: change chat color etc to indicate active chat

      socket.emit("read-chat", { chatRoomId: chat.chatRoomId });

      handleChange({
        name: "currentChat",
        value: chat,
      });

      handleChange({
        name: "displayGreeting",
        value: false,
      });

      getCurrentMessages({
        recipient: chat.userId,
      });
    }
  };

  const sendMessage = () => {
    if (currentChat === null || displayGreeting) {
      return;
    }

    if (socket && socket.connected) {
      if (chatInput && chatInput.length > 0) {
        if (socket && socket.connected) {
          if (currentChat.draft) {
            const chatRoom = {
              recipient: currentChat.userId,
              initialMessage: chatInput,
            };

            console.log("Creating chat");

            socket.emit("create-chat", chatRoom);
            setChatInput("");

            // TODO: handle and display errors creating a chat
          } else {
            const chatRoomId = currentChat.chatRoomId;

            console.log("Sending message");

            socket.emit("create-message", { chatRoomId, content: chatInput });
            setChatInput("");

            // TODO: handle and display errors creating messages
          }
        }
      }
    }
  };

  const closePop = () => {
    handleChange({
      name: "showFilteredPopup",
      value: false,
    });
  }

  function RenderPopup() {
    if (showFilteredPopup) {
      return (
        <Popup disableBackdropClick backdrop="static" open={true} modal nested>
          {(close) => (
            <div
              className="modal"
              style={{
                maxWidth: "90vw",
                background: "#ffffff",
                padding: "2rem",
              }}
            >
              <button
                className="close"
                onClick={() => {
                  close();
                  closePop();
                }}
                style={{fontSize: "1.5rem"}}
              >
                &times;
              </button>
              {/* <h3 className="header"> Warning </h3> */}
              <div className="content">
                {" "}
                Your message has potentially went against our community
                guidelines. While sending messages to other users, please make sure you <span>DO NOT</span>:
                <ul
                  style={{
                    listStyle: "inside",
                    marginLeft: "1rem",
                    marginTop: "0.5rem",
                    textTransform: "capitalize",
                  }}
                >
                  <li>insult or be toxic towards others</li>
                  <li>send obscene or sexually explicit messages</li>
                  <li>send threatening messages</li>
                  <li>glorify alcohol and its effects</li>
                  <li>encourage or promote self harm</li>
                  <li>post any personal identification information</li>
                </ul>
                If you are feeling the urge to harm yourself or need any other assistance, please visit our{" "}
                <a className="resources-page" href="/resources">
                  resources
                </a>{" "}
                page.
              </div>
            </div>
          )}
        </Popup>
      );
    }
  }

  // TODO: Change greeting
  // TODO: high risk/sensitive user group, chats will NEED to be moderated or filtered somehow to keep users safe
  // TODO: add blocking capabilities, report capabilities, make users agree to terms / remind them of risks of chatting

  return (
    <div className="messages-div">
      <RenderPopup />
      <div className="chat-panel">
        {currentChats.length === 0 ? (
          <div className="greeting-div">
            <p className="greeting">
              You don't have any chats yet! Create a new chat!
            </p>
          </div>
        ) : null}
        <ChatList users={currentChats} currentChat={currentChat} changeChat={changeChat} />
      </div>
      <div className="message-panel">
        {displayGreeting ? (
          <div className="greeting-div">
            <h1 className="greeting">Welcome to the chat!</h1>
            <p className="greeting">
              Select a user to start chatting, or create a new chat by clicking
              the chat button on a story or log!
            </p>
          </div>
        ) : (
          <MessageList
            className="message-list"
            lockable={false}
            toBottomHeight={"100%"}
            dataSource={currentMessages}
            referance={messagesEndRef}
          />
        )}
        <div className="input-div">
          <Input
            className="message-input"
            placeholder="Type here..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            multiline={true}
          />
          <Button
            className="message-button"
            text={"Send"}
            onClick={() => sendMessage()}
            title="Send"
          />
        </div>
      </div>
    </div>
  );
};

export default DirectMessages;
