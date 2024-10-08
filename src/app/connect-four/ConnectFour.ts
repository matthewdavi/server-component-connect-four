import { z } from "zod";

const ColorSchema = z.enum(["red", "yellow"]);
export type Color = z.infer<typeof ColorSchema>;

const CellSchema = ColorSchema.nullable();
export type Cell = z.infer<typeof CellSchema>;

const BoardSchema = z.array(z.array(CellSchema));
export type Board = z.infer<typeof BoardSchema>;

const CoordinateSchema = z.number().int().min(0).max(6);
type Coordinate = z.infer<typeof CoordinateSchema>;

const QualitySchema = z.enum(["bad", "medium", "best"]);
type Quality = z.infer<typeof QualitySchema>;

export const GameStateSchema = z.object({
  board: BoardSchema,
  currentPlayer: ColorSchema,
  winner: ColorSchema.nullable(),
  isGameOver: z.boolean(),
});

export type GameState = z.infer<typeof GameStateSchema>;

export class ConnectFour {
  static readonly NUM_COLUMNS = 7;
  static readonly NUM_ROWS = 6;

  /**
   * Creates an empty game board.
   */
  static createBoard(): Board {
    const board = Array.from({ length: ConnectFour.NUM_COLUMNS }, () =>
      Array.from({ length: ConnectFour.NUM_ROWS }, () => null),
    );
    return BoardSchema.parse(board);
  }

  /**
   * Creates an initial game state.
   */
  static createInitialState(): GameState {
    return GameStateSchema.parse({
      board: ConnectFour.createBoard(),
      currentPlayer: "red",
      winner: null,
      isGameOver: false,
    });
  }

  /**
   * Places a piece on the board at the given column for the specified color.
   * Returns a new game state with the piece placed.
   */
  static placePiece(state: GameState, coordinate: Coordinate): GameState {
    CoordinateSchema.parse(coordinate);
    const newBoard = state.board.map((column) => [...column]);

    for (let row = ConnectFour.NUM_ROWS - 1; row >= 0; row--) {
      if (newBoard[coordinate]![row] === null) {
        newBoard[coordinate]![row] = state.currentPlayer;
        const winner = ConnectFour.checkWinner(newBoard)
          ? state.currentPlayer
          : null;
        const isGameOver = !!winner || ConnectFour.isBoardFull(newBoard);

        return GameStateSchema.parse({
          board: newBoard,
          currentPlayer: state.currentPlayer === "red" ? "yellow" : "red",
          winner,
          isGameOver,
        });
      }
    }

    // If the column is full, return the state unchanged
    return state;
  }

  /**
   * Checks if there's a winner on the board.
   */
  static checkWinner(board: Board): boolean {
    BoardSchema.parse(board);
    const directions = [
      { dc: 1, dr: 0 }, // Horizontal
      { dc: 0, dr: 1 }, // Vertical
      { dc: 1, dr: 1 }, // Diagonal down-right
      { dc: 1, dr: -1 }, // Diagonal up-right
    ];

    for (let c = 0; c < ConnectFour.NUM_COLUMNS; c++) {
      for (let r = 0; r < ConnectFour.NUM_ROWS; r++) {
        const color = board[c]?.[r];
        if (color === null) continue;

        for (const { dc, dr } of directions) {
          let count = 1;
          let cc = c + dc;
          let rr = r + dr;
          while (
            cc >= 0 &&
            cc < ConnectFour.NUM_COLUMNS &&
            rr >= 0 &&
            rr < ConnectFour.NUM_ROWS &&
            board[cc]?.[rr] === color
          ) {
            count++;
            if (count === 4) {
              return true;
            }
            cc += dc;
            rr += dr;
          }
        }
      }
    }
    return false;
  }

