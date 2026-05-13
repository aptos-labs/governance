import {TransactionResponse} from "@aptos-labs/ts-sdk";
import {Alert, Link, Snackbar, Typography} from "@mui/material";
import {explorerUrl} from "../../constants";
import {CloseAction} from "./TransactionResponseSnackbar";

type FailureSnackbarProps = {
  onCloseSnackbar: () => void;
  data: TransactionResponse;
};

export default function FailureSnackbar({
  onCloseSnackbar,
  data,
}: FailureSnackbarProps) {
  const {hash} = data;

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
        severity="error"
        action={<CloseAction onCloseSnackbar={onCloseSnackbar} />}
      >
        <Typography variant="inherit">
          Transaction {""}
          <Link
            href={`${explorerUrl}/txn/${hash}`}
            color="inherit"
            target="_blank"
          >
            {hash}
          </Link>{" "}
          failed{" "}
          {"vm_status" in data && data.vm_status
            ? `with "${data.vm_status}"`
            : "."}
        </Typography>
      </Alert>
    </Snackbar>
  );
}
