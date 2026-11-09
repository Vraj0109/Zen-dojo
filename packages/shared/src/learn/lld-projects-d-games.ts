import type { LldProject } from "./types";

// Games framework: tic-tac-toe, snakes and ladders, chess (plan 0025). Java 17, standard library only, default package.
// Compiled with javac -Xlint:all and run (Main and Tests) when it was written.

export const LLD_PROJECTS_D_GAMES: Record<string, LldProject> = {
  "lldp-games": {
    files: [
      {
        name: "Player.java",
        code: `record Player(String id, String name) { }
`,
      },
      {
        name: "GameStatus.java",
        code: `enum GameStatus { IN_PROGRESS, WON, DRAW }
`,
      },
      {
        name: "Game.java",
        code: `import java.util.List;
import java.util.Optional;

// What every game in this framework offers. M is the type of one move: a cell for tic-tac-toe, a dice roll for snakes and
// ladders, a from-and-to pair for chess. The session, the bots and the tests only know this interface, so a new game is
// a new class and nothing else changes.
interface Game<M> {
    List<Player> players();

    Player current();

    GameStatus status();

    // The winner when the status is WON, otherwise null.
    Player winner();

    // Why a move is not allowed, or empty when it is. Never changes the game.
    Optional<String> validate(M move);

    // Plays a move that validate accepted. Moves the turn on, and sets the status when the game ends.
    void apply(M move);

    // All moves the current player may make now. Bots use it; for chess it is the full legal move list.
    List<M> legalMoves();

    // Memento: an opaque copy of the whole state, used for undo and for bots that try moves ahead.
    Object snapshot();

    void restore(Object snapshot);

    String render();
}
`,
      },
      {
        name: "PlayCode.java",
        code: `enum PlayCode { OK, NOT_YOUR_TURN, ILLEGAL_MOVE, GAME_OVER, NOTHING_TO_UNDO }
`,
      },
      {
        name: "PlayResult.java",
        code: `record PlayResult(PlayCode code, String message) {
    static PlayResult success() { return new PlayResult(PlayCode.OK, ""); }

    boolean ok() { return code == PlayCode.OK; }
}
`,
      },
      {
        name: "GameListener.java",
        code: `// Observer: a UI redraws, a server pushes the move to the other player, a log records it.
interface GameListener<M> {
    void onMove(Player player, M move);

    void onEnd(GameStatus status, Player winner);
}
`,
      },
      {
        name: "GameSession.java",
        code: `import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Optional;

// One match of any game. It owns the rules that are the same everywhere: it is somebody's turn, nothing is played after
// the end, every legal move is remembered for undo, and listeners are told. The game itself only knows its own rules.
final class GameSession<M> {
    private final Game<M> game;
    private final Deque<Object> history = new ArrayDeque<>();
    private final List<M> moves = new ArrayList<>();
    private final List<GameListener<M>> listeners = new ArrayList<>();

    GameSession(Game<M> game) { this.game = game; }

    synchronized void subscribe(GameListener<M> listener) { listeners.add(listener); }

    synchronized PlayResult play(Player player, M move) {
        if (game.status() != GameStatus.IN_PROGRESS) return new PlayResult(PlayCode.GAME_OVER, "the game has ended");
        if (!game.current().equals(player)) return new PlayResult(PlayCode.NOT_YOUR_TURN, "it is " + game.current().name() + "'s turn");
        Optional<String> problem = game.validate(move);
        if (problem.isPresent()) return new PlayResult(PlayCode.ILLEGAL_MOVE, problem.get());

        history.push(game.snapshot());   // before the move, so undo can restore exactly this
        moves.add(move);
        game.apply(move);
        for (GameListener<M> l : listeners) l.onMove(player, move);
        if (game.status() != GameStatus.IN_PROGRESS) {
            for (GameListener<M> l : listeners) l.onEnd(game.status(), game.winner());
        }
        return PlayResult.success();
    }

    // Takes back the last move, whoever made it. Works across captures and jumps because the snapshot is the whole state.
    synchronized PlayResult undo() {
        if (history.isEmpty()) return new PlayResult(PlayCode.NOTHING_TO_UNDO, "no move to take back");
        game.restore(history.pop());
        moves.remove(moves.size() - 1);
        return PlayResult.success();
    }

    synchronized int movesPlayed() { return moves.size(); }

    synchronized List<M> moves() { return List.copyOf(moves); }

    Game<M> game() { return game; }
}
`,
      },
      {
        name: "Bot.java",
        code: `// A computer player: given a game in progress, pick one of the legal moves. A strategy again.
interface Bot<M> {
    M choose(Game<M> game);
}
`,
      },
      {
        name: "RandomBot.java",
        code: `import java.util.List;
import java.util.Random;

final class RandomBot<M> implements Bot<M> {
    private final Random random;

    RandomBot(long seed) { this.random = new Random(seed); }

    @Override
    public M choose(Game<M> game) {
        List<M> options = game.legalMoves();
        return options.get(random.nextInt(options.size()));
    }
}
`,
      },
      {
        name: "MinimaxBot.java",
        code: `import java.util.List;

// Tries every move, every reply, and so on to the end of the game, using snapshot and restore to step back. A win for
// the bot scores more the sooner it comes and a loss scores less the later it comes, so the bot takes a win in one move
// instead of a win in three, and delays a loss as long as it can. A draw scores 0. Alpha-beta pruning skips branches
// that cannot change the answer. Only for small games: tic-tac-toe has a few thousand positions, chess has more than
// there are atoms, so chess needs a depth limit and an evaluation of the position, which is a different bot.
final class MinimaxBot<M> implements Bot<M> {
    private static final int WIN = 100;

    @Override
    public M choose(Game<M> game) {
        Player me = game.current();
        M best = null;
        int bestScore = Integer.MIN_VALUE;
        for (M move : game.legalMoves()) {
            Object before = game.snapshot();
            game.apply(move);
            int score = value(game, me, 1, Integer.MIN_VALUE, Integer.MAX_VALUE);
            game.restore(before);
            if (score > bestScore) {
                bestScore = score;
                best = move;
            }
        }
        return best;
    }

    private int value(Game<M> game, Player me, int depth, int alpha, int beta) {
        if (game.status() == GameStatus.WON) return game.winner().equals(me) ? WIN - depth : depth - WIN;
        if (game.status() == GameStatus.DRAW) return 0;
        boolean maximizing = game.current().equals(me);
        List<M> options = game.legalMoves();
        int best = maximizing ? Integer.MIN_VALUE : Integer.MAX_VALUE;
        for (M move : options) {
            Object before = game.snapshot();
            game.apply(move);
            int score = value(game, me, depth + 1, alpha, beta);
            game.restore(before);
            if (maximizing) {
                best = Math.max(best, score);
                alpha = Math.max(alpha, best);
            } else {
                best = Math.min(best, score);
                beta = Math.min(beta, best);
            }
            if (alpha >= beta) break;
        }
        return best;
    }
}
`,
      },
      {
        name: "Cell.java",
        code: `record Cell(int row, int col) {
    @Override
    public String toString() { return "(" + row + "," + col + ")"; }
}
`,
      },
      {
        name: "TicTacToe.java",
        code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

// Tic-tac-toe on an N by N board where N in a row wins. Checking for a win after every move by scanning the board costs
// O(N) per line and gets slow on big boards. Instead each player keeps a counter per row, per column and for both
// diagonals: a move adds one to at most four counters, and the player wins the moment any counter reaches N.
// So deciding the winner is O(1) per move.
final class TicTacToe implements Game<Cell> {
    private final int n;
    private final List<Player> players;
    private int[][] board;              // 0 empty, 1 + player index otherwise
    private int[][] rows;               // rows[p][r] = marks of player p in row r
    private int[][] cols;
    private int[] diagonal;
    private int[] anti;
    private int turn;
    private int moves;
    private GameStatus status = GameStatus.IN_PROGRESS;
    private Player winner;

    TicTacToe(int n, Player first, Player second) {
        if (n < 3) throw new IllegalArgumentException("the board needs at least 3 rows");
        this.n = n;
        this.players = List.of(first, second);
        reset();
    }

    private void reset() {
        board = new int[n][n];
        rows = new int[2][n];
        cols = new int[2][n];
        diagonal = new int[2];
        anti = new int[2];
        turn = 0;
        moves = 0;
        status = GameStatus.IN_PROGRESS;
        winner = null;
    }

    @Override
    public List<Player> players() { return players; }

    @Override
    public Player current() { return players.get(turn); }

    @Override
    public GameStatus status() { return status; }

    @Override
    public Player winner() { return winner; }

    @Override
    public Optional<String> validate(Cell move) {
        if (move.row() < 0 || move.row() >= n || move.col() < 0 || move.col() >= n) return Optional.of(move + " is off the board");
        if (board[move.row()][move.col()] != 0) return Optional.of(move + " is taken");
        return Optional.empty();
    }

    @Override
    public void apply(Cell move) {
        int p = turn;
        int r = move.row();
        int c = move.col();
        board[r][c] = p + 1;
        moves++;
        boolean win = ++rows[p][r] == n;
        win |= ++cols[p][c] == n;
        if (r == c) win |= ++diagonal[p] == n;
        if (r + c == n - 1) win |= ++anti[p] == n;
        if (win) {
            status = GameStatus.WON;
            winner = players.get(p);
        } else if (moves == n * n) {
            status = GameStatus.DRAW;
        } else {
            turn = 1 - turn;
        }
    }

    @Override
    public List<Cell> legalMoves() {
        List<Cell> out = new ArrayList<>();
        if (status != GameStatus.IN_PROGRESS) return out;
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < n; c++) if (board[r][c] == 0) out.add(new Cell(r, c));
        }
        return out;
    }

    private record Saved(int[][] board, int[][] rows, int[][] cols, int[] diagonal, int[] anti, int turn, int moves, GameStatus status, Player winner) { }

    @Override
    public Object snapshot() {
        return new Saved(deep(board), deep(rows), deep(cols), diagonal.clone(), anti.clone(), turn, moves, status, winner);
    }

    @Override
    public void restore(Object snapshot) {
        Saved s = (Saved) snapshot;
        board = deep(s.board());
        rows = deep(s.rows());
        cols = deep(s.cols());
        diagonal = s.diagonal().clone();
        anti = s.anti().clone();
        turn = s.turn();
        moves = s.moves();
        status = s.status();
        winner = s.winner();
    }

    private static int[][] deep(int[][] a) {
        int[][] copy = new int[a.length][];
        for (int i = 0; i < a.length; i++) copy[i] = Arrays.copyOf(a[i], a[i].length);
        return copy;
    }

    @Override
    public String render() {
        StringBuilder sb = new StringBuilder();
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < n; c++) sb.append(board[r][c] == 0 ? '.' : (board[r][c] == 1 ? 'X' : 'O'));
            sb.append('\\n');
        }
        return sb.toString();
    }
}
`,
      },
      {
        name: "Roll.java",
        code: `record Roll(int value) { }
