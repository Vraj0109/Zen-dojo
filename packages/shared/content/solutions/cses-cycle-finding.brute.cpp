#include <vector>

class Solution {
public:
    bool cycleFinding(int n, std::vector<std::vector<int>>& edges) {
        std::vector<long long> dist(n + 1, 0);
        bool any = false;
        for (int iter = 1; iter <= n; iter++) {
            any = false;
            for (const auto& e : edges) {
                int u = e[0], v = e[1];
                long long w = e[2];
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    any = true;
                }
            }
            if (!any) break;
        }
        return any;
    }
};
