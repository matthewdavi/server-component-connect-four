import {
  ConnectFour,
  type GameState,
  type Color,
  GameStateSchema,
} from "./ConnectFour";
import Link from "next/link";
import JSONCrush from "jsoncrush";
import { z } from "zod";

const ExtendedGameStateSchema = GameStateSchema.extend({
  newestPieceColumn: z.number().nullable(),
  newestComputerPieceColumn: z.number().nullable(),
});

type ExtendedGameState = z.infer<typeof ExtendedGameStateSchema>;

export default function ConnectFourGame({
  searchParams,
}: {
  searchParams: { state?: string };
}) {
  const initialState: ExtendedGameState = {
    ...ConnectFour.createInitialState(),
    newestPieceColumn: null,
    newestComputerPieceColumn: null,
  };

  let gameState: ExtendedGameState;

  try {
    if (searchParams.state) {
      const parsedState = JSON.parse(
        JSONCrush.uncrush(searchParams.state),
      ) as unknown;
      gameState = ExtendedGameStateSchema.parse(parsedState);
    } else {
      gameState = initialState;
    }
  } catch (error) {
    console.error("Invalid game state:", error);
    gameState = initialState;
  }

  const {
    board,
    currentPlayer,
    isGameOver,
    winner,
    newestPieceColumn,
    newestComputerPieceColumn,
  } = gameState;

  function getNextState(column: number): ExtendedGameState {
    if (isGameOver) return gameState;

    // Player's move (red)
    const playerState: GameState = ConnectFour.placePiece(gameState, column);
    const playerExtendedState: ExtendedGameState = {
      ...playerState,
      newestPieceColumn: column,
      newestComputerPieceColumn: gameState.newestComputerPieceColumn,
    };

    // Computer's move (yellow)
    if (!playerState.isGameOver && playerState.currentPlayer === "yellow") {
      const computerMove = ConnectFour.getComputerMove(playerState, "best");
      const computerState: GameState = ConnectFour.placePiece(
        playerState,
        computerMove,
      );
      return {
        ...computerState,
        newestPieceColumn: column,
        newestComputerPieceColumn: computerMove,
      };
    }

    return playerExtendedState;
  }

  function renderCell(cell: Color | null, rowIndex: number, colIndex: number) {
    const cellColor =
      cell === "red"
        ? "bg-red-500"
        : cell === "yellow"
          ? "bg-yellow-500"
          : "bg-white";

    let animationClass = "";
    if (newestPieceColumn != null) {
      const pieceRow = board[newestPieceColumn]?.findIndex(
        (cell) => cell !== null,
      );
      if (pieceRow) {
        const isNewColumn = colIndex === newestPieceColumn;
        const isNewPiece = isNewColumn && rowIndex === 5 - pieceRow;
        if (isNewPiece) {
          animationClass = "animate-slide-down";
        }
      }
    }

    if (newestComputerPieceColumn != null) {
      const computerPieceRow = board[newestComputerPieceColumn]?.findIndex(
        (cell) => cell !== null,
      );
      if (computerPieceRow != null) {
        const isNewComputerColumn = colIndex === newestComputerPieceColumn;
        const isNewComputerPiece =
          isNewComputerColumn && rowIndex === 5 - computerPieceRow;
        if (isNewComputerPiece) {
          animationClass = "animate-computer-slide-down";
        }
      }
    }

    const cellContent = (
      <div
        className={`absolute inset-0 rounded-full border-2 border-gray-300 ${cellColor} ${animationClass}`}
      ></div>
    );

    if (cell === null && !isGameOver) {
      const nextState = getNextState(colIndex);
      const compressedState = JSONCrush.crush(JSON.stringify(nextState));
      return (
        <Link href={`/connect-four?state=${compressedState}`}>
          <div className="relative h-12 w-12 cursor-pointer rounded-full">
            <div className="absolute inset-0 rounded-full bg-white"></div>
            {cellContent}
          </div>
        </Link>
      );
    }

    return (
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full bg-white"></div>
        {cellContent}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <h1 className="mb-8 text-4xl font-bold">Connect Four</h1>
      <div className="rounded-lg bg-blue-500 p-4">
        <div className="grid grid-cols-7 gap-1">
          {board.map((column, colIndex) => (
            <div key={colIndex} className="flex flex-col hover:opacity-50">
              {column.map((cell, rowIndex) => (
                <div key={`${colIndex}-${rowIndex}`}>
                  {renderCell(cell, 5 - rowIndex, colIndex)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {isGameOver && (
        <div className="mt-4 text-xl font-semibold">
          {winner ? `${winner.toUpperCase()} wins!` : "It's a draw!"}
        </div>
      )}
      {!isGameOver && (
        <div className="mt-4 text-xl font-semibold">
          Current player: {currentPlayer.toUpperCase()}
        </div>
      )}
      <Link href="/connect-four">
        <button className="mt-8 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
          New Game
        </button>
      </Link>
    </div>
  );
}

export const runtime = "edge";