  /**
   * Gets the computer's move based on the specified quality.
   */
  static getComputerMove(state: GameState, quality: Quality): Coordinate {
    QualitySchema.parse(quality);
    const validColumns = ConnectFour.getValidColumns(state.board);

    if (quality === "bad") {
      return ConnectFour.getRandomColumn(validColumns);
    }

    if (quality === "medium") {
      // Try to win in the next move
      for (const col of validColumns) {
        const tempBoard = ConnectFour.placePiece(
          { ...state, board: state.board },
          col,
        ).board;
        if (ConnectFour.checkWinner(tempBoard)) {
          return col;
        }
      }

      // Block opponent's winning move
      const opponentColor = state.currentPlayer === "red" ? "yellow" : "red";
      for (const col of validColumns) {
        const tempBoard = ConnectFour.placePiece(
          { ...state, currentPlayer: opponentColor, board: state.board },
          col,
        ).board;
        if (ConnectFour.checkWinner(tempBoard)) {
          return col; // Block this move
        }
      }

      // Else, pick a random column
      return ConnectFour.getRandomColumn(validColumns);
    }
    if (quality === "best") {
      return ConnectFour.getBestMove(state);
    }

    // Default to a random move if quality is unrecognized
    return ConnectFour.getRandomColumn(validColumns);
  }

  /**
   * Helper method to get a list of valid columns where a piece can be placed.
   * @param board - The current game board.
   */
  private static getValidColumns(board: Board): Coordinate[] {
    const validColumns: Coordinate[] = [];
    for (let c = 0; c < ConnectFour.NUM_COLUMNS; c++) {
      if (board[c]?.[0] === null) {
        validColumns.push(c);
      }
    }
    return validColumns;
  }

  /**
   * Helper method to get a random column from the list of valid columns.
   * @param validColumns - An array of valid column indices.
   */
  private static getRandomColumn(validColumns: Coordinate[]): Coordinate {
    if (validColumns.length === 0) {
      throw new Error("No valid columns available");
    }
    return validColumns[Math.floor(Math.random() * validColumns.length)]!;
  }

  /**
   * Uses the minimax algorithm to determine the best move for the computer.
   * @param board - The current game board.
   * @param color - The computer's color.
   */
  private static getBestMove(state: GameState): Coordinate {
    const opponentColor = state.currentPlayer === "red" ? "yellow" : "red";
    const validColumns = ConnectFour.getValidColumns(state.board);

    let bestScore = -Infinity;
    let bestColumn = validColumns[0];

    for (const col of validColumns) {
      const newState = ConnectFour.placePiece(state, col);
      const score = ConnectFour.minimax(
        newState,
        4,
        false,
        state.currentPlayer,
        opponentColor,
      );
      if (score > bestScore) {
        bestScore = score;
        bestColumn = col;
      }
    }

    return bestColumn!;
  }

  /**
   * Minimax algorithm with depth limiting.
   * @param board - The current game board.
   * @param depth - The depth limit for recursion.
   * @param isMaximizing - True if maximizing player, false otherwise.
   * @param playerColor - The computer's color.
   * @param opponentColor - The opponent's color.
   */
  private static minimax(
    state: GameState,
    depth: number,
    isMaximizing: boolean,
    playerColor: Color,
    opponentColor: Color,
  ): number {
    if (depth === 0 || state.isGameOver) {
      return ConnectFour.evaluateBoard(state.board, playerColor);
    }

    const validColumns = ConnectFour.getValidColumns(state.board);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const col of validColumns) {
        const newState = ConnectFour.placePiece(state, col);
        const evaluation = ConnectFour.minimax(
          newState,
          depth - 1,
          false,
          playerColor,
          opponentColor,
        );
        maxEval = Math.max(maxEval, evaluation);
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const col of validColumns) {
        const newState = ConnectFour.placePiece(state, col);
        const evaluation = ConnectFour.minimax(
          newState,
          depth - 1,
          true,
          playerColor,
          opponentColor,
        );
        minEval = Math.min(minEval, evaluation);
      }
      return minEval;
    }
  }

  /**
   * Evaluates the board and returns a score.
   * @param board - The current game board.
   * @param color - The computer's color.
   */
  private static evaluateBoard(board: Board, color: Color): number {
    // Simple evaluation: +1000 for win, -1000 for loss, 0 otherwise
    if (ConnectFour.checkWinner(board)) {
      return color === "red" ? 1000 : -1000;
    }
    return 0;
  }

  static isBoardFull(board: Board): boolean {
    BoardSchema.parse(board);
    return board.every((column) => column.every((cell) => cell !== null));
  }
}
