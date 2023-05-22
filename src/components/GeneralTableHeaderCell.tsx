import {
  Typography,
  TableCell,
  useTheme,
  Stack,
  TableSortLabel,
} from "@mui/material";
import {SxProps} from "@mui/system";
import {Theme} from "@mui/material/styles";
import SouthIcon from "@mui/icons-material/South";

interface GeneralTableHeaderCellProps {
  header: React.ReactNode;
  textAlignRight?: boolean;
  sx?: SxProps<Theme>;
  tooltip?: React.ReactNode;
  sortable?: boolean;
  direction?: "desc" | "asc";
  selectAndSetDirection?: (dir: "desc" | "asc") => void;
}

export default function GeneralTableHeaderCell({
  header,
  textAlignRight,
  sx = [],
  tooltip,
  sortable,
  direction,
  selectAndSetDirection,
}: GeneralTableHeaderCellProps) {
  const theme = useTheme();
  const tableCellBackgroundColor = "transparent";
  const tableCellTextColor = theme.palette.text.secondary;

  const toggleDirection = () => {
    if (selectAndSetDirection === undefined) {
      return;
    }
    selectAndSetDirection(direction === "desc" ? "asc" : "desc");
  };

  const headerSortLabel = sortable ? (
    <TableSortLabel
      active={direction !== undefined}
      direction={direction === undefined ? "desc" : direction}
      onClick={toggleDirection}
      IconComponent={SouthIcon}
      sx={{
        "&.MuiTableSortLabel-root .MuiTableSortLabel-icon": {
          marginLeft: 0,
          marginRight: 0.5,
        },
        flexDirection: "row-reverse",
      }}
    >
      {header}
    </TableSortLabel>
  ) : (
    header
  );
  return (
    <TableCell
      sx={[
        {
          textAlign: textAlignRight ? "right" : "left",
          background: `${tableCellBackgroundColor}`,
          color: `${tableCellTextColor}`,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {tooltip ? (
        <Stack
          direction="row"
          spacing={1}
          justifyContent={textAlignRight ? "flex-end" : "flex-start"}
        >
          <Typography variant="subtitle1">{headerSortLabel}</Typography>
          {tooltip}
        </Stack>
      ) : (
        <Typography variant="subtitle1">{headerSortLabel}</Typography>
      )}
    </TableCell>
  );
}
