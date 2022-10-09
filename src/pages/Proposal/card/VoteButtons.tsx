import {Box, Button, Stack} from "@mui/material";
import React, {useEffect, useState} from "react";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import {
  primaryColor,
  negativeColor,
  primaryColorOnHover,
  negativeColorOnHover,
  voteFor,
  voteAgainst,
} from "../../constants";
import ConfirmationModal from "./ConfirmationModal";
import TransactionResponseSnackbar from "../../../components/snackbar/TransactionResponseSnackbar";
import LoadingModal from "../../../components/LoadingModal";
import useSubmitVote from "../../../api/hooks/useSubmitVote";

type VoteButtonsProps = {
  proposalId: string;
  stakePoolAddress: string;
  onTransactionSuccess: () => void;
};

export default function VoteButtons({
  proposalId,
  stakePoolAddress,
  onTransactionSuccess,
}: VoteButtonsProps) {
  const [voteForModalIsOpen, setVoteForModalIsOpen] = useState<boolean>(false);
  const [voteAgainstModalIsOpen, setVoteAgainstModalIsOpen] =
    useState<boolean>(false);

  const {
    submitVote,
    transactionInProcess,
    transactionResponse,
    clearTransactionResponse,
  } = useSubmitVote();

  const openModal = (shouldPass: boolean) => {
    if (shouldPass) {
      setVoteForModalIsOpen(true);
    } else {
      setVoteAgainstModalIsOpen(true);
    }
  };

  const closeVoteForModal = () => {
    setVoteForModalIsOpen(false);
  };

  const closeVoteAgainstModal = () => {
    setVoteAgainstModalIsOpen(false);
  };

  const onVote = (shouldPass: boolean) => {
    submitVote(proposalId, shouldPass, stakePoolAddress);
    closeVoteForModal();
    closeVoteAgainstModal();
  };

  const onCloseSnackbar = () => {
    clearTransactionResponse();
  };

  useEffect(() => {
    if (transactionResponse?.transactionSubmitted) {
      onTransactionSuccess();
    }
  }, [transactionResponse]);

  return (
    <Box>
      <Stack spacing={2} direction="row">
        <Button
          fullWidth
          size="large"
          variant="primary"
          sx={{
            justifyContent: "start",
            backgroundColor: primaryColor,
            "&:hover": {
              backgroundColor: primaryColorOnHover,
            },
          }}
          startIcon={<CheckCircleOutlinedIcon />}
          onClick={() => openModal(true)}
        >
          {voteFor}
        </Button>
        <Button
          fullWidth
          size="large"
          variant="primary"
          sx={{
            justifyContent: "start",
            backgroundColor: negativeColor,
            "&:hover": {
              backgroundColor: negativeColorOnHover,
            },
          }}
          startIcon={<CancelOutlinedIcon />}
          onClick={() => openModal(false)}
        >
          {voteAgainst}
        </Button>
      </Stack>
      <TransactionResponseSnackbar
        transactionResponse={transactionResponse}
        onCloseSnackbar={onCloseSnackbar}
        refreshOnSuccess={true}
      />
      <ConfirmationModal
        open={voteForModalIsOpen}
        shouldPass={true}
        onConfirm={() => onVote(true)}
        onClose={closeVoteForModal}
        stakePoolAddress={stakePoolAddress}
      />
      <ConfirmationModal
        open={voteAgainstModalIsOpen}
        shouldPass={false}
        onConfirm={() => onVote(false)}
        onClose={closeVoteAgainstModal}
        stakePoolAddress={stakePoolAddress}
      />
      <LoadingModal open={transactionInProcess} />
    </Box>
  );
}
