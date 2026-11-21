#include <bits/stdc++.h>
using namespace std;

class Solution {
    int m, n;
    int dr[4] = {1, -1, 0, 0};
    int dc[4] = {0, 0, 1, -1};

    int dfs(const vector<vector<int>>& mat, int r, int c) {
        int best = 1;
        for (int i = 0; i < 4; i++) {
            int nr = r + dr[i], nc = c + dc[i];
            if (nr >= 0 && nr < m && nc >= 0 && nc < n && mat[nr][nc] > mat[r][c]) {
                best = max(best, 1 + dfs(mat, nr, nc));
            }
        }
        return best;
    }
public:
    int longestIncreasingPath(vector<vector<int>>& matrix) {
        if (matrix.empty() || matrix[0].empty()) return 0;
        m = matrix.size();
        n = matrix[0].size();
        int ans = 0;
        for (int r = 0; r < m; r++) {
            for (int c = 0; c < n; c++) {
                ans = max(ans, dfs(matrix, r, c));
            }
        }
        return ans;
    }
};
