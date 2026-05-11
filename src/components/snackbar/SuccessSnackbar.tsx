import RefreshIcon from "@mui/icons-material/Refresh";
import {Alert, Box, Button, Link, Snackbar, Typography} from "@mui/material";
import {explorerUrl} from "../../constants";
import {CloseAction} from "./TransactionResponseSnackbar";

function RefreshAction() {
  // TODO: update the vote results section without refreshing the page
  const refreshPage = () => {
    window.location.reload();
  };

  return (
    <Box alignSelf="center" marginRight={1.5}>
      <Button
        variant="outlined"
        color="inherit"
        size="large"
        onClick={refreshPage}
        endIcon={<RefreshIcon />}
      >
        Refresh
      </Button>
    </Box>
  );
}

type SuccessSnackbarProps = {
  transactionHash: string;
  refreshOnSuccess?: boolean;
  onCloseSnackbar: () => void;
};

export default function SuccessSnackbar({
  transactionHash,
  refreshOnSuccess,
  onCloseSnackbar,
}: SuccessSnackbarProps) {
  return (
    <Snackbar
      open={true}
      anchorOrigin={{
        vertical: "top",
        horizontal: "center",
      }}
    >
      <Alert
        variant="filled"
        severity="success"
        action={
          refreshOnSuccess ? (
            <RefreshAction />
          ) : (
            <CloseAction onCloseSnackbar={onCloseSnackbar} />
          )
        }
      >
        <Typography variant="inherit">
          Succeeded with transaction {""}
          <Link
            href={`${explorerUrl}/txn/${transactionHash}`}
            color="inherit"
            target="_blank"
          >
            {transactionHash}
          </Link>
          {refreshOnSuccess === true &&
            `. Please refresh to see the updated result.`}
        </Typography>
      </Alert>
    </Snackbar>
  );
}
