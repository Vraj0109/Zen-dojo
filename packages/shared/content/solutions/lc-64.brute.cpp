#include <vector>
#include <algorithm>

class Solution {
    int dfs(const std::vector<std::vector<int>>& grid, int r, int c, int m, int n) {
        if (r == m - 1 && c == n - 1) return grid[r][c];
        if (r >= m || c >= n) return 1e9;
        return grid[r][c] + std::min(dfs(grid, r + 1, c, m, n), dfs(grid, r, c + 1, m, n));
    }
public:
    int minPathSum(std::vector<std::vector<int>>& grid) {
        return dfs(grid, 0, 0, grid.size(), grid[0].size());
    }
};
