#include <vector>

class Solution {
public:
    bool courseSchedule(int n, std::vector<std::vector<int>>& requirements) {
        std::vector<std::vector<int>> adj(n + 1);
        std::vector<int> indeg(n + 1, 0);
        for (const auto& r : requirements) {
            adj[r[0]].push_back(r[1]);
            indeg[r[1]]++;
        }
        std::vector<int> q;
        q.reserve(n);
        for (int i = 1; i <= n; i++) {
            if (indeg[i] == 0) q.push_back(i);
        }
        size_t head = 0;
        while (head < q.size()) {
            int u = q[head++];
            for (int v : adj[u]) {
                if (--indeg[v] == 0) {
                    q.push_back(v);
                }
            }
        }
        return (int)q.size() == n;
    }
};
