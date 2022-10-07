import React from "react";
import Section from "./Section";
import {useWalletContext} from "../../../context/wallet/context";
import ConnectWalletInfo from "./ConnectWalletInfo";
import {Button} from "@mui/material";
import {useNavigate} from "react-router-dom";

type CastVoteSectionProps = {
  proposalId: string;
};

export default function CastVoteSection({proposalId}: CastVoteSectionProps) {
  const {isConnected} = useWalletContext();
  const navigate = useNavigate();

  const onVoteButtonClick = () => {
    navigate(`vote`);
  };

  return (
    <Section title="Cast your vote">
      {isConnected ? (
        <Button
          fullWidth
          size="large"
          variant="primary"
          onClick={onVoteButtonClick}
        >
          Vote
        </Button>
      ) : (
        <ConnectWalletInfo />
      )}
    </Section>
  );
}
