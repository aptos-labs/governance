import {Box, GlobalStyles, alpha} from "@mui/material";
import {WalletConnector} from "@aptos-labs/wallet-adapter-mui-design";

export const WalletButton = (): JSX.Element => {
  return (
    <Box sx={{display: "inline-flex"}}>
      <GlobalStyles
        styles={(theme) => ({
          ".wallet-button.MuiButton-root": {
            backgroundColor: `${theme.palette.primary.main} !important`,
            color: `${
              theme.palette.mode === "dark" ? "#121615" : "#000000"
            } !important`,
            fontSize: "1.1rem !important",
            fontWeight: "400 !important",
            borderRadius: `${theme.shape.borderRadius}px !important`,
            minWidth: "8rem !important",
            minHeight: "unset !important",
            padding: "12px 34px !important",
            textTransform: "none !important",
            boxShadow: "none !important",
            lineHeight: "1.15 !important",
          },
          ".wallet-button.MuiButton-root:hover": {
            backgroundColor: `${theme.palette.primary.main} !important`,
            filter: "brightness(0.98) !important",
            boxShadow: "none !important",
          },
          ".wallet-button .MuiTypography-root": {
            fontWeight: "400 !important",
            fontSize: "1rem !important",
            lineHeight: "1.25 !important",
          },
          ".wallet-button .MuiSvgIcon-root + .MuiTypography-root": {
            fontSize: "0 !important",
          },
          ".wallet-button .MuiSvgIcon-root + .MuiTypography-root::after": {
            content: '"Connect Wallet"',
            fontSize: "1rem !important",
            lineHeight: "1.25 !important",
          },
          ".MuiPopover-root .MuiPopover-paper": {
            border: `1px solid ${theme.palette.lineShade.main} !important`,
            borderRadius: `${theme.shape.borderRadius}px !important`,
            backgroundColor: `${theme.palette.background.paper} !important`,
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25) !important",
          },
          ".MuiPopover-root .MuiList-root": {
            padding: "4px !important",
            marginTop: "0 !important",
          },
          ".MuiPopover-root .MuiListItemButton-root": {
            padding: "8px 12px !important",
            minHeight: "36px !important",
            borderRadius: `${theme.shape.borderRadius}px !important`,
          },
          ".MuiPopover-root .MuiListItemText-primary": {
            fontSize: "0.95rem !important",
            fontWeight: "400 !important",
            color: `${theme.palette.text.primary} !important`,
            lineHeight: "1.25 !important",
          },
          ".MuiPopover-root .MuiListItemButton-root:hover": {
            backgroundColor: `${alpha(
              theme.palette.primary.main,
              0.18,
            )} !important`,
          },
        })}
      />
      <WalletConnector modalMaxWidth="xs" />
    </Box>
  );
};