`,
      },
      {
        name: "Dice.java",
        code: `import java.util.Random;

// Dice are an input, not something the game does: a test passes a fixed sequence, a real game passes a seeded or
// secure random one.
interface Dice {
    int roll();

    static Dice seeded(long seed) {
        Random random = new Random(seed);
        return () -> random.nextInt(6) + 1;
    }

    static Dice fixed(int... values) {
        int[] next = {0};
        return () -> values[next[0]++ % values.length];
    }
}
`,
      },
      {
        name: "SnakeAndLadder.java",
        code: `import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

// Snakes and ladders for any number of players. Rules: you must land exactly on the last square to win; a snake or ladder
// takes you from its head to its tail once (no chains); a six gives another turn, but the third six in a row does not move
// you and passes the turn.
final class SnakeAndLadder implements Game<Roll> {
    private final int size;
    private final Map<Integer, Integer> jumps;   // start square to end square, for snakes and ladders alike
    private final List<Player> players;
    private int[] position;
    private int turn;
    private int sixes;                            // sixes in a row by the current player
    private GameStatus status = GameStatus.IN_PROGRESS;
    private Player winner;

    SnakeAndLadder(int size, Map<Integer, Integer> jumps, List<Player> players) {
        if (players.size() < 2) throw new IllegalArgumentException("at least two players");
        for (Map.Entry<Integer, Integer> j : jumps.entrySet()) {
            if (j.getKey() <= 1 || j.getKey() >= size || j.getValue() < 1 || j.getValue() > size || j.getKey().equals(j.getValue())) {
                throw new IllegalArgumentException("bad jump " + j.getKey() + " to " + j.getValue());
            }
            if (jumps.containsKey(j.getValue())) throw new IllegalArgumentException("jumps must not chain: " + j.getValue());
        }
        this.size = size;
        this.jumps = Map.copyOf(jumps);
        this.players = List.copyOf(players);
        this.position = new int[players.size()];
    }

    int positionOf(Player p) { return position[players.indexOf(p)]; }

    @Override
    public List<Player> players() { return players; }

    @Override
    public Player current() { return players.get(turn); }

    @Override
    public GameStatus status() { return status; }

    @Override
    public Player winner() { return winner; }

    @Override
    public Optional<String> validate(Roll move) {
        return move.value() >= 1 && move.value() <= 6 ? Optional.empty() : Optional.of("a die shows 1 to 6, not " + move.value());
    }

    @Override
    public void apply(Roll move) {
        int p = turn;
        sixes = move.value() == 6 ? sixes + 1 : 0;
        boolean moved = sixes < 3;
        if (moved) {
            int target = position[p] + move.value();
            if (target <= size) {
                position[p] = jumps.getOrDefault(target, target);
            }
        }
        if (position[p] == size) {
            status = GameStatus.WON;
            winner = players.get(p);
            return;
        }
        if (move.value() == 6 && moved) return;   // another turn for the same player
        sixes = 0;
        turn = (turn + 1) % players.size();
    }

