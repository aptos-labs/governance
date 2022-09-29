import React from "react";
import {Box, Container, Link, Typography, useTheme} from "@mui/material";

import Grid from "@mui/material/Unstable_Grid2";

import {ReactComponent as GithubLogo} from "../../assets/svg/github.svg";
import {ReactComponent as DiscordLogo} from "../../assets/svg/discord.svg";
import {ReactComponent as TwitterLogo} from "../../assets/svg/twitter.svg";
import {ReactComponent as MediumLogo} from "../../assets/svg/medium.svg";
import {ReactComponent as LinkedInLogo} from "../../assets/svg/linkedin.svg";
import {grey} from "../../themes/colors/aptosColorPalette";
import SvgIcon, {SvgIconProps} from "@mui/material/SvgIcon";

import {ReactComponent as LogoIcon} from "../../assets/svg/aptos-foundation_logo_mark.svg";

const socialLinks = [
  {title: "Git", url: "https://github.com/aptos-labs", icon: GithubLogo},
  {title: "Discord", url: "https://discord.gg/zTDYBEud7U", icon: DiscordLogo},
  {title: "Twitter", url: "https://twitter.com/aptoslabs/", icon: TwitterLogo},
  {title: "Medium", url: "https://aptoslabs.medium.com/", icon: MediumLogo},
  {
    title: "LinkedIn",
    url: "https://www.linkedin.com/company/aptoslabs/",
    icon: LinkedInLogo,
  },
];

export default function Footer() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        background: theme.palette.mode === "dark" ? grey[900] : "white",
        color: theme.palette.mode === "dark" ? grey[100] : "rgba(18,22,21,1)",
        mt: 8,
      }}
    >
      <Container maxWidth="xl" sx={{paddingTop: "2rem", paddingBottom: "2rem"}}>
        <Grid
          container
          rowSpacing={4}
          columnSpacing={{xs: 2, sm: 2, md: 3}}
          alignContent="center"
          alignItems="center"
          direction={{xs: "column", md: "row"}}
        >
          <Grid>
            <Link
              color="inherit"
              href="https://aptoslabs.com/"
              target="_blank"
              title="Aptos Foundation"
              sx={{display: "block", width: "3rem"}}
            >
              <LogoIcon />
            </Link>
          </Grid>
          <Grid container justifyContent="start">
            <Typography
              sx={{textAlign: {xs: "center", md: "left"}}}
              fontSize="0.8rem"
            >
              © {new Date().getFullYear()}{" "}
              <Box component="span" sx={{whiteSpace: "nowrap"}}>
                Aptos Foundation
              </Box>
            </Typography>
          </Grid>
          <Grid
            xs="auto"
            sx={{marginLeft: {xs: "0", md: "auto"}}}
            justifyContent="end"
          >
            <Grid
              container
              justifyContent={{xs: "center", md: "end"}}
              spacing={3}
              direction="row"
            >
              {socialLinks.map((link) => (
                <Grid key={link.title}>
                  <Link
                    color="inherit"
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={link.title}
                    width="26px"
                    sx={{display: "flex"}}
                  >
                    <SvgIcon component={link.icon} inheritViewBox />
                  </Link>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
