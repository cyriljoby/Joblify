import { useAppContext } from "../context/appContext";
import { useEffect } from "react";
import { useState } from "react";
import {
  GiElephant,
  GiDeer,
  GiButterfly,
  GiDolphin,
  GiTortoise,
} from "react-icons/gi";
import { RiUserFill } from "react-icons/ri";
import Wrapper from "../assets/wrappers/StoryContainer";
import { BiReply } from "react-icons/bi";
import { BsChevronDown, BsChevronUp } from "react-icons/bs";
import ReplyTemplate from "./replyTemplate";

const LogsContainer = () => {
  const {
    getLogs,
    logs,
    getUsers,
    users,
    getReplies,
    createReply,
    replies,
    getSubReplies,
    subreplies
    
  } = useAppContext();
  useEffect(() => {
    getLogs();
    getUsers();
    getReplies();
    getSubReplies()
    

    // eslint-disable-next-line
  }, []);
  let user_info=[]
  var targetRenderId;
  let user_id = localStorage.getItem("_id");
  let opens = [];
  let openIds = [];
  var targetBoxId;
  let replyValue = "";
  let del = "";

  for (let i = 0; i < users?.length; i++) {
    user_info.push({
      id: users[i]._id,
      alias: users[i].alias,
      icon: users[i].image,
    });
  }
  console.log(user_info)
  const handleReplyInput = (e) => {
    replyValue = e.target.value;
  };
  function RenderReplyBox({log}) {
    let alias = "";
    let icon = "";
    const [replyState, setreplyState] = useState(false);
    const replyFunc = (e) => {
      targetBoxId = e.currentTarget.id;
      setreplyState(!replyState);
    };
    const createNewReply = (e) => {
      opens = [];
      e.preventDefault();
      opens.push(e.currentTarget.id);
      getReplies();
      createReply(log._id, replyValue);
    };
    for (let i = 0; i < user_info.length; i++) {
        if (log.createdBy === user_info[i].id) {
          alias = user_info[i].alias;
          icon = user_info[i].icon;
        }else {
        continue;
      }
    }
    if (icon === "GiTortoise") {
        icon = <GiTortoise />;
      }
      if (icon === "GiDeer") {
        icon = <GiDeer />;
      }
      if (icon === "RiUserFill") {
        icon = <RiUserFill />;
      }
      if (icon === "GiButterfly") {
        icon = <GiButterfly />;
      }
      if (icon === "GiDolphin") {
        icon = <GiDolphin />;
      }
      if (icon === "GiElephant") {
        icon = <GiElephant />;
      }
      if (icon === "AiOutlineUser") {
        icon = <RiUserFill />;
      }
      return (
        <div>
           <div className="story-header">
              <div className="user-info">
                <div className="story-icon">
                  <span className="icon">{icon}</span>
                </div>
    
                <h4>{alias}</h4>
            </div>
                <div className="edit-btns">
                    <button className="btn open-reply" onClick={replyFunc}>
                        <BiReply />
                    </button>
                </div>
              
            <h1 className="story-title">Month:{log.month}</h1>
            </div>
            <p>Day:{log.day}</p>
            <p>{log.log}</p>
          
        {replyState?<div className="reply-container">
            <textarea
              id="reply"
              name="reply"
              rows="10"
              cols="33"
              className="form-input reply-box"
              onChange={handleReplyInput}
            ></textarea>
            <button
              type="submit"
              id={log._id}
              className="btn reply-btn"
              onClick={createNewReply}
            >
              Reply
            </button>
          </div>:null}
          
        </div>
        // </div>
      );
  }


  let opened = false;
  let counts = [];
  function RenderButtton({ log, counts }) {
    counts = [];
    const [showState, setshowState] = useState(() => {
      if (
        
        sessionStorage.getItem(log._id) === "open"
      ) {
        return true;
      } else {
        return false;
      }
    });

    let props_list = [];
    const showReplies = (e) => {
      targetRenderId = e.currentTarget.id;
      opened = false;
      setshowState(!showState);
      if (showState) {
        sessionStorage.setItem(log._id, "close");
      } else {
        sessionStorage.setItem(log._id, "open");
      }
      if (props_list.length!=0){
        {props_list.map((props) => {
          sessionStorage.setItem(props._id, "close");
        })}
      }
    };
    replies?.map((reply) => {
      counts.push(reply["storyId"]);
    });

    let count = counts.filter((x) => x == log._id).length;
    let alias = "";
    let icon = "";

    if (showState) {
      {
        replies?.map((reply) => {
          let subList = [];
          let content=''
          let subalias=''
          let subicon=''
          let aliasparent=''
          
          if (reply["storyId"] === log._id) {
            for (let i = 0; i < user_info.length; i++) {
              if (reply.createdBy === user_info[i].id) {
                alias = user_info[i].alias;
                icon = user_info[i].icon;
              } else {
                continue;
              }
              if (reply["createdBy"] === user_id.replace(/['"]+/g, "")) {
                del = true;
              } else {
                del = false;
              }
            }
            subreplies?.map((sub)=>{
              // console.log(sub)
              if (reply["_id"]==sub["replyId"]){
                content=(sub["subreply"])
              

              for (let i = 0; i < user_info.length; i++) {
                if (sub["createdBy"] === user_info[i].id) {
                  subalias=(user_info[i].alias);
                  subicon=(user_info[i].icon)
                } 
                if (sub["createdByReplyId"] === user_info[i].id) {
                      aliasparent=user_info[i].alias;
                    } 
              }
              let subCreatedBy=sub["createdBy"]
              let subId=sub["_id"]
              subList.push({"content":content,"subalias":subalias,"subicon":subicon,"aliasparent":aliasparent,"subCreatedBy":subCreatedBy,"subId":subId })
            }

            })
            let props = {
              _id: reply["_id"],
              createdBy:reply["createdBy"],
              reply: reply["reply"],
              createdAt: reply["createdAt"],
              icon: icon,
              alias: alias,
              del: del,
              sub:subList,
              opens:opens,
            };
            props_list.push(props);
          }
        });
      }
      for (let i = -1; i++, i < openIds.length; ) {
        if (openIds[i] == log._id) {
          openIds.splice(i, 1);
        }
      }
      let multiple = count > 0;
      return (
        <div>
          <div>
            <button
              id={"show" + log._id}
              onClick={showReplies}
              className="btn show-replies"
            >
              <span className={multiple ? "num-comments" : "num-alt"}>
                {count}
              </span>
              <BsChevronUp />
            </button>
          </div>
          <div>
            
          {multiple?props_list.map((props) => {
            return <ReplyTemplate {...props} />;})
            :<h1 style={{ paddingBottom: "2rem" }}>no comments</h1>
          }
          </div>
        </div>
      );
 
  } 

    
    else {
      let multiple = count > 0;
      return (
        <div>
          <button
            id={"show" + log._id}
            onClick={showReplies}
            className="btn show-replies"
          >
            <span className={multiple ? "num-comments" : "num-alt"}>
              {count}
            </span>
            <BsChevronDown />
          </button>
        </div>
      );
    }
  }

  return( 
  logs?.map((log)=>{
    return (
        <Wrapper>
        <div key={log._id} className="story">
        <RenderReplyBox id={"box" + log._id} log={log} />
        <RenderButtton
                id={"replies" + log._id}
                log={log}
                counts={counts}
              />
        </div>
        </Wrapper>
      );
  }) 
)};

export default LogsContainer;