    @Override
    public List<Roll> legalMoves() {
        List<Roll> out = new ArrayList<>();
        if (status != GameStatus.IN_PROGRESS) return out;
        for (int v = 1; v <= 6; v++) out.add(new Roll(v));
        return out;
    }

    private record Saved(int[] position, int turn, int sixes, GameStatus status, Player winner) { }

    @Override
    public Object snapshot() { return new Saved(position.clone(), turn, sixes, status, winner); }

    @Override
    public void restore(Object snapshot) {
        Saved s = (Saved) snapshot;
        position = s.position().clone();
        turn = s.turn();
        sixes = s.sixes();
        status = s.status();
        winner = s.winner();
    }

    @Override
    public String render() {
        Map<String, Integer> where = new LinkedHashMap<>();
        for (int i = 0; i < players.size(); i++) where.put(players.get(i).name(), position[i]);
        return where.toString();
    }
}
`,
      },
      {
        name: "Color.java",
        code: `enum Color {
    WHITE, BLACK;

    Color other() { return this == WHITE ? BLACK : WHITE; }
}
`,
      },
      {
        name: "Piece.java",
        code: `import java.util.ArrayList;
import java.util.List;

// A chess piece knows how it MOVES; the board and the game know the rest. pseudoMoves returns the squares the piece can
// reach by its own rules, ignoring whether that leaves its own king in check. ChessGame filters those. attacks returns
// the squares the piece threatens, which is the same list for every piece except the pawn.
abstract class Piece {
    final Color color;

    Piece(Color color) { this.color = color; }

    abstract char symbol();

    abstract List<int[]> pseudoMoves(Board board, int row, int col);

    List<int[]> attacks(Board board, int row, int col) { return pseudoMoves(board, row, col); }

    // Moves in a straight line in each direction until the edge or a piece: captures an enemy, stops before a friend.
    protected List<int[]> slide(Board board, int row, int col, int[][] directions) {
        List<int[]> out = new ArrayList<>();
        for (int[] d : directions) {
            int r = row + d[0];
            int c = col + d[1];
            while (Board.inside(r, c)) {
                Piece other = board.at(r, c);
                if (other == null) {
                    out.add(new int[] {r, c});
                } else {
                    if (other.color != color) out.add(new int[] {r, c});
                    break;
                }
                r += d[0];
                c += d[1];
            }
        }
        return out;
    }

    // One step to each of the given offsets (king and knight).
    protected List<int[]> step(Board board, int row, int col, int[][] offsets) {
        List<int[]> out = new ArrayList<>();
        for (int[] d : offsets) {
            int r = row + d[0];
            int c = col + d[1];
            if (!Board.inside(r, c)) continue;
            Piece other = board.at(r, c);
            if (other == null || other.color != color) out.add(new int[] {r, c});
        }
        return out;
    }

    static final int[][] ORTHOGONAL = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    static final int[][] DIAGONAL = {{1, 1}, {1, -1}, {-1, 1}, {-1, -1}};
}
`,
      },
      {
        name: "King.java",
        code: `import java.util.List;

final class King extends Piece {
    King(Color color) { super(color); }

    @Override
    char symbol() { return 'K'; }

    @Override
    List<int[]> pseudoMoves(Board b, int r, int c) {
        return step(b, r, c, new int[][] {{1, 0}, {-1, 0}, {0, 1}, {0, -1}, {1, 1}, {1, -1}, {-1, 1}, {-1, -1}});
    }
}
`,
      },
      {
        name: "Queen.java",
        code: `import java.util.List;

final class Queen extends Piece {
    Queen(Color color) { super(color); }

    @Override
    char symbol() { return 'Q'; }

    @Override
    List<int[]> pseudoMoves(Board b, int r, int c) {
        List<int[]> out = slide(b, r, c, ORTHOGONAL);
        out.addAll(slide(b, r, c, DIAGONAL));
        return out;
    }
}
`,
      },
      {
        name: "Rook.java",
        code: `import java.util.List;

final class Rook extends Piece {
    Rook(Color color) { super(color); }

    @Override
    char symbol() { return 'R'; }

    @Override
    List<int[]> pseudoMoves(Board b, int r, int c) { return slide(b, r, c, ORTHOGONAL); }
}
`,
      },
      {
        name: "Bishop.java",
        code: `import java.util.List;

final class Bishop extends Piece {
    Bishop(Color color) { super(color); }

    @Override
    char symbol() { return 'B'; }

    @Override
    List<int[]> pseudoMoves(Board b, int r, int c) { return slide(b, r, c, DIAGONAL); }
}
`,
      },
      {
        name: "Knight.java",
        code: `import java.util.List;

final class Knight extends Piece {
    Knight(Color color) { super(color); }

    @Override
    char symbol() { return 'N'; }

    @Override
    List<int[]> pseudoMoves(Board b, int r, int c) {
        return step(b, r, c, new int[][] {{2, 1}, {2, -1}, {-2, 1}, {-2, -1}, {1, 2}, {1, -2}, {-1, 2}, {-1, -2}});
    }
}
`,
      },
      {
        name: "Pawn.java",
        code: `import java.util.ArrayList;
import java.util.List;

// White pawns move up the board (towards row 0), black pawns down. A pawn is the odd one out: it moves forward but
// captures diagonally, so the squares it attacks are not the squares it can move to.
final class Pawn extends Piece {
    Pawn(Color color) { super(color); }

    @Override
    char symbol() { return 'P'; }

    private int forward() { return color == Color.WHITE ? -1 : 1; }

    private int startRow() { return color == Color.WHITE ? 6 : 1; }

    @Override
    List<int[]> pseudoMoves(Board b, int r, int c) {
        List<int[]> out = new ArrayList<>();
        int one = r + forward();
        if (Board.inside(one, c) && b.at(one, c) == null) {
            out.add(new int[] {one, c});
            int two = r + 2 * forward();
            if (r == startRow() && b.at(two, c) == null) out.add(new int[] {two, c});
        }
        for (int[] sq : attacks(b, r, c)) {
            Piece target = b.at(sq[0], sq[1]);
            if (target != null && target.color != color) out.add(sq);
        }
        return out;
    }

    @Override
    List<int[]> attacks(Board b, int r, int c) {
        List<int[]> out = new ArrayList<>();
        for (int dc : new int[] {-1, 1}) {
            if (Board.inside(r + forward(), c + dc)) out.add(new int[] {r + forward(), c + dc});
        }
        return out;
    }

    boolean promotesAt(int row) { return row == (color == Color.WHITE ? 0 : 7); }
}
`,
      },
      {
        name: "Board.java",
        code: `// An 8 by 8 board. Row 0 is rank 8 (black's back row) and row 7 is rank 1, so a square written e2 is row 6, column 4.
final class Board {
    private final Piece[][] squares = new Piece[8][8];

