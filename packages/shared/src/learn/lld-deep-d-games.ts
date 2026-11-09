import type { LldDeep, LldExtra, LldGuide } from "./types";

// Guide, recap, walkthrough and diagrams for the games framework project in lld-projects-d-games.ts.
// Rules: no backticks or dollar-brace in the text (template literals), quote every Mermaid node label,
// no semicolons or hash signs in diagram text.

export const GAMES_GUIDE: LldGuide = {
  requirements: [
    "A framework for turn-based games: tic-tac-toe, snakes and ladders and chess behind one interface, so a new game is a new class.",
    "A session enforces turn order, refuses moves after the end, tells listeners about every move and the end, and can take a move back.",
    "Tic-tac-toe on an N by N board with a win check that costs O(1) per move. Snakes and ladders with exact finish, snakes, ladders, sixes and dice that tests can control.",
    "Chess with real rules for every piece: legal moves that never leave your own king in check, checkmate, stalemate, promotion, and draws by insufficient material.",
    "Computer players behind one interface: a random bot and a minimax bot for small games.",
  ],
  entities: [
    "Game<M> (the interface), GameSession<M> (turns, history, listeners), Player, GameStatus, PlayResult",
    "TicTacToe (counters), SnakeAndLadder (jumps, Dice), ChessGame (Board, Piece subclasses, ChessMove)",
    "Bot<M> (RandomBot, MinimaxBot), GameListener<M>",
  ],
  patterns: [
    "Template through an interface: the session owns what every game shares",
    "Memento (snapshot and restore) for undo and for bots that look ahead",
    "Polymorphism for chess pieces; validate by playing the move on a copy",
    "Strategy for bots; Observer for listeners; injected dice",
  ],
  code: `interface Game<M> {
  Player current();
  GameStatus status();
  Optional<String> validate(M move);      // empty means legal
  void apply(M move);
  List<M> legalMoves();
  Object snapshot();                      // memento
  void restore(Object snapshot);
}

final class GameSession<M> {
  synchronized PlayResult play(Player player, M move) {
    if (game.status() != GameStatus.IN_PROGRESS) return new PlayResult(PlayCode.GAME_OVER, "the game has ended");
    if (!game.current().equals(player)) return new PlayResult(PlayCode.NOT_YOUR_TURN, "not your turn");
    Optional<String> problem = game.validate(move);
    if (problem.isPresent()) return new PlayResult(PlayCode.ILLEGAL_MOVE, problem.get());
    history.push(game.snapshot());        // so undo can restore exactly this
    game.apply(move);
    return PlayResult.success();
  }
}

// O(1) win check: one counter per row, column and diagonal for each player
boolean win = ++rows[p][r] == n;
win |= ++cols[p][c] == n;
if (r == c) win |= ++diagonal[p] == n;
if (r + c == n - 1) win |= ++anti[p] == n;`,
  extensions: [
    "Chess: castling, en passant, the fifty-move rule, threefold repetition and a clock per player.",
    "Online play: the session behind a server, listeners that push moves over a socket, and a lobby that pairs players.",
    "More games (connect four, checkers) as new Game classes, with no change to the session or the bots.",
    "A stronger chess bot: minimax with a depth limit, an evaluation of material and position, and move ordering.",
  ],
};

export const GAMES_EXTRA: LldExtra = {
  recap: [
    "One Game<M> interface: current player, status, validate, apply, legalMoves, snapshot and restore. The session, the bots and most tests know only that.",
    "The session is the same for every game: turn check, game-over check, legality, history for undo, listeners. Games implement only their own rules.",
    "Tic-tac-toe keeps counters per row, column and diagonal, so a win is detected in O(1). Chess legality is: reachable by the piece AND your king is not attacked after playing it on a copy.",
    "Snapshots make undo exact and let a minimax bot try moves and step back. Perft (20, 400, 8902) shows chess move generation is correct.",
  ],
  flow: [
    "Ben sends a move. GameSession.play checks the game is in progress, that it is Ben's turn, and asks the game to validate the move.",
    "If the move is legal, the session pushes game.snapshot() on its history, calls game.apply(move), and tells the listeners.",
    "TicTacToe.apply puts the mark on the board, adds one to the row, column and diagonal counters of the player, and wins if any reaches N.",
    "ChessGame.apply plays the move on the board, switches the colour, computes whether the new side is in check and settles the game: no legal move means checkmate when in check and stalemate when not.",
    "undo pops the last snapshot and restores the whole state, so a capture or a snake slide is reversed exactly.",
  ],
  edgeCases: [
    "A move by the wrong player, a move after the end, an off-board or occupied cell, a die showing 7, a ladder that ends on a snake head.",
    "Snakes and ladders: overshooting the last square, three sixes in a row, undo across a jump.",
    "Chess: a pinned piece, a king stepping into check, answering a check, promotion, checkmate versus stalemate, king and bishop against king.",
    "A 50 by 50 tic-tac-toe board; four threads playing the same session.",
    "Minimax: prefer the faster win and the slower loss, never lose at tic-tac-toe on either side.",
  ],
};

