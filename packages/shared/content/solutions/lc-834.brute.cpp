#include <vector>
#include <queue>

using namespace std;

class Solution {
public:
    vector<int> sumOfDistancesInTree(int n, vector<vector<int>>& edges) {
        vector<vector<int>> g(n);
        for (const auto& e : edges) {
            g[e[0]].push_back(e[1]);
            g[e[1]].push_back(e[0]);
        }
        vector<int> ans(n, 0);
        for (int i = 0; i < n; i++) {
            // BFS from i
            vector<int> dist(n, -1);
            queue<int> q;
            q.push(i);
            dist[i] = 0;
            int totalDist = 0;
            while (!q.empty()) {
                int u = q.front(); q.pop();
                totalDist += dist[u];
                for (int v : g[u]) {
                    if (dist[v] == -1) {
                        dist[v] = dist[u] + 1;
                        q.push(v);
                    }
                }
            }
            ans[i] = totalDist;
        }
        return ans;
    }
};
