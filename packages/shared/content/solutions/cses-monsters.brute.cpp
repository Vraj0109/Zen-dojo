#include <vector>
#include <string>

class Solution {
public:
    int monsters(std::vector<std::string>& grid) {
        int n = grid.size(), m = grid[0].size();
        const int INF = 1e9;
        std::vector<int> m_dist(n * m, INF);
        std::vector<int> p_dist(n * m, INF);
        std::vector<int> q;
        q.reserve(n * m);
        int pr = -1, pc = -1;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                if (grid[i][j] == 'M') {
                    m_dist[i * m + j] = 0;
                    q.push_back(i * m + j);
                } else if (grid[i][j] == 'A') {
                    pr = i; pc = j;
                }
            }
        }
        size_t head = 0;
        int dr[4] = {-1, 1, 0, 0};
        int dc[4] = {0, 0, -1, 1};
        while (head < q.size()) {
            int u = q[head++];
            int r = u / m, c = u % m;
            for (int k = 0; k < 4; k++) {
                int nr = r + dr[k], nc = c + dc[k];
                if (nr >= 0 && nr < n && nc >= 0 && nc < m && grid[nr][nc] != '#') {
                    int v = nr * m + nc;
                    if (m_dist[v] == INF) {
                        m_dist[v] = m_dist[u] + 1;
                        q.push_back(v);
                    }
                }
            }
        }
        if (pr == -1) return -1;
        q.clear();
        p_dist[pr * m + pc] = 0;
        q.push_back(pr * m + pc);
        head = 0;
        while (head < q.size()) {
            int u = q[head++];
            int r = u / m, c = u % m;
            if (r == 0 || r == n - 1 || c == 0 || c == m - 1) {
                return p_dist[u];
            }
            for (int k = 0; k < 4; k++) {
                int nr = r + dr[k], nc = c + dc[k];
                if (nr >= 0 && nr < n && nc >= 0 && nc < m && grid[nr][nc] != '#') {
                    int v = nr * m + nc;
                    if (p_dist[v] == INF && p_dist[u] + 1 < m_dist[v]) {
                        p_dist[v] = p_dist[u] + 1;
                        q.push_back(v);
                    }
                }
            }
        }
        return -1;
    }
};
