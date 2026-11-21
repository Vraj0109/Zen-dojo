#include <vector>
#include <queue>

using namespace std;

class Solution {
    bool canReachPacific(const vector<vector<int>>& h, int sr, int sc, int r, int c) {
        vector<vector<bool>> vis(r, vector<bool>(c, false));
        queue<pair<int, int>> q;
        q.push({sr, sc});
        vis[sr][sc] = true;
        int dx[4] = {1, -1, 0, 0}, dy[4] = {0, 0, 1, -1};
        while (!q.empty()) {
            auto [x, y] = q.front(); q.pop();
            if (x == 0 || y == 0) return true;
            for (int d = 0; d < 4; d++) {
                int nx = x + dx[d], ny = y + dy[d];
                if (nx >= 0 && nx < r && ny >= 0 && ny < c && !vis[nx][ny] && h[nx][ny] <= h[x][y]) {
                    vis[nx][ny] = true;
                    q.push({nx, ny});
                }
            }
        }
        return false;
    }

    bool canReachAtlantic(const vector<vector<int>>& h, int sr, int sc, int r, int c) {
        vector<vector<bool>> vis(r, vector<bool>(c, false));
        queue<pair<int, int>> q;
        q.push({sr, sc});
        vis[sr][sc] = true;
        int dx[4] = {1, -1, 0, 0}, dy[4] = {0, 0, 1, -1};
        while (!q.empty()) {
            auto [x, y] = q.front(); q.pop();
            if (x == r - 1 || y == c - 1) return true;
            for (int d = 0; d < 4; d++) {
                int nx = x + dx[d], ny = y + dy[d];
                if (nx >= 0 && nx < r && ny >= 0 && ny < c && !vis[nx][ny] && h[nx][ny] <= h[x][y]) {
                    vis[nx][ny] = true;
                    q.push({nx, ny});
                }
            }
        }
        return false;
    }
public:
    vector<vector<int>> pacificAtlantic(vector<vector<int>>& heights) {
        int r = heights.size(), c = heights[0].size();
        vector<vector<int>> out;
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) {
                if (canReachPacific(heights, i, j, r, c) && canReachAtlantic(heights, i, j, r, c)) {
                    out.push_back({i, j});
                }
            }
        }
        return out;
    }
};
