#include <vector>
#include <string>

class Solution {
public:
    int labyrinth(std::vector<std::string>& grid) {
        int n = grid.size(), m = grid[0].size();
        int sr = -1, sc = -1, tr = -1, tc = -1;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                if (grid[i][j] == 'A') { sr = i; sc = j; }
                else if (grid[i][j] == 'B') { tr = i; tc = j; }
            }
        }
        if (sr == -1 || tr == -1) return -1;
        std::vector<int> dist(n * m, -1);
        dist[sr * m + sc] = 0;
        std::vector<int> q;
        q.reserve(n * m);
        q.push_back(sr * m + sc);
        size_t head = 0;
        int dr[4] = {-1, 1, 0, 0};
        int dc[4] = {0, 0, -1, 1};
        while (head < q.size()) {
            int u = q[head++];
            int r = u / m, c = u % m;
            if (r == tr && c == tc) return dist[u];
            for (int k = 0; k < 4; k++) {
                int nr = r + dr[k], nc = c + dc[k];
                if (nr >= 0 && nr < n && nc >= 0 && nc < m && grid[nr][nc] != '#') {
                    int v = nr * m + nc;
                    if (dist[v] == -1) {
                        dist[v] = dist[u] + 1;
                        q.push_back(v);
                    }
                }
            }
        }
        return -1;
    }
};
