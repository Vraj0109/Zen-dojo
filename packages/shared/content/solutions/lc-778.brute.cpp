#include <vector>
#include <climits>
#include <algorithm>

using namespace std;

class Solution {
    int min_time;

    void dfs(int r, int c, int current_max, const vector<vector<int>>& grid, vector<vector<bool>>& visited) {
        int n = (int)grid.size();
        if (r == n - 1 && c == n - 1) {
            min_time = min(min_time, current_max);
            return;
        }
        if (current_max >= min_time) return;

        visited[r][c] = true;
        int dr[4] = {0, 0, 1, -1};
        int dc[4] = {1, -1, 0, 0};
        for (int i = 0; i < 4; ++i) {
            int nr = r + dr[i];
            int nc = c + dc[i];
            if (nr >= 0 && nr < n && nc >= 0 && nc < n && !visited[nr][nc]) {
                dfs(nr, nc, max(current_max, grid[nr][nc]), grid, visited);
            }
        }
        visited[r][c] = false;
    }

public:
    int swimInWater(vector<vector<int>>& grid) {
        min_time = INT_MAX;
        int n = (int)grid.size();
        vector<vector<bool>> visited(n, vector<bool>(n, false));
        dfs(0, 0, grid[0][0], grid, visited);
        return min_time;
    }
};
