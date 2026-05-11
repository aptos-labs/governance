import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import {Button, Link, Stack, Typography} from "@mui/material";
import {installWalletUrl} from "../../../constants";
import {useWalletContext} from "../../../context/wallet/context";

export default function ConnectWalletInfo() {
  const {isInstalled, isConnected, connect} = useWalletContext();

  if (isConnected) {
    return null;
  }

  return (
    <Stack height={213} justifyContent="center" alignItems="center" spacing={1}>
      <ErrorOutlineOutlinedIcon color="primary" fontSize="large" />
      <Typography marginTop={1}>To vote on a proposal</Typography>
      {!isInstalled && (
        <Link href={installWalletUrl} target="_blank">
          Install your wallet
        </Link>
      )}
      {isInstalled && !isConnected && (
        <Link component={Button} onClick={connect}>
          Connect your wallet
        </Link>
      )}
    </Stack>
  );
}
