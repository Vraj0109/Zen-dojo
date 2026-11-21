#include <vector>
#include <climits>
#include <algorithm>

using namespace std;

class Solution {
    int memo[50][50][50];

    int dp(int r1, int c1, int r2, int n, const vector<vector<int>>& grid) {
        int c2 = r1 + c1 - r2;
        if (r1 >= n || c1 >= n || r2 >= n || c2 >= n || grid[r1][c1] == -1 || grid[r2][c2] == -1) {
            return -1e9;
        }
        if (r1 == n - 1 && c1 == n - 1) {
            return grid[r1][c1];
        }
        if (memo[r1][c1][r2] != -1) {
            return memo[r1][c1][r2];
        }

        int cherries = grid[r1][c1];
        if (r1 != r2) {
            cherries += grid[r2][c2];
        }

        int next_max = max({
            dp(r1 + 1, c1, r2 + 1, n, grid), // down, down
            dp(r1 + 1, c1, r2, n, grid),     // down, right
            dp(r1, c1 + 1, r2 + 1, n, grid), // right, down
            dp(r1, c1 + 1, r2, n, grid)      // right, right
        });

        cherries += next_max;
        return memo[r1][c1][r2] = cherries;
    }

public:
    int cherryPickup(vector<vector<int>>& grid) {
        int n = (int)grid.size();
        for (int i = 0; i < n; ++i) {
            for (int j = 0; j < n; ++j) {
                for (int k = 0; k < n; ++k) {
                    memo[i][j][k] = -1;
                }
            }
        }
        int res = dp(0, 0, 0, n, grid);
        return max(0, res);
    }
};
