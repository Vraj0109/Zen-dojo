#include <vector>
#include <string>

class Solution {
public:
    int gridPaths(std::vector<std::string>& grid) {
        int n = grid.size();
        if (n == 0 || grid[0][0] == '*' || grid[n - 1][n - 1] == '*') return 0;
        const int MOD = 1e9 + 7;
        std::vector<int> dp(n, 0);
        dp[0] = 1;
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < n; c++) {
                if (grid[r][c] == '*') {
                    dp[c] = 0;
                } else if (c > 0) {
                    dp[c] = (dp[c] + dp[c - 1]) % MOD;
                }
            }
        }
        return dp[n - 1];
    }
};
