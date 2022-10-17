import {Button} from "@mui/material";
import React from "react";
import {useNavigate} from "react-router-dom";

export default function VoteStatusSection() {
  const navigate = useNavigate();

  const onVoteStatusButtonClick = () => {
    navigate(`vote/status`);
  };

  return (
    <Button
      fullWidth
      size="small"
      variant="contained"
      color="info"
      onClick={onVoteStatusButtonClick}
    >
      See Vote Status
    </Button>
  );
}
