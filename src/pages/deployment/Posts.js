import { useOutletContext } from "react-router-dom";
import TeamPosts from "../posts/TeamPosts";

const Posts = () => {
  const { selectedDivision } = useOutletContext();
  return <TeamPosts section="deployment" fixedDivision={selectedDivision} />;
};

export default Posts;