    static boolean inside(int r, int c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

    Piece at(int r, int c) { return squares[r][c]; }

    void put(int r, int c, Piece p) { squares[r][c] = p; }

    Board copy() {
        Board b = new Board();
        for (int r = 0; r < 8; r++) System.arraycopy(squares[r], 0, b.squares[r], 0, 8);
        return b;   // pieces are immutable, so sharing them between copies is safe
    }

    // Is the square attacked by any piece of the given colour?
    boolean attackedBy(Color color, int row, int col) {
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                Piece p = squares[r][c];
                if (p == null || p.color != color) continue;
                for (int[] sq : p.attacks(this, r, c)) if (sq[0] == row && sq[1] == col) return true;
            }
        }
        return false;
    }

    int[] kingOf(Color color) {
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                if (squares[r][c] instanceof King && squares[r][c].color == color) return new int[] {r, c};
            }
        }
        return null;
    }

    static Board standard() {
        Board b = new Board();
        String back = "RNBQKBNR";
        for (int c = 0; c < 8; c++) {
            b.put(0, c, make(back.charAt(c), Color.BLACK));
            b.put(1, c, new Pawn(Color.BLACK));
            b.put(6, c, new Pawn(Color.WHITE));
            b.put(7, c, make(back.charAt(c), Color.WHITE));
        }
        return b;
    }

    // Builds a position from eight strings of eight characters: capital letters are white, small letters black, a dot
    // is an empty square. Used for the tests, so that a position of five pieces needs five characters.
    static Board parse(String... rows) {
        Board b = new Board();
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                char ch = rows[r].charAt(c);
                if (ch != '.') b.put(r, c, make(Character.toUpperCase(ch), Character.isUpperCase(ch) ? Color.WHITE : Color.BLACK));
            }
        }
        return b;
    }

    static Piece make(char symbol, Color color) {
        return switch (symbol) {
            case 'K' -> new King(color);
            case 'Q' -> new Queen(color);
            case 'R' -> new Rook(color);
            case 'B' -> new Bishop(color);
            case 'N' -> new Knight(color);
            case 'P' -> new Pawn(color);
            default -> throw new IllegalArgumentException("unknown piece " + symbol);
        };
    }

    String render() {
        StringBuilder sb = new StringBuilder();
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                Piece p = squares[r][c];
                sb.append(p == null ? '.' : (p.color == Color.WHITE ? p.symbol() : Character.toLowerCase(p.symbol())));
            }
            sb.append('\\n');
        }
        return sb.toString();
    }
}
`,
      },
      {
        name: "ChessMove.java",
        code: `// A move as a pair of squares, and the piece a pawn becomes on the last row (a queen if none is named).
record ChessMove(int fromRow, int fromCol, int toRow, int toCol, char promotion) {
    ChessMove(int fromRow, int fromCol, int toRow, int toCol) { this(fromRow, fromCol, toRow, toCol, 'Q'); }

    // "e2e4" style: file letter a to h, rank digit 1 to 8.
    static ChessMove parse(String text) {
        if (text.length() < 4) throw new IllegalArgumentException("a move looks like e2e4: " + text);
        return new ChessMove(8 - (text.charAt(1) - '0'), text.charAt(0) - 'a', 8 - (text.charAt(3) - '0'), text.charAt(2) - 'a',
                text.length() > 4 ? Character.toUpperCase(text.charAt(4)) : 'Q');
    }

    @Override
    public String toString() {
        return "" + (char) ('a' + fromCol) + (8 - fromRow) + (char) ('a' + toCol) + (8 - toRow);
    }
}
`,
      },
      {
        name: "ChessGame.java",
        code: `import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

// Chess without castling and en passant (they are the first two extensions an interviewer asks for; see the notes).
// A move is legal when the piece can reach the square by its own rules AND the mover's king is not attacked afterwards.
// That second test is done by playing the move on a copy of the board and asking the board, which is simple and
// correct for every piece without special cases. After each move the game looks at the opponent: with no legal move,
// it is checkmate if the king is attacked, and a stalemate draw if not.
final class ChessGame implements Game<ChessMove> {
    private final List<Player> players;
    private Board board;
    private Color turn = Color.WHITE;
    private GameStatus status = GameStatus.IN_PROGRESS;
    private Player winner;
    private boolean check;

    ChessGame(Player white, Player black) { this(white, black, Board.standard(), Color.WHITE); }

    ChessGame(Player white, Player black, Board board, Color toMove) {
        this.players = List.of(white, black);
        this.board = board;
        this.turn = toMove;
        this.check = inCheck(board, toMove);
        settle();
    }

    boolean inCheck() { return check; }

    Piece pieceAt(String square) { return board.at(8 - (square.charAt(1) - '0'), square.charAt(0) - 'a'); }

    private static boolean inCheck(Board b, Color color) {
        int[] king = b.kingOf(color);
        return king != null && b.attackedBy(color.other(), king[0], king[1]);
    }

    @Override
    public List<Player> players() { return players; }

    @Override
    public Player current() { return players.get(turn == Color.WHITE ? 0 : 1); }

    @Override
    public GameStatus status() { return status; }

    @Override
    public Player winner() { return winner; }

    @Override
    public Optional<String> validate(ChessMove m) {
        if (!Board.inside(m.fromRow(), m.fromCol()) || !Board.inside(m.toRow(), m.toCol())) return Optional.of("off the board");
        Piece p = board.at(m.fromRow(), m.fromCol());
        if (p == null) return Optional.of("no piece on " + m);
        if (p.color != turn) return Optional.of("that piece is not yours");
        boolean reachable = false;
        for (int[] sq : p.pseudoMoves(board, m.fromRow(), m.fromCol())) {
            if (sq[0] == m.toRow() && sq[1] == m.toCol()) reachable = true;
        }
        if (!reachable) return Optional.of(p.symbol() + " cannot move like that");
        if (inCheck(after(board, m), turn)) return Optional.of("your king would be in check");
        return Optional.empty();
    }

    // The board after the move, on a copy. Pawns that reach the last row become the chosen piece.
    private static Board after(Board b, ChessMove m) {
        Board next = b.copy();
        Piece p = next.at(m.fromRow(), m.fromCol());
        next.put(m.fromRow(), m.fromCol(), null);
        if (p instanceof Pawn pawn && pawn.promotesAt(m.toRow())) p = Board.make(m.promotion(), p.color);
        next.put(m.toRow(), m.toCol(), p);
        return next;
    }

    @Override
    public void apply(ChessMove m) {
        board = after(board, m);
        turn = turn.other();
        check = inCheck(board, turn);
        settle();
    }

    // Decides whether the game goes on, given whose turn it is.
    private void settle() {
        status = GameStatus.IN_PROGRESS;
        winner = null;
        if (insufficientMaterial()) {
            status = GameStatus.DRAW;
        } else if (legalMoves().isEmpty()) {
            if (check) {
                status = GameStatus.WON;
                winner = players.get(turn == Color.WHITE ? 1 : 0);   // the side that just moved
            } else {
                status = GameStatus.DRAW;
            }
        }
    }

