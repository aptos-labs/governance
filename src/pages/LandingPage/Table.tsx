import * as React from "react";
import * as RRD from "react-router-dom";
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
} from "@mui/material";
import {assertNever} from "../../utils";
import {Proposal, ProposalError} from "../Types";
import {useGetProposal} from "../../api/hooks/useGetProposal";
import GeneralTableRow from "../../components/GeneralTableRow";
import GeneralTableHeaderCell from "../../components/GeneralTableHeaderCell";
import HashButton, {HashType} from "../../components/HashButton";
import {teal} from "../../themes/colors/aptosColorPalette";
import StatusIcon from "../../components/StatusIcon";
import ProposalStatusTooltip from "../../components/ProposalStatusTooltip";
import InfoIcon from "@mui/icons-material/Info";
import {renderTimestamp} from "../utils";
import {useState} from "react";

const MAX_TITLE_WIDTH = 400;

type ProposalCellProps = {
  proposal: Proposal;
};

function TitleCell({proposal}: ProposalCellProps) {
  return (
    <TableCell sx={{textAlign: "left"}}>
      <Box
        component="div"
        sx={{
          maxWidth: MAX_TITLE_WIDTH,
          color: teal[500],
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {proposal.proposal_metadata.title}
      </Box>
    </TableCell>
  );
}

function StatusCell({proposal}: ProposalCellProps) {
  return (
    <TableCell sx={{textAlign: "left"}}>
      <Box sx={{display: "flex", alignItems: "center", gap: 0.7}}>
        <StatusIcon status={proposal.status} />
        {proposal.status}
      </Box>
    </TableCell>
  );
}

function ProposerCell({proposal}: ProposalCellProps) {
  return (
    <TableCell sx={{textAlign: "left"}}>
      <HashButton hash={proposal.proposer} type={HashType.ACCOUNT} />
    </TableCell>
  );
}

// TODO: make renderTimestamp a general helper and move it out of Transactions folder
function VotingStartDateCell({proposal}: ProposalCellProps) {
  return (
    <TableCell
      sx={{
        textAlign: "left",
      }}
    >
      {renderTimestamp(proposal.creation_time_secs)}
    </TableCell>
  );
}

function VotingEndDateCell({proposal}: ProposalCellProps) {
  return (
    <TableCell
      sx={{
        textAlign: "left",
      }}
    >
      {renderTimestamp(proposal.expiration_secs)}
    </TableCell>
  );
}

function ExecutionDateCell({proposal}: ProposalCellProps) {
  return (
    <TableCell
      sx={{
        textAlign: "right",
      }}
    >
      {renderTimestamp(proposal.resolution_time_secs)}
    </TableCell>
  );
}

const ProposalCells = Object.freeze({
  title: TitleCell,
  status: StatusCell,
  proposer: ProposerCell,
  votingStartDate: VotingStartDateCell,
  votingEndDate: VotingEndDateCell,
  executionDate: ExecutionDateCell,
});

type ProposalColumn = keyof typeof ProposalCells;

const DEFAULT_COLUMNS: ProposalColumn[] = [
  "title",
  "status",
  "proposer",
  "votingStartDate",
  "votingEndDate",
  "executionDate",
];

type ProposalRowProps = {
  columns: ProposalColumn[];
  proposal_id: string;
};

// Error row component to display when proposal data cannot be loaded
function ProposalErrorRow({
  proposal_id,
  columns,
  errorMessage,
}: {
  proposal_id: string;
  columns: ProposalColumn[];
  errorMessage: string;
}) {
  return (
    <GeneralTableRow>
      <TableCell sx={{textAlign: "left", color: "error.main"}}>
        Proposal #{proposal_id} - Failed to load: {errorMessage}
      </TableCell>
      {/* Fill remaining columns with empty cells */}
      {columns.slice(1).map((column) => (
        <TableCell key={column} />
      ))}
    </GeneralTableRow>
  );
}

function ProposalRow({proposal_id, columns}: ProposalRowProps) {
  const {proposal: proposalData} = useGetProposal(proposal_id);
  const navigate = RRD.useNavigate();

  const onTableRowClick = () => {
    navigate(`/proposal/${proposal_id}`);
  };

  if (!proposalData) {
    // returns null as we don't need to generate a TableRow if there is no proposal data
    return null;
  }

  // Handle error case
  if ("errorMessage" in proposalData) {
    return (
      <ProposalErrorRow
        proposal_id={proposal_id}
        columns={columns}
        errorMessage={proposalData.errorMessage}
      />
    );
  }

  // Handle success case
  return (
    <GeneralTableRow onClick={onTableRowClick}>
      {columns.map((column) => {
        const Cell = ProposalCells[column];
        return <Cell key={column} proposal={proposalData} />;
      })}
    </GeneralTableRow>
  );
}

type ProposalHeaderCellProps = {
  column: ProposalColumn;
  direction?: "desc" | "asc";
  setDirection?: (dir: "desc" | "asc") => void;
  setSortColumn: (col: ProposalColumn) => void;
};

function ProposalHeaderCell({
  column,
  direction,
  setDirection,
  setSortColumn,
}: ProposalHeaderCellProps) {
  switch (column) {
    case "title":
      return <GeneralTableHeaderCell header="Title" />;
    case "status":
      return (
        <GeneralTableHeaderCell
          header="Status"
          tooltip={
            <ProposalStatusTooltip>
              <InfoIcon fontSize="small" color="disabled" />
            </ProposalStatusTooltip>
          }
        />
      );
    case "proposer":
      return <GeneralTableHeaderCell header="Proposer" />;
    case "votingStartDate":
      // return <GeneralTableHeaderCell header="Voting Start Date" />;
      return (
        <GeneralTableHeaderCell
          header={"Voting Start Date"}
          sortable
          direction={direction}
          selectAndSetDirection={(dir) => {
            setSortColumn(column);
            if (setDirection) {
              setDirection(dir);
            }
          }}
        />
      );
    case "votingEndDate":
      return <GeneralTableHeaderCell header="Voting End Date" />;
    case "executionDate":
      return (
        <GeneralTableHeaderCell header="Execution Date" textAlignRight={true} />
      );
    default:
      return assertNever(column);
  }
}

type ProposalsTableProps = {
  proposals?: Proposal[];
  columns?: ProposalColumn[];
  nextProposalId: string;
  ProposalsTableRef?: React.MutableRefObject<HTMLDivElement | null>;
  hideTitle?: boolean;
};

export function ProposalsTable({
  nextProposalId,
  columns = DEFAULT_COLUMNS,
  ProposalsTableRef,
  hideTitle,
}: ProposalsTableProps) {
  // we need to iterate from (0...nextProposalId)
  // to make api call for each proposal
  // TODO - future improvement, once more proposals, show 10 proposals on homepage
  // and the rest on the Proposals page.
  const counter = parseInt(nextProposalId);

  // Get all proposal data, filter out errors from UI but log them to console
  const proposalRowsWithIds: Array<{data: Proposal; id: string}> = Array.from(
    {length: counter},
    (_, proposal_id) => {
      const proposalData = useGetProposal(proposal_id.toString()).proposal;
      if (!proposalData) {
        return null;
      }

      // If it's an error, log it to console and filter it out from UI
      if ("errorMessage" in proposalData) {
        console.warn(
          `Proposal #${proposal_id} failed to load:`,
          proposalData.errorMessage,
        );
        return null;
      }

      // Only return successful proposals for display
      return {data: proposalData, id: proposal_id.toString()};
    },
  ).filter((item): item is {data: Proposal; id: string} => item !== null);

  const [sortColumn, setSortColumn] =
    useState<ProposalColumn>("votingStartDate");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");

  // Sort the successful proposals
  const sortedProposalRows = getSortedProposalsWithIds(
    proposalRowsWithIds,
    sortColumn,
    sortDirection,
  );

  const tableComponent = (
    <Table size="small">
      <TableHead>
        <TableRow>
          {columns.map((column) => (
            <ProposalHeaderCell
              key={column}
              column={column}
              direction={sortColumn === column ? sortDirection : undefined}
              setDirection={setSortDirection}
              setSortColumn={setSortColumn}
            />
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {sortedProposalRows.map((item: {data: Proposal; id: string}) => {
          // Only successful proposals are displayed now
          return (
            <ProposalRow
              key={item.data.proposal_id}
              proposal_id={item.data.proposal_id.toString()}
              columns={columns}
            />
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <Grid ref={ProposalsTableRef}>
      <Stack spacing={1}>
        {hideTitle !== true && <Title>Proposals</Title>}
        <Box sx={{width: "auto", overflowX: "auto"}}>{tableComponent}</Box>
      </Stack>
    </Grid>
  );
}

function getSortedProposalsWithIds(
  proposalItems: Array<{data: Proposal; id: string}>,
  column: ProposalColumn,
  direction: "desc" | "asc",
): Array<{data: Proposal; id: string}> {
  const proposalItemsCopy: Array<{data: Proposal; id: string}> = JSON.parse(
    JSON.stringify(proposalItems),
  );
  const orderedProposals = getProposalsOrderedBy(proposalItemsCopy, column);

  return direction === "desc" ? orderedProposals : orderedProposals.reverse();
}

function getProposalsOrderedBy(
  proposalItems: Array<{data: Proposal; id: string}>,
  column: ProposalColumn,
): Array<{data: Proposal; id: string}> {
  switch (column) {
    case "votingStartDate":
      return proposalItems.sort((item1, item2) => {
        // Only successful proposals are sorted now
        const proposal1 = item1.data;
        const proposal2 = item2.data;
        return (
          Number(proposal2.creation_time_secs) -
          Number(proposal1.creation_time_secs)
        );
      });
    default:
      return proposalItems;
  }
}
