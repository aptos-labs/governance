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
  totalVotes: number;
};

function AddressCell({vote}: ProposalCellProps) {
  return (
    <TableCell
      sx={{
        textAlign: "left",
        minWidth: {xs: 250},
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
        minWidth: {xs: 250},
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

function VotingPercantageCell({vote, totalVotes}: ProposalCellProps) {
  return (
    <TableCell
      sx={{
        textAlign: "right",
        minWidth: {xs: 300},
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {totalVotes === 0
        ? 0
        : ((vote.num_votes * 100) / totalVotes).toFixed(2) + "%"}
    </TableCell>
  );
}

const ProposalCells = Object.freeze({
  address: AddressCell,
  vote: VoteCell,
  votingPower: VotingPowerCell,
  percentageVotingPower: VotingPercantageCell,
});

type ProposalColumn = keyof typeof ProposalCells;

const DEFAULT_COLUMNS: ProposalColumn[] = [
  "address",
  "vote",
  "votingPower",
  "percentageVotingPower",
];

type ProposalRowProps = {
  columns: ProposalColumn[];
  vote: Vote;
  totalVotes: number;
};

function ProposalRow({vote, columns, totalVotes}: ProposalRowProps) {
  return (
    <GeneralTableRow>
      {columns.map((column) => {
        const Cell = ProposalCells[column];
        return <Cell key={column} vote={vote} totalVotes={totalVotes} />;
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
    case "percentageVotingPower":
      return (
        <GeneralTableHeaderCell
          header="percantage voting power"
          textAlignRight={true}
        />
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
  totalVotes: number;
  columns?: ProposalColumn[];
  hideTitle?: boolean;
};

export function VotesTable({
  votes,
  totalVotes,
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
          return (
            <ProposalRow
              key={i}
              vote={vote}
              columns={columns}
              totalVotes={totalVotes}
            />
          );
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
