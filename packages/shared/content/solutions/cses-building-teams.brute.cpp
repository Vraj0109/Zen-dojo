#include <vector>

class Solution {
public:
    bool buildingTeams(int n, std::vector<std::vector<int>>& friendships) {
        std::vector<std::vector<int>> adj(n + 1);
        for (const auto& f : friendships) {
            adj[f[0]].push_back(f[1]);
            adj[f[1]].push_back(f[0]);
        }
        std::vector<int> color(n + 1, 0);
        std::vector<int> q;
        for (int i = 1; i <= n; i++) {
            if (color[i] != 0) continue;
            color[i] = 1;
            q.clear();
            q.push_back(i);
            size_t head = 0;
            while (head < q.size()) {
                int u = q[head++];
                for (int v : adj[u]) {
                    if (color[v] == 0) {
                        color[v] = 3 - color[u];
                        q.push_back(v);
                    } else if (color[v] == color[u]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
};