    // King against king, or king and one minor piece against a king: nobody can ever give checkmate.
    private boolean insufficientMaterial() {
        int others = 0;
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                Piece p = board.at(r, c);
                if (p == null || p instanceof King) continue;
                if (p instanceof Bishop || p instanceof Knight) others++;
                else return false;
            }
        }
        return others <= 1;
    }

    @Override
    public List<ChessMove> legalMoves() {
        List<ChessMove> out = new ArrayList<>();
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                Piece p = board.at(r, c);
                if (p == null || p.color != turn) continue;
                for (int[] sq : p.pseudoMoves(board, r, c)) {
                    ChessMove m = new ChessMove(r, c, sq[0], sq[1]);
                    if (!inCheck(after(board, m), turn)) out.add(m);
                }
            }
        }
        return out;
    }

    private record Saved(Board board, Color turn, GameStatus status, Player winner, boolean check) { }

    @Override
    public Object snapshot() { return new Saved(board.copy(), turn, status, winner, check); }

    @Override
    public void restore(Object snapshot) {
        Saved s = (Saved) snapshot;
        board = s.board().copy();
        turn = s.turn();
        status = s.status();
        winner = s.winner();
        check = s.check();
    }

    @Override
    public String render() { return board.render(); }
}
`,
      },
      {
        name: "Main.java",
        code: `import java.util.List;
import java.util.Map;

public class Main {
    public static void main(String[] args) {
        Player asha = new Player("a", "Asha");
        Player ben = new Player("b", "Ben");

        // Tic-tac-toe, played by hand
        GameSession<Cell> ttt = new GameSession<>(new TicTacToe(3, asha, ben));
        ttt.subscribe(new GameListener<>() {
            @Override
            public void onMove(Player player, Cell move) { }

            @Override
            public void onEnd(GameStatus status, Player winner) { System.out.println("Tic-tac-toe ended: " + status + ", winner " + (winner == null ? "nobody" : winner.name())); }
        });
        System.out.println("Ben plays first: " + ttt.play(ben, new Cell(1, 1)).code());
        ttt.play(asha, new Cell(1, 1));
        System.out.println("Ben on a taken cell: " + ttt.play(ben, new Cell(1, 1)).message() + "; off the board: " + ttt.play(ben, new Cell(3, 0)).message());
        ttt.play(ben, new Cell(0, 0));
        ttt.play(asha, new Cell(0, 2));
        ttt.play(ben, new Cell(0, 1));
        ttt.play(asha, new Cell(2, 0));
        System.out.print(ttt.game().render());
        System.out.println("A move after the end: " + ttt.play(ben, new Cell(2, 2)).code());
        System.out.println("Undo: " + ttt.undo().code() + ", moves left " + ttt.movesPlayed() + ", status " + ttt.game().status());

        // A bot that cannot lose
        TicTacToe bots = new TicTacToe(3, asha, ben);
        MinimaxBot<Cell> smart = new MinimaxBot<>();
        while (bots.status() == GameStatus.IN_PROGRESS) bots.apply(smart.choose(bots));
        System.out.println("Minimax against minimax: " + bots.status());

        // Snakes and ladders with fixed dice
        Map<Integer, Integer> jumps = Map.of(4, 14, 9, 27, 20, 29, 17, 7, 28, 12, 24, 8);
        SnakeAndLadder sl = new SnakeAndLadder(30, jumps, List.of(asha, ben));
        GameSession<Roll> session = new GameSession<>(sl);
        Dice dice = Dice.fixed(4, 3, 5, 6, 2, 6, 6, 6, 3, 1);
        while (sl.status() == GameStatus.IN_PROGRESS && session.movesPlayed() < 40) {
            Player p = sl.current();
            int v = dice.roll();
            session.play(p, new Roll(v));
        }
        System.out.println("Snakes and ladders after " + session.movesPlayed() + " rolls: " + sl.render() + ", " + sl.status());

        // Chess: fool's mate
        ChessGame chess = new ChessGame(asha, ben);
        GameSession<ChessMove> game = new GameSession<>(chess);
        for (String m : new String[] {"f2f3", "e7e5", "g2g4", "d8h4"}) game.play(chess.current(), ChessMove.parse(m));
        System.out.print(chess.render());
        System.out.println("Fool's mate: " + chess.status() + ", winner " + chess.winner().name() + ", check " + chess.inCheck());
        System.out.println("White legal moves at the start: " + new ChessGame(asha, ben).legalMoves().size());
        System.out.println("Illegal: " + new GameSession<>(new ChessGame(asha, ben)).play(asha, ChessMove.parse("e2e5")).message());
    }
}
`,
      },
    ],
    tests: [
      {
        name: "Tests.java",
        code: `import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

public class Tests {
    private static int failures = 0;

    private static void check(boolean ok, String name) {
        System.out.println((ok ? "PASS " : "FAIL ") + name);
        if (!ok) failures++;
    }

    private static final Player A = new Player("a", "Asha");
    private static final Player B = new Player("b", "Ben");
    private static final Player C = new Player("c", "Chen");

    public static void main(String[] args) throws Exception {
        ticTacToeWins();
        ticTacToeDrawAndRules();
        ticTacToeBigBoard();
        minimaxNeverLoses();
        sessionRules();
        sessionListenersAndUndo();
        snakesAndLadders();
        sixesAndTurns();
        chessMovement();
        chessPawns();
        chessCheckRules();
        chessEnds();
        chessMoveText();
        chessPerft();
        sessionIsThreadSafe();
        if (failures > 0) System.exit(1);
    }

    private static TicTacToe play(int n, int[][] cells) {
        TicTacToe g = new TicTacToe(n, A, B);
        for (int[] c : cells) {
            if (g.status() != GameStatus.IN_PROGRESS) break;
            Cell cell = new Cell(c[0], c[1]);
            if (g.validate(cell).isPresent()) throw new IllegalStateException("bad test move " + cell);
            g.apply(cell);
        }
        return g;
    }

    private static void ticTacToeWins() {
        // Asha moves first, Ben's moves are fillers that cannot win
        check(play(3, new int[][] {{0, 0}, {1, 0}, {0, 1}, {1, 1}, {0, 2}}).winner() == A, "a row wins");
        check(play(3, new int[][] {{0, 0}, {0, 1}, {1, 0}, {1, 1}, {2, 0}}).winner() == A, "a column wins");
        check(play(3, new int[][] {{0, 0}, {0, 1}, {1, 1}, {0, 2}, {2, 2}}).winner() == A, "the main diagonal wins");
        check(play(3, new int[][] {{0, 2}, {0, 0}, {1, 1}, {0, 1}, {2, 0}}).winner() == A, "the other diagonal wins");
        TicTacToe second = play(3, new int[][] {{0, 0}, {1, 0}, {0, 1}, {1, 1}, {2, 2}, {1, 2}});
        check(second.winner() == B && second.status() == GameStatus.WON, "the second player can win too");
    }

