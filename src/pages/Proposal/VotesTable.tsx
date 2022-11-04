import Title from "../../components/Title";
import {
  Stack,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Grid,
  Tooltip,
} from "@mui/material";
import {assertNever, octaToAptnFormatter, octaToAptString} from "../../utils";
import GeneralTableRow from "../../components/GeneralTableRow";
import GeneralTableHeaderCell from "../../components/GeneralTableHeaderCell";
import HashButton, {HashType} from "../../components/HashButton";

type ProposalCellProps = {
  vote: Vote;
};

function AddressCell({vote}: ProposalCellProps) {
  return (
    <TableCell
      sx={{
        textAlign: "left",
        minWidth: {xs: 200},
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      <HashButton hash={vote.staking_pool_address} type={HashType.ACCOUNT} />
    </TableCell>
  );
}

function VoteCell({vote}: ProposalCellProps) {
  return (
    <TableCell
      sx={{
        textAlign: "left",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {vote.should_pass ? "FOR" : "AGAINST"}
    </TableCell>
  );
}

function VotingPowerCell({vote}: ProposalCellProps) {
  return (
    <TableCell
      sx={{
        textAlign: "right",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      <Tooltip
        title={`${octaToAptString(vote.num_votes + "")} APT`}
        placement="right"
        arrow={true}
      >
        <Box>{`${octaToAptnFormatter(vote.num_votes + "")} APT`}</Box>
      </Tooltip>
    </TableCell>
  );
}

const ProposalCells = Object.freeze({
  address: AddressCell,
  vote: VoteCell,
  votingPower: VotingPowerCell,
});

type ProposalColumn = keyof typeof ProposalCells;

const DEFAULT_COLUMNS: ProposalColumn[] = ["address", "vote", "votingPower"];

type ProposalRowProps = {
  columns: ProposalColumn[];
  vote: Vote;
};

function ProposalRow({vote, columns}: ProposalRowProps) {
  return (
    <GeneralTableRow>
      {columns.map((column) => {
        const Cell = ProposalCells[column];
        return <Cell key={column} vote={vote} />;
      })}
    </GeneralTableRow>
  );
}

type ProposalHeaderCellProps = {
  column: ProposalColumn;
};

function ProposalHeaderCell({column}: ProposalHeaderCellProps) {
  switch (column) {
    case "address":
      return <GeneralTableHeaderCell header="address" />;
    case "vote":
      return <GeneralTableHeaderCell header="vote" />;
    case "votingPower":
      return (
        <GeneralTableHeaderCell header="voting power" textAlignRight={true} />
      );
    default:
      return assertNever(column);
  }
}

type Vote = {
  should_pass: boolean;
  staking_pool_address: string;
  num_votes: number;
};

type ProposalsTableProps = {
  votes: Vote[];
  columns?: ProposalColumn[];
  hideTitle?: boolean;
};

export function VotesTable({
  votes,
  columns = DEFAULT_COLUMNS,
  hideTitle,
}: ProposalsTableProps) {
  const tableComponent = (
    <Table size="small">
      <TableHead>
        <TableRow>
          {columns.map((column) => (
            <ProposalHeaderCell key={column} column={column} />
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {votes.map((vote: any, i: number) => {
          return <ProposalRow key={i} vote={vote} columns={columns} />;
        })}
      </TableBody>
    </Table>
  );

  return (
    <Grid>
      <Stack spacing={1}>
        {hideTitle !== true && <Title>Votes</Title>}
        <Box sx={{width: "auto", overflowX: "auto"}}>{tableComponent}</Box>
      </Stack>
    </Grid>
  );
}