export const GAMES_DEEP: Record<string, LldDeep> = {
  "lldp-games": {
    walkthrough: [
      {
        title: "What to clarify first",
        body: `Board games are the favourite LLD question because each one hides a different idea, and an interviewer can ask for any of them. Tic-tac-toe is about a clean model and a fast win check. Snakes and ladders is about randomness and rules with exceptions. Chess is about polymorphism and about rules that depend on the whole board. A strong answer designs the part they share once, and lets each game bring only what is its own.

Ask the usual questions. Which game, or all of them behind one framework? How many players, and is a computer opponent needed? Is there undo? Is it played locally or over a network? What happens after the game ends? For chess, which rules are in scope: castling, en passant, the fifty-move rule? For snakes and ladders: is the last square reached by exact roll, what does a six do, and can a ladder lead to a snake?

The requirements we fix are in the guide above. Three decisions to say aloud. First, the framework is an interface, Game<M>, where M is the type of one move (a cell, a dice roll, a pair of squares). Second, rules that every game shares (whose turn it is, nothing after the end, history, listeners) live in one GameSession and not in each game. Third, state can be copied: snapshot and restore. That single capability gives undo and lets a bot look ahead, and it is the reason the games are written so that all their state is in a few fields.

Say what is out of scope for chess: castling and en passant. They are the first two extensions an interviewer asks for, and the design says exactly where they would go.`,
      },
      {
        title: "The framework: Game, GameSession and the memento",
        body: `Game<M> has nine methods, and each answers a question that the rest of the system asks. players and current say who is playing and whose turn it is. status and winner say whether the game is running, won or drawn. validate answers whether a move is legal and, if not, why, without changing anything. apply plays a move that validate has accepted, passes the turn and sets the status. legalMoves lists the moves available now, for bots and for tests. snapshot and restore copy and put back the whole state. render prints the board.

GameSession<M> wraps one game and owns everything that is the same everywhere. play(player, move) checks in order: the game is still in progress (GAME_OVER otherwise), it is this player's turn (NOT_YOUR_TURN), and the game says the move is legal (ILLEGAL_MOVE with the reason as the message). Only then does it push game.snapshot() onto its history, call apply and tell the listeners. The listener has two methods, onMove and onEnd, which is how a UI redraws or a server pushes the move to the other player.

undo pops the last snapshot and restores it. This is the Memento pattern, and it is why undo is exact for every game: a chess capture, a snakes and ladders slide and a tic-tac-toe counter all come back, because the snapshot is the whole state and not a description of how to reverse a move. The alternative, a Command with an undo method for each move, needs a separate reversal for each rule, and captures and promotions are where those go wrong. The cost of the memento is a copy per move, which is trivial for a board game.

Refusals are results, not exceptions. A player who clicks the wrong cell is not an error in the program. The methods of the session are synchronized, so two threads that try to play at the same moment are decided one after the other.`,
      },
      {
        title: "Tic-tac-toe in O(1)",
        body: `The first version of the win check scans: after every move, look at the row, the column and the diagonals of the cell. That costs O(N) per move for an N by N board, which is fine for 3 and slow for 50. The better idea is to count instead of look.

TicTacToe keeps, for each player, one counter for every row, one for every column, and one each for the two diagonals. A move at row r and column c adds one to the player's counters for row r and column c, to the main diagonal counter if r equals c, and to the other diagonal counter if r plus c equals N minus 1. If any of those counters reaches N, the player has a full line and wins. Nothing is scanned: a move touches at most four counters, so the check is O(1). The board array is only needed to refuse a move on a taken cell and to render.

The game ends in a draw when N times N moves have been played without a winner. The tests pin each way to win (row, column, both diagonals, and the second player), the draw, a 5 by 5 board with a column of five, and a 50 by 50 board where a diagonal wins on the 50th mark and the other player is always one short. A board smaller than 3 is refused in the constructor.

Snapshots copy the board and the counters. That is a handful of small arrays, and it is the reason that the counters are fields in the game and not locals.

Mention the generalisation: the same counters work for any N-in-a-row game where lines are rows, columns and diagonals, but not for a win condition that depends on a pattern, such as connect four with its sliding discs. There you check the four directions from the last disc, which is still local to the move and does not scan the board.`,
      },
      {
        title: "Snakes and ladders: rules as data, dice as an input",
        body: `Snakes and ladders is a lesson in separating luck from rules. The game does not roll a die. A move is a Roll, a value from 1 to 6, and the dice are an interface, Dice, with a seeded implementation for real play and a fixed sequence for tests. With fixed dice a whole game is repeatable, and a bug report is a list of numbers. Main plays a game with a fixed sequence and always gets the same result.

The board is data too. The snakes and ladders are one map from a square to a square: a ladder goes up and a snake goes down, and the game does not care which. The constructor checks the map: no jump from the first or last square, none to itself or off the board, and no chains, meaning that the end of a jump must not be the start of another. A chain would make the rules ambiguous, so it is refused when the board is built and not discovered in the middle of a game.

apply(Roll) follows the rules in order. Count sixes in a row for the current player. The third six in a row moves nothing and passes the turn. Otherwise compute the target square. If it is beyond the last square, stay where you are, which is the exact-finish rule. If it has a jump, take it. If the player is on the last square, they win. A six that moved gives the same player another turn, and anything else passes the turn to the next player in the list, so the game works for any number of players.

The tests cover a ladder, a snake, an overshoot, an exact finish, a six, three sixes, three players in turn, the validation of the die, and undo across a roll.`,
      },
      {
        title: "Chess: pieces, legality and the end of the game",
        body: `Chess has the richest model. Each kind of piece moves in its own way, which is a natural fit for polymorphism: an abstract Piece with a pseudoMoves method, and one subclass for each kind. The sliding pieces (rook, bishop, queen) share a helper that walks in a direction until the edge or a piece, capturing an enemy and stopping before a friend. The king and the knight share a helper that takes one step to each of a list of offsets. The pawn is the odd one: it moves forward but captures diagonally, so it has a separate attacks method, and a test checks that the two lists are different.

pseudoMoves answers where a piece can go by its own rules. That is not yet a legal move, because a move is not legal if it leaves your own king in check. ChessGame handles this with one idea: play the move on a copy of the board, and ask whether your king is attacked. Board.attackedBy(color, square) asks every piece of the other colour whether its attacks include the square. This covers pins, a king stepping into danger, and the obligation to answer a check, without a single special case. The price is speed, which is irrelevant here.

After each move the game looks at the side to move. If it has no legal move, the result depends on one question: is its king attacked? If yes it is checkmate and the side that just moved wins. If not, it is stalemate and the game is drawn. King against king and king with one bishop or knight against king are drawn because nobody can mate. Pawns reaching the last row become the chosen piece, a queen by default.

The test that gives real confidence is perft: count every position reachable in one, two and three moves from the start. The published numbers are 20, 400 and 8902, and the game produces exactly these. Castling and en passant cannot occur in the first three moves, so the numbers apply. If a move generator is wrong in any piece, perft finds it.`,
      },
      {
        title: "Bots, strategy and looking ahead",
        body: `A computer player is a strategy: Bot<M> has one method that takes a game and returns one of its legal moves. RandomBot picks one with a seeded random number generator, so a test that uses it is repeatable. It works for every game because it only calls legalMoves.

MinimaxBot is for small games. It tries every legal move, then every reply, and so on until the game ends, and scores the end: a win for the bot is good, a loss is bad, a draw is zero. It assumes the opponent picks the move that is worst for the bot. To try a move and step back it uses snapshot and apply and restore, and this is the second use of the memento. Alpha-beta pruning stops looking at a branch as soon as it cannot change the answer, which cuts the work a great deal.

One detail matters, and a naive version of this bot gets it wrong. If every win scores the same, the bot may choose a move that wins in five moves over one that wins at once, because the first one it finds with a winning score is used. The score therefore includes the depth: a win is worth 100 minus the number of moves it takes, and a loss costs more the sooner it comes. The bot takes the fast win and delays a loss as long as it can. A test sets up a position with a winning move and checks that this move is chosen, and another that a threat of the opponent is blocked.

The tests prove the claim that matters. Two minimax bots draw. A minimax bot plays 120 games against a random player, on both sides, and never loses, and wins most of them.

Say clearly what does not scale. Tic-tac-toe has a few thousand positions. Chess is far too large to search to the end, so a chess bot needs a depth limit and an evaluation function for positions that are not finished, such as counting material. That is a different bot behind the same interface, which is the point of the interface.`,
      },
      {
        title: "The main flow, step by step",
        body: `Run Main and follow it. Ben tries to start a tic-tac-toe game that Asha should start and gets NOT_YOUR_TURN. Asha plays the middle. Ben tries the same cell and is told it is taken, and a cell outside the board is refused with its reason. Then the game goes: Ben top left, Asha top right, Ben top middle, and Asha takes the bottom left, which completes the diagonal from the top right through the middle. The listener prints the end, a win for Asha, and the board is rendered. A move after the end gives GAME_OVER. Undo takes back the winning move, so four moves are left and the game is in progress again.

Two minimax bots play each other and draw. Then snakes and ladders on a 30 square board with a fixed sequence of dice, played for 20 rolls: Ben finishes on 30 and Asha stands on 29, one short, so the exact finish rule is visible in the result. Then chess: the four moves of the fool's mate, f3, e5, g4 and Qh4, and the board is printed. The status is WON for black, the king of white is in check, and white has no legal move. White has 20 legal moves at the start, which is the number the perft test also begins with, and a pawn that tries to jump three squares is refused with the message that a pawn cannot move like that.

The tests go much further than Main: every piece's move count on an empty board, pawn rules, pins, kings and checks, both kinds of mate, both draws, undo of a capture, the text of a move, perft to three moves, and a thread test where four threads play the same big game and every accepted move is counted once.`,
      },
      {
        title: "Concurrency, extensions and what interviewers probe",
        body: `A game is shared state that several parties touch: two players, a spectator, a timer, perhaps a bot. The session is the place to guard it, and its methods are synchronized, so play, undo and the reads are decided one at a time. The last test starts four threads that each try to play every cell of a 50 by 50 board for whoever's turn it is, and checks that the number of accepted moves equals the number of moves in the history and that no cell was played twice. The games themselves need no locks, because nobody reaches them except through the session.

Listeners are called while the lock is held, which keeps the order of events right. A slow listener would hold up the game, so in production a listener puts the event on a queue.

Extensions. Castling needs state in the game (has the king or rook moved) and a move that moves two pieces, and its legality includes the squares the king crosses. En passant needs to remember the last double step. The fifty-move rule and threefold repetition need counters and a history of positions. A clock per player is a listener plus a timer that ends the game. Online play puts the session behind a server, with listeners that push moves over a socket. New games are new Game classes: the session, the bots and the listeners do not change.

Probes, with short answers. Why one interface for all games? Because the shared rules and the tools (session, bots, tests) are written once. Why is undo a snapshot? It is exact and needs no per-rule code. Why validate by playing on a copy? It is correct for every piece and every pin with no special cases. Why is perft a good test? It is the standard way to prove a chess move generator, with published numbers. How would you make the chess bot stronger? Depth limit, an evaluation function, alpha-beta with move ordering, and a transposition table. How do you keep dice testable? Pass them in as an interface.`,
      },
    ],
    classDiagram: `classDiagram
    class Game {
        <<interface>>
        +players() List
        +current() Player
        +status() GameStatus
        +winner() Player
        +validate(move) Optional
        +apply(move)
        +legalMoves() List
        +snapshot() Object
        +restore(snapshot)
        +render() String
    }
    class GameSession {
        +play(player, move) PlayResult
        +undo() PlayResult
        +subscribe(listener)
        +moves() List
    }
    class GameListener {
        <<interface>>
        +onMove(player, move)
        +onEnd(status, winner)
    }
    class Bot {
        <<interface>>
        +choose(game) M
    }
    class TicTacToe {
        rows
        cols
        diagonal
        anti
    }
    class SnakeAndLadder {
        jumps
        position
        sixes
    }
    class ChessGame {
        board
        turn
        +inCheck() boolean
    }
    class Board {
        +at(r, c) Piece
        +attackedBy(color, r, c) boolean
        +copy() Board
    }
    class Piece {
        <<abstract>>
        color
        +pseudoMoves(board, r, c) List
        +attacks(board, r, c) List
    }
    class Dice {
        <<interface>>
        +roll() int
    }
    GameSession --> Game
    GameSession --> GameListener
    Game <|.. TicTacToe
    Game <|.. SnakeAndLadder
    Game <|.. ChessGame
    Bot <|.. RandomBot
    Bot <|.. MinimaxBot
    Bot ..> Game
    ChessGame --> Board
    Board --> Piece
    Piece <|-- King
    Piece <|-- Queen
    Piece <|-- Rook
    Piece <|-- Bishop
    Piece <|-- Knight
    Piece <|-- Pawn
    SnakeAndLadder ..> Dice`,
    sequenceDiagram: `sequenceDiagram
    actor Ben
    participant S as GameSession
    participant G as ChessGame
    participant B as Board
    participant L as GameListener
    Ben->>S: play(Ben, d8h4)
    S->>S: game in progress, it is Ben's turn
    S->>G: validate(d8h4)
    G->>B: pseudoMoves of the queen on d8
    G->>B: copy, play the move, is black king attacked?
    G-->>S: legal
    S->>G: snapshot() onto the history
    S->>G: apply(d8h4)
    G->>B: attackedBy(black, white king)
    G->>G: no legal move for white and in check: WON
    S->>L: onMove, then onEnd(WON, Ben)
    S-->>Ben: OK`,
    stateDiagram: `stateDiagram-v2
    [*] --> IN_PROGRESS
    IN_PROGRESS --> IN_PROGRESS: legal move, turn passes
    IN_PROGRESS --> WON: a line is complete, the exact finish, or checkmate
    IN_PROGRESS --> DRAW: full board, stalemate, or insufficient material
    WON --> IN_PROGRESS: undo restores the snapshot
    DRAW --> IN_PROGRESS: undo restores the snapshot`,
    extraDiagrams: [
      {
        title: "What play checks, in order",
        caption: "The same checks for every game. Only validate and apply are different between games.",
        source: `flowchart TD
    P["play(player, move)"] --> S{"Game in progress?"}
    S -- no --> G["GAME_OVER"]
    S -- yes --> T{"Is it this player's turn?"}
    T -- no --> N["NOT_YOUR_TURN"]
    T -- yes --> V{"game.validate(move)"}
    V -- "illegal" --> I["ILLEGAL_MOVE with the reason"]
    V -- legal --> H["Push snapshot, apply the move, notify listeners"]
    H --> OK["OK"]`,
      },
      {
        title: "Memento: undo and look-ahead",
        caption: "The snapshot is the whole state, so going back is exact for captures, jumps and counters alike.",
        source: `sequenceDiagram
    participant S as GameSession
    participant G as Game
    S->>G: snapshot()
    G-->>S: copy of the whole state, pushed on the history
    S->>G: apply(move)
    Note over S,G: later
    S->>G: restore(popped snapshot)
    G-->>S: the state is exactly as before the move`,
      },
      {
        title: "Tic-tac-toe win check in O(1)",
        caption: "A move at row 1, column 1 on a 3 by 3 board adds one to four counters. The player wins when any counter reaches 3.",
        source: `flowchart TD
    M["Mark at row r, column c by player p"] --> R["rows[p][r] + 1"]
    M --> C["cols[p][c] + 1"]
    M --> D{"r equals c?"}
    D -- yes --> D1["diagonal[p] + 1"]
    M --> A{"r + c equals N - 1?"}
    A -- yes --> A1["anti[p] + 1"]
    R --> W{"Any counter equals N?"}
    C --> W
    D1 --> W
    A1 --> W
    W -- yes --> WIN["p wins"]
    W -- no --> F{"N times N moves played?"}
    F -- yes --> DR["Draw"]
    F -- no --> NX["Next player"]`,
      },
      {
        title: "Snakes and ladders: one roll",
        caption: "The rules in the order apply follows them. A six that moved keeps the turn.",
        source: `flowchart TD
    R["Roll v"] --> S["sixes = v is 6 ? sixes + 1 : 0"]
    S --> T{"sixes is 3?"}
    T -- yes --> PASS["No movement, sixes = 0, next player"]
    T -- no --> X{"position + v beyond the last square?"}
    X -- yes --> STAY["Stay where you are"]
    X -- no --> J["Move, then take a snake or ladder if there is one"]
    J --> E{"On the last square?"}
    STAY --> SIX{"v is 6?"}
    E -- yes --> WON["WON"]
    E -- no --> SIX
    SIX -- yes --> AGAIN["Same player rolls again"]
    SIX -- no --> NEXT["Next player, sixes = 0"]`,
      },
      {
        title: "Chess move legality",
        caption: "Reach the square by the piece's own rules, then check that the king is safe after the move, on a copy of the board.",
        source: `flowchart TD
    M["validate(from, to)"] --> P{"A piece of the side to move on from?"}
    P -- no --> R1["Illegal: not yours or empty"]
    P -- yes --> Q{"to is in piece.pseudoMoves?"}
    Q -- no --> R2["Illegal: the piece cannot move like that"]
    Q -- yes --> C["Copy the board and play the move"]
    C --> K{"Is my king attacked on the copy?"}
    K -- yes --> R3["Illegal: the king would be in check"]
    K -- no --> OK["Legal"]`,
      },
      {
        title: "End of a chess game",
        caption: "After each move, look at the side that has to move next.",
        source: `flowchart TD
    A["Move played, other side to move"] --> M{"Only kings, or one bishop or knight?"}
    M -- yes --> D1["DRAW, insufficient material"]
    M -- no --> L{"Any legal move?"}
    L -- yes --> GO["IN_PROGRESS"]
    L -- no --> K{"Is its king attacked?"}
    K -- yes --> W["WON: checkmate, the side that just moved wins"]
    K -- no --> D2["DRAW: stalemate"]`,
      },
      {
        title: "Pieces and what they share",
        caption: "Sliding pieces share one helper, the king and knight share another. The pawn has its own attacks.",
        source: `flowchart TD
    P["Piece: pseudoMoves and attacks"] --> SL["slide helper: walk to the edge or a piece"]
    P --> ST["step helper: one step to each offset"]
    SL --> RO["Rook: 4 directions"]
    SL --> BI["Bishop: 4 diagonals"]
    SL --> QU["Queen: both"]
    ST --> KI["King: 8 neighbours"]
    ST --> KN["Knight: 8 jumps"]
    P --> PA["Pawn: moves forward, captures diagonally, attacks are not its moves"]`,
      },
      {
        title: "Minimax looks ahead with snapshots",
        caption: "Try a move, score the rest of the game, step back. A faster win scores higher than a slower one.",
        source: `flowchart TD
    C["choose(game)"] --> E["For each legal move"]
    E --> S["snapshot, apply the move"]
    S --> V["value of the position: depth 1"]
    V --> R["restore"]
    R --> B["Keep the move with the best score"]
    V --> T{"Game over?"}
    T -- "won by the bot" --> W["100 - depth"]
    T -- "lost" --> LO["depth - 100"]
    T -- draw --> DR["0"]
    T -- "no" --> D["Recurse for the opponent, alpha-beta pruning"]`,
      },
      {
        title: "Where the extensions attach",
        caption: "Each follow-up question lands in one place.",
        source: `flowchart TD
    X["Follow-up questions"] --> CA["Castling and en passant"]
    X --> CL["Chess clock"]
    X --> ON["Online play"]
    X --> NG["More games"]
    X --> SB["Stronger chess bot"]
    CA --> CA1["State in ChessGame, a move that moves two pieces"]
    CL --> CL1["GameListener plus a timer that ends the game"]
    ON --> ON1["GameSession behind a server, listeners push over sockets"]
    NG --> NG1["New Game class, nothing else changes"]
    SB --> SB1["New Bot with depth limit and evaluation"]`,
      },
    ],
    concurrency: [
      "GameSession's methods are synchronized, so two players, a spectator and a timer touching the same game are decided one at a time. The games themselves need no locks, because nobody reaches them except through the session.",
      "The turn check and the legality check happen inside the same critical section as the move, so two threads cannot both play the same cell.",
      "Snapshots copy the state, so a bot that looks ahead on a copy of the game does not race with the session. Give the bot a copy, not the live game.",
      "Listeners run while the lock is held, which keeps events in order. A slow listener would stall the game, so in production it only enqueues.",
      "The test starts four threads playing the same 50 by 50 game and checks that every accepted move is in the history exactly once.",
      "Online: one session per match on one server, so everything about a match is single-writer. Matches spread over servers by match id.",
    ],
  },
};
