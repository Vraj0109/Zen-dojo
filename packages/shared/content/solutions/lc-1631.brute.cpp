#include <vector>
#include <climits>
#include <algorithm>
#include <cmath>

using namespace std;

class Solution {
    int min_effort;

    void dfs(int r, int c, int current_max, const vector<vector<int>>& h, vector<vector<bool>>& visited) {
        int rows = (int)h.size();
        int cols = (int)h[0].size();
        if (r == rows - 1 && c == cols - 1) {
            min_effort = min(min_effort, current_max);
            return;
        }
        if (current_max >= min_effort) return;

        visited[r][c] = true;
        int dr[4] = {0, 0, 1, -1};
        int dc[4] = {1, -1, 0, 0};
        for (int i = 0; i < 4; ++i) {
            int nr = r + dr[i];
            int nc = c + dc[i];
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
                int diff = abs(h[nr][nc] - h[r][c]);
                dfs(nr, nc, max(current_max, diff), h, visited);
            }
        }
        visited[r][c] = false;
    }

public:
    int minimumEffortPath(vector<vector<int>>& heights) {
        min_effort = INT_MAX;
        int rows = (int)heights.size();
        int cols = (int)heights[0].size();
        vector<vector<bool>> visited(rows, vector<bool>(cols, false));
        dfs(0, 0, 0, heights, visited);
        return min_effort;
    }
};
