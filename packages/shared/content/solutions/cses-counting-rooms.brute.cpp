#include <vector>
#include <string>

class Solution {
public:
    int countingRooms(std::vector<std::string>& grid) {
        if (grid.empty() || grid[0].empty()) return 0;
        int n = grid.size(), m = grid[0].size();
        int rooms = 0;
        int dr[4] = {-1, 1, 0, 0};
        int dc[4] = {0, 0, -1, 1};
        std::vector<std::pair<int, int>> q;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                if (grid[i][j] == '.') {
                    rooms++;
                    grid[i][j] = '#';
                    q.push_back({i, j});
                    size_t head = 0;
                    while (head < q.size()) {
                        auto [r, c] = q[head++];
                        for (int k = 0; k < 4; k++) {
                            int nr = r + dr[k], nc = c + dc[k];
                            if (nr >= 0 && nr < n && nc >= 0 && nc < m && grid[nr][nc] == '.') {
                                grid[nr][nc] = '#';
                                q.push_back({nr, nc});
                            }
                        }
                    }
                    q.clear();
                }
            }
        }
        return rooms;
    }
};
