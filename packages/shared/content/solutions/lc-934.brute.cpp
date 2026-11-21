#include <bits/stdc++.h>
using namespace std;

class Solution {
    int n;
    int dr[4] = {1, -1, 0, 0};
    int dc[4] = {0, 0, 1, -1};

    void dfs(vector<vector<int>>& g, int r, int c, vector<pair<int, int>>& island) {
        if (r < 0 || r >= n || c < 0 || c >= n || g[r][c] != 1) return;
        g[r][c] = 2;
        island.push_back({r, c});
        for (int i = 0; i < 4; i++) {
            dfs(g, r + dr[i], c + dc[i], island);
        }
    }

public:
    int shortestBridge(vector<vector<int>>& grid) {
        n = grid.size();
        vector<pair<int, int>> island1, island2;
        bool foundFirst = false;

        for (int r = 0; r < n; r++) {
            for (int c = 0; c < n; c++) {
                if (grid[r][c] == 1) {
                    if (!foundFirst) {
                        dfs(grid, r, c, island1);
                        foundFirst = true;
                    } else {
                        dfs(grid, r, c, island2);
                    }
                }
            }
        }

        // Pairwise Manhattan distance minus 1
        int ans = INT_MAX;
        for (auto& p1 : island1) {
            for (auto& p2 : island2) {
                ans = min(ans, abs(p1.first - p2.first) + abs(p1.second - p2.second) - 1);
            }
        }
        return ans;
    }
};