    private static void ticTacToeDrawAndRules() {
        TicTacToe draw = play(3, new int[][] {{0, 0}, {0, 1}, {0, 2}, {1, 1}, {1, 0}, {1, 2}, {2, 1}, {2, 0}, {2, 2}});
        check(draw.status() == GameStatus.DRAW && draw.winner() == null, "a full board with no line is a draw");
        check(draw.legalMoves().isEmpty(), "no moves are left after the end");
        TicTacToe g = new TicTacToe(3, A, B);
        g.apply(new Cell(1, 1));
        check(g.validate(new Cell(1, 1)).isPresent() && g.validate(new Cell(3, 0)).isPresent() && g.validate(new Cell(-1, 0)).isPresent(), "a taken cell and cells off the board are illegal");
        check(g.current() == B && g.legalMoves().size() == 8, "the turn passed and eight cells are left");
        boolean small = false;
        try {
            new TicTacToe(2, A, B);
        } catch (IllegalArgumentException e) {
            small = true;
        }
        check(small, "a board of 2 is refused");
        Object saved = g.snapshot();
        g.apply(new Cell(0, 0));
        g.restore(saved);
        check(g.legalMoves().size() == 8 && g.current() == B && g.validate(new Cell(0, 0)).isEmpty(), "restore puts the board, the counters and the turn back");
    }

    private static void ticTacToeBigBoard() {
        int[][] script = new int[9][];
        int k = 0;
        for (int r = 0; r < 5; r++) {
            script[k++] = new int[] {r, 3};          // Asha fills column 3
            if (r < 4) script[k++] = new int[] {r, 0};   // Ben fills column 0 but is one move short
        }
        TicTacToe g = play(5, script);
        check(g.status() == GameStatus.WON && g.winner() == A, "on a 5 by 5 board five in a column wins, with the counters, not a scan");
        TicTacToe big = new TicTacToe(50, A, B);
        for (int i = 0; i < 49; i++) {
            big.apply(new Cell(i, i));
            big.apply(new Cell(i, i + 1));
        }
        big.apply(new Cell(49, 49));
        check(big.status() == GameStatus.WON && big.winner() == A, "a 50 by 50 diagonal wins on the 50th mark");
    }

    private static void minimaxNeverLoses() {
        TicTacToe self = new TicTacToe(3, A, B);
        MinimaxBot<Cell> bot = new MinimaxBot<>();
        while (self.status() == GameStatus.IN_PROGRESS) self.apply(bot.choose(self));
        check(self.status() == GameStatus.DRAW, "two perfect players draw");

        int losses = 0;
        int wins = 0;
        for (int seed = 0; seed < 60; seed++) {
            for (int botSide = 0; botSide < 2; botSide++) {
                TicTacToe g = new TicTacToe(3, A, B);
                Player bots = botSide == 0 ? A : B;
                RandomBot<Cell> random = new RandomBot<>(seed);
                while (g.status() == GameStatus.IN_PROGRESS) g.apply(g.current().equals(bots) ? bot.choose(g) : random.choose(g));
                if (g.status() == GameStatus.WON) {
                    if (g.winner().equals(bots)) wins++;
                    else losses++;
                }
            }
        }
        check(losses == 0, "120 games against a random player, on both sides: minimax never loses");
        check(wins > 60, "and wins most of them");

        TicTacToe tactics = play(3, new int[][] {{0, 0}, {1, 0}, {0, 1}});
        check(bot.choose(tactics).equals(new Cell(0, 2)), "with two in a row against it, the bot blocks");
        TicTacToe win = play(3, new int[][] {{0, 0}, {1, 1}, {1, 0}, {2, 2}});
        check(bot.choose(win).equals(new Cell(2, 0)), "and with the chance to win, it wins");
    }

    private static void sessionRules() {
        GameSession<Cell> s = new GameSession<>(new TicTacToe(3, A, B));
        check(s.play(B, new Cell(0, 0)).code() == PlayCode.NOT_YOUR_TURN, "the second player cannot start");
        check(s.play(A, new Cell(1, 1)).ok(), "the first player can");
        check(s.play(B, new Cell(1, 1)).code() == PlayCode.ILLEGAL_MOVE, "an illegal move is refused with the reason");
        check(s.movesPlayed() == 1 && s.game().current() == B, "and does not use up the turn");
        check(s.play(C, new Cell(0, 0)).code() == PlayCode.NOT_YOUR_TURN, "a stranger cannot play");
        s.play(B, new Cell(0, 0));
        s.play(A, new Cell(0, 2));
        s.play(B, new Cell(0, 1));
        s.play(A, new Cell(2, 0));
        check(s.game().status() == GameStatus.WON && s.play(B, new Cell(2, 2)).code() == PlayCode.GAME_OVER, "nothing is accepted after the end");
    }

    private static void sessionListenersAndUndo() {
        GameSession<Cell> s = new GameSession<>(new TicTacToe(3, A, B));
        List<String> log = new ArrayList<>();
        s.subscribe(new GameListener<>() {
            @Override
            public void onMove(Player player, Cell move) { log.add(player.name() + move); }

            @Override
            public void onEnd(GameStatus status, Player winner) { log.add("END " + status); }
        });
        check(s.undo().code() == PlayCode.NOTHING_TO_UNDO, "nothing to undo at the start");
        s.play(A, new Cell(0, 0));
        s.play(B, new Cell(1, 1));
        s.play(A, new Cell(0, 1));
        s.play(B, new Cell(2, 2));
        s.play(A, new Cell(0, 2));
        check(log.equals(List.of("Asha(0,0)", "Ben(1,1)", "Asha(0,1)", "Ben(2,2)", "Asha(0,2)", "END WON")), "listeners saw every move and the end");
        s.undo();
        check(s.game().status() == GameStatus.IN_PROGRESS && s.game().current() == A && s.movesPlayed() == 4, "undoing the winning move reopens the game");
        s.undo();
        s.undo();
        check(s.moves().equals(List.of(new Cell(0, 0), new Cell(1, 1))) && s.game().current() == A, "undoing twice more leaves two moves and Asha to play");
        check(s.play(A, new Cell(2, 2)).ok(), "the freed cell can be played again");
    }

    private static void snakesAndLadders() {
        Map<Integer, Integer> jumps = Map.of(4, 14, 9, 27, 20, 29, 17, 7, 28, 12, 24, 8);
        SnakeAndLadder g = new SnakeAndLadder(30, jumps, List.of(A, B));
        g.apply(new Roll(4));
        check(g.positionOf(A) == 14 && g.current() == B, "landing on a ladder foot climbs to its top, and the turn passes");
        g.apply(new Roll(3));
        g.apply(new Roll(3));   // Asha 14 + 3 = 17, a snake down to 7
        check(g.positionOf(A) == 7, "landing on a snake head slides down to its tail");
        check(g.validate(new Roll(0)).isPresent() && g.validate(new Roll(7)).isPresent() && g.validate(new Roll(6)).isEmpty(), "a die shows 1 to 6");

        SnakeAndLadder six = new SnakeAndLadder(30, Map.of(), List.of(A, B));
        six.apply(new Roll(6));
        check(six.positionOf(A) == 6 && six.current() == A, "a six moves the piece and keeps the turn");
        SnakeAndLadder end = new SnakeAndLadder(30, Map.of(), List.of(A, B));
        for (int i = 0; i < 4; i++) {
            end.apply(new Roll(5));
            end.apply(new Roll(1));
        }
        end.apply(new Roll(5));   // A is at 25 after 5 rolls of 5
        end.apply(new Roll(2));
        end.apply(new Roll(6));   // overshoot: 25 + 6 = 31 stays at 25
        check(end.positionOf(A) == 25 && end.status() == GameStatus.IN_PROGRESS, "overshooting the last square stays put");
        end.apply(new Roll(5));
        check(end.status() == GameStatus.WON && end.winner() == A && end.positionOf(A) == 30, "landing exactly on the last square wins");

        boolean chained = false;
        try {
            new SnakeAndLadder(30, Map.of(4, 14, 14, 20), List.of(A, B));
        } catch (IllegalArgumentException e) {
            chained = true;
        }
        check(chained, "a ladder that ends on another jump is refused");
        boolean lonely = false;
        try {
            new SnakeAndLadder(30, Map.of(), List.of(A));
        } catch (IllegalArgumentException e) {
            lonely = true;
        }
        check(lonely, "one player is refused");
    }

