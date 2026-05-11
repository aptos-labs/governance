import Typography from "@mui/material/Typography";
import * as React from "react";

interface ChildrenProps {
  children?: React.ReactNode;
}

export default function HeadingSub(props: ChildrenProps) {
  return (
    <Typography
      color="primary"
      variant="subtitle2"
      component="span"
      sx={{mb: 1}}
    >
      {props.children}
    </Typography>
  );
}
