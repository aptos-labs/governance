import {Button} from "@mui/material";
import {useNavigate} from "react-router-dom";
import {useWalletContext} from "../../../context/wallet/context";
import {Proposal, ProposalStatus} from "../../Types";
import ConnectWalletInfo from "./ConnectWalletInfo";
import Section from "./Section";

type CastVoteSectionProps = {
  proposal: Proposal;
};

export default function CastVoteSection({proposal}: CastVoteSectionProps) {
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
          disabled={proposal.status !== ProposalStatus.VOTING_IN_PROGRESS}
        >
          Vote
        </Button>
      ) : (
        <ConnectWalletInfo />
      )}
    </Section>
  );
}
