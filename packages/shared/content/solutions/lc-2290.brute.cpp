#include <vector>
#include <queue>
#include <climits>

using namespace std;

class Solution {
public:
    int minimumObstacles(vector<vector<int>>& grid) {
        int m = (int)grid.size();
        int n = (int)grid[0].size();
        vector<vector<int>> dist(m, vector<int>(n, INT_MAX));
        priority_queue<tuple<int, int, int>, vector<tuple<int, int, int>>, greater<>> pq;

        dist[0][0] = 0;
        pq.push({0, 0, 0});

        int dr[4] = {0, 0, 1, -1};
        int dc[4] = {1, -1, 0, 0};

        while (!pq.empty()) {
            auto [d, r, c] = pq.top();
            pq.pop();

            if (d > dist[r][c]) continue;
            if (r == m - 1 && c == n - 1) return d;

            for (int i = 0; i < 4; ++i) {
                int nr = r + dr[i];
                int nc = c + dc[i];
                if (nr >= 0 && nr < m && nc >= 0 && nc < n) {
                    int nd = d + grid[nr][nc];
                    if (nd < dist[nr][nc]) {
                        dist[nr][nc] = nd;
                        pq.push({nd, nr, nc});
                    }
                }
            }
        }
        return dist[m - 1][n - 1];
    }
};
