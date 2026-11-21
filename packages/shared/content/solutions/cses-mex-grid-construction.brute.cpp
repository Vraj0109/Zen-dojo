#include <vector>

class Solution {
public:
    std::vector<std::vector<int>> mexGrid(int n) {
        std::vector<std::vector<int>> grid(n, std::vector<int>(n, 0));
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                std::vector<bool> used(2 * n + 5, false);
                for (int c = 0; c < j; c++) {
                    used[grid[i][c]] = true;
                }
                for (int r = 0; r < i; r++) {
                    used[grid[r][j]] = true;
                }
                int mex = 0;
                while (used[mex]) mex++;
                grid[i][j] = mex;
            }
        }
        return grid;
    }
};
