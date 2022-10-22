import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import {GraphqlClientProvider} from "../../api/hooks/useGraphqlClient";

import Header from "./Header";
import Footer from "./Footer";
import {GlobalStateProvider} from "../../context/globalState";
import {ProvideColorMode} from "../../context";
import {WalletProvider} from "../../context/wallet";

interface LayoutProps {
  children: React.ReactNode;
}

export default function GovernanceLayout({children}: LayoutProps) {
  return (
    <ProvideColorMode>
      <CssBaseline />

      <GlobalStateProvider>
        <GraphqlClientProvider>
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
        </GraphqlClientProvider>
      </GlobalStateProvider>
    </ProvideColorMode>
  );
}
