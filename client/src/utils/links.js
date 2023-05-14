import { FaWpforms } from "react-icons/fa";
import { ImProfile } from "react-icons/im";
import { IoHome } from "react-icons/io5";
import { FaHeadphones } from "react-icons/fa";

const links = [
  { id: 1, text: "feed", path: "/", icon: <IoHome /> },
  { id: 2, text: "daily logs", path: "daily-logs", icon: <FaWpforms /> },
  { id: 3, text: "add story", path: "add-story", icon: <FaWpforms /> },
  { id: 4, text: "profile", path: "profile", icon: <ImProfile /> },
  { id: 5, text: "resources", path: "resources", icon: <FaHeadphones /> },
  
];

export default links;