    private static void sixesAndTurns() {
        SnakeAndLadder g = new SnakeAndLadder(100, Map.of(), List.of(A, B, C));
        g.apply(new Roll(2));
        g.apply(new Roll(3));
        g.apply(new Roll(4));
        check(g.current() == A, "three players take turns in order");
        g.apply(new Roll(6));
        g.apply(new Roll(6));
        g.apply(new Roll(6));
        check(g.positionOf(A) == 2 + 6 + 6 && g.current() == B, "after the third six the position did not change and Ben is next");

        GameSession<Roll> s = new GameSession<>(new SnakeAndLadder(30, Map.of(), List.of(A, B)));
        Dice dice = Dice.fixed(3, 5);
        s.play(A, new Roll(dice.roll()));
        s.play(B, new Roll(dice.roll()));
        s.undo();
        check(((SnakeAndLadder) s.game()).positionOf(B) == 0 && s.game().current() == B, "undo gives the roll back");
        Dice seeded = Dice.seeded(1);
        boolean inRange = true;
        for (int i = 0; i < 200; i++) {
            int v = seeded.roll();
            inRange &= v >= 1 && v <= 6;
        }
        check(inRange, "a seeded die stays between 1 and 6");
    }

    private static Board position(String... rows) { return Board.parse(rows); }

    private static int count(Piece p, Board b, int r, int c) { return p.pseudoMoves(b, r, c).size(); }

    private static void chessMovement() {
        Board empty = position("........", "........", "........", "...N....", "........", "........", "........", "........");
        check(count(empty.at(3, 3), empty, 3, 3) == 8, "a knight in the middle has 8 moves");
        Board rook = position("........", "........", "........", "...R....", "........", "........", "........", "........");
        check(count(rook.at(3, 3), rook, 3, 3) == 14, "a rook always has 14 moves on an empty board");
        Board bishop = position("........", "........", "........", "...B....", "........", "........", "........", "........");
        check(count(bishop.at(3, 3), bishop, 3, 3) == 13, "a bishop in the middle has 13");
        Board queen = position("........", "........", "........", "...Q....", "........", "........", "........", "........");
        check(count(queen.at(3, 3), queen, 3, 3) == 27, "a queen in the middle has 27");
        Board king = position("........", "........", "........", "...K....", "........", "........", "........", "........");
        check(count(king.at(3, 3), king, 3, 3) == 8, "a king has 8 moves");
        Board stops = position("........", "........", "........", "...R.pp.", "........", "........", "........", "...P....");
        List<int[]> rookMoves = stops.at(3, 3).pseudoMoves(stops, 3, 3);
        boolean capturesFirst = rookMoves.stream().anyMatch(m -> m[0] == 3 && m[1] == 5);
        boolean nothingBehind = rookMoves.stream().noneMatch(m -> m[0] == 3 && m[1] == 6);
        boolean ownBlocked = rookMoves.stream().noneMatch(m -> m[0] == 7 && m[1] == 3);
        check(capturesFirst && nothingBehind && ownBlocked, "a rook captures the first enemy, cannot jump over it, and does not capture its own side");
    }

    private static void chessPawns() {
        Board b = position("........", "p.......", "........", "........", "........", "........", "PP......", "........");
        Piece whiteStart = b.at(6, 0);
        check(whiteStart.pseudoMoves(b, 6, 0).size() == 2, "a pawn on its start row can go one or two squares");
        Board moved = position("........", "........", "........", "........", "........", "P.......", "........", "........");
        check(moved.at(5, 0).pseudoMoves(moved, 5, 0).size() == 1, "a pawn elsewhere goes one square");
        Board blockedPawn = position("........", "........", "........", "........", "p.......", "........", "P.......", "........");
        check(blockedPawn.at(6, 0).pseudoMoves(blockedPawn, 6, 0).size() == 1, "a pawn cannot jump over a piece in front of the two-square step");
        Board stuck = position("........", "........", "........", "........", "........", "p.......", "P.......", "........");
        check(stuck.at(6, 0).pseudoMoves(stuck, 6, 0).isEmpty(), "a pawn cannot capture straight ahead");
        Board capture = position("........", "........", "........", "........", "........", "pp......", ".P......", "........");
        List<int[]> moves = capture.at(6, 1).pseudoMoves(capture, 6, 1);
        check(moves.stream().anyMatch(m -> m[0] == 5 && m[1] == 0) && moves.stream().noneMatch(m -> m[0] == 5 && m[1] == 2), "a pawn captures diagonally, and only an enemy");
        check(capture.at(6, 1).attacks(capture, 6, 1).size() == 2, "it attacks both diagonals, which is not the same as where it can move");

        Board promote = position("....k...", "P.......", "........", "........", "........", "........", "........", "....K...");
        ChessGame g = new ChessGame(A, B, promote, Color.WHITE);
        g.apply(ChessMove.parse("a7a8"));
        check(g.pieceAt("a8") instanceof Queen, "a pawn reaching the last row becomes a queen by default");
        ChessGame g2 = new ChessGame(A, B, promote, Color.WHITE);
        g2.apply(ChessMove.parse("a7a8n"));
        check(g2.pieceAt("a8") instanceof Knight, "or the piece that was chosen");
    }

    private static void chessCheckRules() {
        Board pin = position("....k...", "........", "........", "........", "....r...", "........", "....B...", "....K...");
        ChessGame g = new ChessGame(A, B, pin, Color.WHITE);
        check(g.validate(ChessMove.parse("e2d3")).isPresent(), "a pinned bishop cannot leave the line to its king");
        check(g.validate(ChessMove.parse("e1d1")).isEmpty(), "but the king can step aside");
        check(g.validate(ChessMove.parse("e1e2")).isPresent(), "a piece of its own side blocks that square");

        Board attacked = position("....k...", "........", "........", "........", "........", "........", "r.......", "...K....");
        ChessGame h = new ChessGame(A, B, attacked, Color.WHITE);
        check(h.validate(ChessMove.parse("d1d2")).isPresent() && h.validate(ChessMove.parse("d1c2")).isPresent(), "a king cannot step onto an attacked square");
        check(h.validate(ChessMove.parse("d1e1")).isEmpty() && !h.inCheck(), "but can go elsewhere");

        Board inCheck = position("....k...", "........", "........", "........", "....r...", "........", "........", "...QK...");
        ChessGame c = new ChessGame(A, B, inCheck, Color.WHITE);
        check(c.inCheck(), "the king on e1 is in check from the rook on e5");
        List<ChessMove> answers = c.legalMoves();
        check(answers.stream().anyMatch(m -> m.toString().equals("d1e2")) && answers.stream().anyMatch(m -> m.toString().equals("e1f1")), "block with the queen or move the king");
        check(answers.stream().noneMatch(m -> m.toString().equals("d1d5")), "every other queen move would leave the king in check");
        check(c.validate(ChessMove.parse("e5e1")).isPresent(), "and a piece of the other side cannot be moved");
        check(c.validate(ChessMove.parse("a3a4")).isPresent(), "an empty square has no piece to move");
    }

