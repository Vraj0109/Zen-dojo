#include <vector>
#include <string>

class Solution {
    int count = 0;
    bool col[8] = {false}, diag1[16] = {false}, diag2[16] = {false};

    void solve(int row, const std::vector<std::string>& board) {
        if (row == 8) {
            count++;
            return;
        }
        for (int c = 0; c < 8; c++) {
            if (board[row][c] == '*') continue;
            if (col[c] || diag1[row + c] || diag2[row - c + 7]) continue;
            col[c] = diag1[row + c] = diag2[row - c + 7] = true;
            solve(row + 1, board);
            col[c] = diag1[row + c] = diag2[row - c + 7] = false;
        }
    }

public:
    int chessboardAndQueens(std::vector<std::string>& board) {
        count = 0;
        solve(0, board);
        return count;
    }
};
