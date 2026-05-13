import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import {GraphqlClientProvider} from "../../api/hooks/useGraphqlClient";
import {ProvideColorMode} from "../../context";
import {GlobalStateProvider} from "../../context/globalState";
import {WalletProvider} from "../../context/wallet";
import {WalletAdapterProvider} from "../../context/wallet/adapterProvider";
import Footer from "./Footer";
import Header from "./Header";

interface LayoutProps {
  children: React.ReactNode;
}

export default function GovernanceLayout({children}: LayoutProps) {
  return (
    <ProvideColorMode>
      <CssBaseline />

      <GlobalStateProvider>
        <GraphqlClientProvider>
          <WalletAdapterProvider>
            <WalletProvider>
              <Box
                component="main"
                sx={{
                  minHeight: "100vh",
                  backgroundColor: "transparent",
                  flexGrow: 1,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Header />
                <Container maxWidth="xl" sx={{flexGrow: 4, paddingTop: "2rem"}}>
                  {children}
                </Container>
                <Footer />
              </Box>
            </WalletProvider>
          </WalletAdapterProvider>
        </GraphqlClientProvider>
      </GlobalStateProvider>
    </ProvideColorMode>
  );
}