    private static void chessEnds() {
        ChessGame fool = new ChessGame(A, B);
        for (String m : new String[] {"f2f3", "e7e5", "g2g4", "d8h4"}) fool.apply(ChessMove.parse(m));
        check(fool.status() == GameStatus.WON && fool.winner() == B && fool.inCheck(), "fool's mate: black wins in two moves");
        ChessGame scholar = new ChessGame(A, B);
        for (String m : new String[] {"e2e4", "e7e5", "f1c4", "b8c6", "d1h5", "g8f6", "h5f7"}) scholar.apply(ChessMove.parse(m));
        check(scholar.status() == GameStatus.WON && scholar.winner() == A, "scholar's mate: white wins");

        Board stale = position("k.......", "..Q.....", ".K......", "........", "........", "........", "........", "........");
        ChessGame s = new ChessGame(A, B, stale, Color.BLACK);
        check(s.status() == GameStatus.DRAW && !s.inCheck() && s.winner() == null, "no legal move and not in check is a stalemate, a draw");
        Board mate = position("k.......", ".Q......", ".K......", "........", "........", "........", "........", "........");
        ChessGame m2 = new ChessGame(A, B, mate, Color.BLACK);
        check(m2.status() == GameStatus.WON && m2.winner() == A, "no legal move and in check is checkmate");

        check(new ChessGame(A, B, position("k.......", "........", "........", "........", "........", "........", "........", "K......."), Color.WHITE).status() == GameStatus.DRAW, "king against king is a draw");
        check(new ChessGame(A, B, position("k.......", "........", "........", "........", "........", "........", "........", "K.....B."), Color.WHITE).status() == GameStatus.DRAW, "king and bishop against king is a draw");
        check(new ChessGame(A, B, position("k.......", "........", "........", "........", "........", "........", "........", "K.....R."), Color.WHITE).status() == GameStatus.IN_PROGRESS, "king and rook against king is not");

        ChessGame undo = new ChessGame(A, B);
        GameSession<ChessMove> session = new GameSession<>(undo);
        session.play(A, ChessMove.parse("e2e4"));
        session.play(B, ChessMove.parse("d7d5"));
        session.play(A, ChessMove.parse("e4d5"));
        check(undo.pieceAt("d5") instanceof Pawn && undo.pieceAt("d5").color == Color.WHITE, "a capture replaces the pawn");
        session.undo();
        check(undo.pieceAt("d5") instanceof Pawn && undo.pieceAt("d5").color == Color.BLACK && undo.pieceAt("e4") != null, "undoing a capture brings the captured pawn back");
    }

    private static void chessMoveText() {
        ChessMove m = ChessMove.parse("e2e4");
        check(m.fromRow() == 6 && m.fromCol() == 4 && m.toRow() == 4 && m.toCol() == 4 && m.toString().equals("e2e4"), "e2e4 is row 6 column 4 to row 4 column 4 and prints back the same");
        boolean bad = false;
        try {
            ChessMove.parse("e2");
        } catch (IllegalArgumentException e) {
            bad = true;
        }
        check(bad, "a move with fewer than four characters is refused");
        ChessGame g = new ChessGame(A, B);
        check(g.validate(ChessMove.parse("e7e5")).isPresent() && g.validate(ChessMove.parse("e3e4")).isPresent(), "black cannot move first, and an empty square has no piece");
        check(g.validate(ChessMove.parse("b1b3")).isPresent() && g.validate(ChessMove.parse("b1c3")).isEmpty(), "a knight moves like a knight");
        check(new GameSession<>(g).play(B, ChessMove.parse("e7e5")).code() == PlayCode.NOT_YOUR_TURN, "and the session knows whose turn it is");
    }

    // Perft counts the positions reachable in N moves. For the standard start the known counts are 20, 400 and 8902; they
    // are the same for a game without castling and en passant, which cannot happen in the first three moves. Matching them
    // is strong evidence that move generation and the check rule are right for every piece.
    private static long perft(ChessGame g, int depth) {
        if (depth == 0) return 1;
        long total = 0;
        for (ChessMove m : g.legalMoves()) {
            Object before = g.snapshot();
            g.apply(m);
            total += perft(g, depth - 1);
            g.restore(before);
        }
        return total;
    }

    private static void chessPerft() {
        ChessGame g = new ChessGame(A, B);
        check(perft(g, 1) == 20, "perft 1: 20 positions");
        check(perft(g, 2) == 400, "perft 2: 400 positions");
        check(perft(g, 3) == 8_902, "perft 3: 8902 positions, as in the published tables");
    }

    private static void sessionIsThreadSafe() throws InterruptedException {
        GameSession<Cell> s = new GameSession<>(new TicTacToe(50, A, B));
        AtomicInteger accepted = new AtomicInteger();
        Thread[] threads = new Thread[4];
        for (int t = 0; t < threads.length; t++) {
            threads[t] = new Thread(() -> {
                for (int i = 0; i < 50; i++) {
                    for (int j = 0; j < 50; j++) {
                        Player who = s.game().current();
                        if (s.play(who, new Cell(i, j)).ok()) accepted.incrementAndGet();
                    }
                }
            });
        }
        for (Thread th : threads) th.start();
        for (Thread th : threads) th.join();
        check(s.movesPlayed() == accepted.get(), "four threads playing the same game: every accepted move is counted once");
        Set<Cell> seen = new HashSet<>(s.moves());
        check(seen.size() == s.moves().size(), "and no cell was played twice");
    }
}
`,
      },
    ],
    expectedOutput: [
      "Ben plays first: NOT_YOUR_TURN",
      "Ben on a taken cell: (1,1) is taken; off the board: (3,0) is off the board",
      "Tic-tac-toe ended: WON, winner Asha",
      "OOX",
      ".X.",
      "X..",
      "A move after the end: GAME_OVER",
      "Undo: OK, moves left 4, status IN_PROGRESS",
      "Minimax against minimax: DRAW",
      "Snakes and ladders after 20 rolls: {Asha=29, Ben=30}, WON",
      "rnb.kbnr",
      "pppp.ppp",
      "........",
      "....p...",
      "......Pq",
      ".....P..",
      "PPPPP..P",
      "RNBQKBNR",
      "Fool's mate: WON, winner Ben, check true",
      "White legal moves at the start: 20",
      "Illegal: P cannot move like that",
    ],
  },
};
