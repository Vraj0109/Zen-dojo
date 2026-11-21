#include <bits/stdc++.h>
using namespace std;

class Solution {
    int dr[4] = {1, -1, 0, 0};
    int dc[4] = {0, 0, 1, -1};

    void bfs(int r, int c, int m, int n, vector<vector<int>>& grid, vector<vector<bool>>& visited) {
        visited[r][c] = true;
        queue<pair<int, int>> q;
        q.push({r, c});
        while (!q.empty()) {
            auto [cr, cc] = q.front();
            q.pop();
            for (int i = 0; i < 4; i++) {
                int nr = cr + dr[i];
                int nc = cc + dc[i];
                if (nr >= 0 && nr < m && nc >= 0 && nc < n && grid[nr][nc] == 1 && !visited[nr][nc]) {
                    visited[nr][nc] = true;
                    q.push({nr, nc});
                }
            }
        }
    }

public:
    vector<int> numIslands2(int m, int n, vector<vector<int>>& positions) {
        vector<vector<int>> grid(m, vector<int>(n, 0));
        vector<int> res;

        for (const auto& pos : positions) {
            int r = pos[0], c = pos[1];
            grid[r][c] = 1;

            vector<vector<bool>> visited(m, vector<bool>(n, false));
            int islands = 0;
            for (int i = 0; i < m; i++) {
                for (int j = 0; j < n; j++) {
                    if (grid[i][j] == 1 && !visited[i][j]) {
                        islands++;
                        bfs(i, j, m, n, grid, visited);
                    }
                }
            }
            res.push_back(islands);
        }
        return res;
    }
};
