// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title  RaiseGGEscrow
 * @notice Trustless 1v1 stake escrow for RaiseGG.gg
 *         Deploys identically to Ethereum mainnet and BNB Chain.
 *
 * Flow:
 *   1. Player A calls createMatch() — deposits stake into contract
 *   2. Player B calls joinMatch()   — deposits equal stake
 *   3. Authority calls resolve()    — pays winner 90%, treasury 10%
 *   4. If expired, anyone calls cancel() — full refunds
 */
contract RaiseGGEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Constants ───────────────────────────────────────────────────────────

    uint256 public constant PLATFORM_FEE_BPS = 1000;   // 10%
    uint256 public constant BPS_DENOMINATOR  = 10_000;
    uint256 public constant OPEN_TIMEOUT     = 30 minutes;
    uint256 public constant RESOLVE_TIMEOUT  = 3 hours;

    // ─── State ───────────────────────────────────────────────────────────────

    address public authority;   // Backend wallet that calls resolve/cancel
    address public treasury;    // Fee recipient

    enum MatchStatus { Open, Locked, Resolved, Cancelled }

    struct Match {
        address playerA;
        address playerB;
        address token;          // ERC-20 stablecoin (USDC, USDT, etc.)
        uint256 stakeAmount;    // per player
        MatchStatus status;
        uint256 expiresAt;      // open window — playerB must join before this
        uint256 resolveBy;      // locked window — must resolve before this
    }

    // matchId (bytes16 UUID) => Match
    mapping(bytes16 => Match) public matches;

    // ─── Events ──────────────────────────────────────────────────────────────

    event MatchCreated(bytes16 indexed matchId, address indexed playerA, address token, uint256 stakeAmount);
    event MatchJoined (bytes16 indexed matchId, address indexed playerB);
    event MatchResolved(bytes16 indexed matchId, address indexed winner, uint256 payout, uint256 rake);
    event MatchCancelled(bytes16 indexed matchId);

    // ─── Errors ──────────────────────────────────────────────────────────────

    error MatchAlreadyExists();
    error MatchNotOpen();
    error MatchNotLocked();
    error MatchNotCancellable();
    error AlreadyJoined();
    error SamePlayer();
    error InvalidWinner();
    error NotAuthority();
    error ZeroStake();
    error OpenWindowExpired();
    error ResolveWindowActive();

    // ─── Modifiers ───────────────────────────────────────────────────────────

    modifier onlyAuthority() {
        if (msg.sender != authority) revert NotAuthority();
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor(address _authority, address _treasury) Ownable(msg.sender) {
        authority = _authority;
        treasury  = _treasury;
    }

    // ─── Match lifecycle ─────────────────────────────────────────────────────

    /**
     * @notice Player A creates a match and locks their stake.
     * @param matchId      16-byte UUID matching the DB record
     * @param token        ERC-20 token address (USDC, USDT)
     * @param stakeAmount  Amount per player (in token decimals)
     */
    function createMatch(
        bytes16 matchId,
        address token,
        uint256 stakeAmount
    ) external nonReentrant {
        if (stakeAmount == 0) revert ZeroStake();
        if (matches[matchId].playerA != address(0)) revert MatchAlreadyExists();

        matches[matchId] = Match({
            playerA:     msg.sender,
            playerB:     address(0),
            token:       token,
            stakeAmount: stakeAmount,
            status:      MatchStatus.Open,
            expiresAt:   block.timestamp + OPEN_TIMEOUT,
            resolveBy:   0
        });

        IERC20(token).safeTransferFrom(msg.sender, address(this), stakeAmount);

        emit MatchCreated(matchId, msg.sender, token, stakeAmount);
    }

    /**
     * @notice Player B joins an open match and locks their stake.
     */
    function joinMatch(bytes16 matchId) external nonReentrant {
        Match storage m = matches[matchId];
        if (m.status != MatchStatus.Open) revert MatchNotOpen();
        if (m.playerB != address(0))      revert AlreadyJoined();
        if (msg.sender == m.playerA)      revert SamePlayer();
        if (block.timestamp > m.expiresAt) revert OpenWindowExpired();

        m.playerB   = msg.sender;
        m.status    = MatchStatus.Locked;
        m.resolveBy = block.timestamp + RESOLVE_TIMEOUT;

        IERC20(m.token).safeTransferFrom(msg.sender, address(this), m.stakeAmount);

        emit MatchJoined(matchId, msg.sender);
    }

    /**
     * @notice Authority resolves the match and distributes funds.
     * @param matchId  Match to resolve
     * @param winner   Must be playerA or playerB
     */
    function resolve(bytes16 matchId, address winner) external onlyAuthority nonReentrant {
        Match storage m = matches[matchId];
        if (m.status != MatchStatus.Locked) revert MatchNotLocked();
        if (winner != m.playerA && winner != m.playerB) revert InvalidWinner();

        uint256 totalPot = m.stakeAmount * 2;
        uint256 rake     = (totalPot * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 payout   = totalPot - rake;

        m.status = MatchStatus.Resolved;

        IERC20(m.token).safeTransfer(winner,   payout);
        IERC20(m.token).safeTransfer(treasury, rake);

        emit MatchResolved(matchId, winner, payout, rake);
    }

    /**
     * @notice Cancel and refund.
     *         Open matches: anyone can cancel after expiresAt, or authority anytime.
     *         Locked matches: only authority can cancel (e.g. no result after resolveBy).
     */
    function cancel(bytes16 matchId) external nonReentrant {
        Match storage m = matches[matchId];

        if (m.status == MatchStatus.Open) {
            // After open window expires anyone can cancel; authority can cancel anytime
            if (msg.sender != authority && block.timestamp <= m.expiresAt) {
                revert MatchNotCancellable();
            }
            m.status = MatchStatus.Cancelled;
            IERC20(m.token).safeTransfer(m.playerA, m.stakeAmount);

        } else if (m.status == MatchStatus.Locked) {
            // Only authority can cancel a locked match
            if (msg.sender != authority) revert NotAuthority();
            m.status = MatchStatus.Cancelled;
            IERC20(m.token).safeTransfer(m.playerA, m.stakeAmount);
            IERC20(m.token).safeTransfer(m.playerB, m.stakeAmount);

        } else {
            revert MatchNotCancellable();
        }

        emit MatchCancelled(matchId);
    }

    // ─── View helpers ────────────────────────────────────────────────────────

    function getMatch(bytes16 matchId) external view returns (Match memory) {
        return matches[matchId];
    }

    function isExpiredOpen(bytes16 matchId) external view returns (bool) {
        Match storage m = matches[matchId];
        return m.status == MatchStatus.Open && block.timestamp > m.expiresAt;
    }

    function isPastResolveDeadline(bytes16 matchId) external view returns (bool) {
        Match storage m = matches[matchId];
        return m.status == MatchStatus.Locked && block.timestamp > m.resolveBy;
    }

    // ─── Admin ───────────────────────────────────────────────────────────────

    function setAuthority(address _authority) external onlyOwner {
        authority = _authority;
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }
}
