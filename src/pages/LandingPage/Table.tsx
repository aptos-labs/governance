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
  Button,
  CircularProgress,
  Alert,
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
import {useState, useEffect} from "react";

const MAX_TITLE_WIDTH = 400;
const PROPOSALS_PER_PAGE = 20;

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

type ProposalRowWithTrackingProps = {
  proposal_id: string;
  columns: ProposalColumn[];
  onLoadingChange?: (loading: boolean) => void;
  onError?: (error: any) => void;
};

function ProposalRowWithTracking({
  proposal_id,
  columns,
  onLoadingChange,
  onError,
}: ProposalRowWithTrackingProps) {
  const {proposal: proposalData, loading, error} = useGetProposal(proposal_id);
  const navigate = RRD.useNavigate();

  // Notify parent of loading state changes.
  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  // Notify parent of errors.
  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  const onTableRowClick = () => {
    navigate(`/proposal/${proposal_id}`);
  };

  if (loading || !proposalData) {
    // Returns null while loading or if there is no proposal data.
    return null;
  }

  // Handle error case.
  if ("errorMessage" in proposalData) {
    return (
      <ProposalErrorRow
        proposal_id={proposal_id}
        columns={columns}
        errorMessage={proposalData.errorMessage}
      />
    );
  }

  // Handle success case.
  return (
    <GeneralTableRow onClick={onTableRowClick}>
      {columns.map((column) => {
        const Cell = ProposalCells[column];
        return <Cell key={column} proposal={proposalData} />;
      })}
    </GeneralTableRow>
  );
}

function ProposalRow({proposal_id, columns}: ProposalRowProps) {
  return (
    <ProposalRowWithTracking proposal_id={proposal_id} columns={columns} />
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

// Helper component to track proposal loading and errors.
function ProposalDataTracker({proposal_id}: {proposal_id: number}) {
  useGetProposal(proposal_id.toString());
  return null;
}

export function ProposalsTable({
  nextProposalId,
  columns = DEFAULT_COLUMNS,
  ProposalsTableRef,
  hideTitle,
}: ProposalsTableProps) {
  const totalProposals = parseInt(nextProposalId);

  // Track how many proposals to display with pagination.
  const [displayCount, setDisplayCount] = useState(PROPOSALS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [loadingProposals, setLoadingProposals] = useState<Set<string>>(
    new Set(),
  );
  const [hasAnyLoaded, setHasAnyLoaded] = useState(false);

  const [sortColumn, setSortColumn] =
    useState<ProposalColumn>("votingStartDate");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");

  // Reset displayCount when sort direction changes so we load the correct proposals.
  useEffect(() => {
    setDisplayCount(PROPOSALS_PER_PAGE);
    setRateLimitError(null);
    setLoadingProposals(new Set());
    setHasAnyLoaded(false);
  }, [sortDirection]);

  // Clear loading state after displayCount changes and component re-renders.
  useEffect(() => {
    if (isLoadingMore) {
      const timer = setTimeout(() => {
        setIsLoadingMore(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [displayCount, isLoadingMore]);

  // Track proposal loading states.
  const handleLoadingChange = React.useCallback(
    (proposalId: string, loading: boolean) => {
      setLoadingProposals((prev) => {
        const next = new Set(prev);
        if (loading) {
          next.add(proposalId);
        } else {
          next.delete(proposalId);
        }
        return next;
      });

      if (!loading) {
        setHasAnyLoaded(true);
      }
    },
    [],
  );

  // Handle errors from proposals.
  const handleError = React.useCallback((error: any) => {
    if (error && error.type === "Rate limited") {
      setRateLimitError(
        "You've been rate limited by the API. Please try again later.",
      );
    }
  }, []);

  // Calculate how many proposals to load.
  const proposalsToLoad = Math.min(displayCount, totalProposals);

  // Calculate which proposals to load based on sort direction.
  // For descending (newest first): load from the end.
  // For ascending (oldest first): load from the beginning.
  const startProposalId =
    sortDirection === "desc"
      ? Math.max(0, totalProposals - proposalsToLoad)
      : 0;

  // Generate array of proposal IDs to display.
  const proposalIds = React.useMemo(
    () =>
      Array.from(
        {length: proposalsToLoad},
        (_, index) => startProposalId + index,
      ),
    [proposalsToLoad, startProposalId],
  );

  // Sort proposal IDs based on sort settings.
  // For votingStartDate, we can approximate by ID (higher ID = newer proposal).
  // For other columns, we'd need to load data, but currently only votingStartDate is sortable.
  const sortedProposalIds = React.useMemo(() => {
    const sorted = [...proposalIds];
    if (sortColumn === "votingStartDate") {
      sorted.sort((a, b) => {
        return sortDirection === "desc" ? b - a : a - b;
      });
    }
    return sorted;
  }, [proposalIds, sortColumn, sortDirection]);

  // Create stable callback refs for each proposal.
  const loadingCallbacks = React.useMemo(() => {
    const callbacks: Record<string, (loading: boolean) => void> = {};
    sortedProposalIds.forEach((id) => {
      callbacks[id] = (loading: boolean) =>
        handleLoadingChange(id.toString(), loading);
    });
    return callbacks;
  }, [sortedProposalIds, handleLoadingChange]);

  const isInitialLoad = loadingProposals.size > 0 && !hasAnyLoaded;
  const hasMoreProposals = displayCount < totalProposals;

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setRateLimitError(null);
    setDisplayCount((prev) =>
      Math.min(prev + PROPOSALS_PER_PAGE, totalProposals),
    );
  };

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
        {sortedProposalIds.map((proposalId: number) => {
          return (
            <ProposalRowWithTracking
              key={proposalId}
              proposal_id={proposalId.toString()}
              columns={columns}
              onLoadingChange={loadingCallbacks[proposalId]}
              onError={handleError}
            />
          );
        })}
      </TableBody>
    </Table>
  );

  // Show loading state on initial load.
  if (isInitialLoad) {
    return (
      <Grid ref={ProposalsTableRef}>
        <Stack spacing={1}>
          {hideTitle !== true && <Title>Proposals</Title>}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 200,
            }}
          >
            <CircularProgress />
          </Box>
        </Stack>
      </Grid>
    );
  }

  return (
    <Grid ref={ProposalsTableRef}>
      <Stack spacing={2}>
        {hideTitle !== true && <Title>Proposals</Title>}
        {rateLimitError && (
          <Alert severity="error" onClose={() => setRateLimitError(null)}>
            {rateLimitError}
          </Alert>
        )}
        <Box sx={{width: "auto", overflowX: "auto"}}>{tableComponent}</Box>
        {rateLimitError && (
          <Alert severity="error" onClose={() => setRateLimitError(null)}>
            {rateLimitError}
          </Alert>
        )}
        {hasMoreProposals && (
          <Box sx={{display: "flex", justifyContent: "center", mt: 2}}>
            <Button
              variant="contained"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              startIcon={
                isLoadingMore ? (
                  <CircularProgress size={20} color="inherit" />
                ) : undefined
              }
              sx={{minWidth: 200}}
            >
              {isLoadingMore ? "Loading..." : "Load More Proposals"}
            </Button>
          </Box>
        )}
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
