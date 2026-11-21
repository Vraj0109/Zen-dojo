#include <vector>

using namespace std;

class Solution {
public:
    int orangesRotting(vector<vector<int>>& grid) {
        int r = grid.size(), c = grid[0].size();
        int minutes = 0;
        int dx[4] = {1, -1, 0, 0};
        int dy[4] = {0, 0, 1, -1};
        while (true) {
            bool rottedAny = false;
            vector<vector<int>> nextGrid = grid;
            for (int i = 0; i < r; i++) {
                for (int j = 0; j < c; j++) {
                    if (grid[i][j] == 1) {
                        bool touchesRotten = false;
                        for (int d = 0; d < 4; d++) {
                            int ni = i + dx[d], nj = j + dy[d];
                            if (ni >= 0 && ni < r && nj >= 0 && nj < c && grid[ni][nj] == 2) {
                                touchesRotten = true;
                                break;
                            }
                        }
                        if (touchesRotten) {
                            nextGrid[i][j] = 2;
                            rottedAny = true;
                        }
                    }
                }
            }
            if (!rottedAny) break;
            grid = nextGrid;
            minutes++;
        }
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) {
                if (grid[i][j] == 1) return -1;
            }
        }
        return minutes;
    }
};
