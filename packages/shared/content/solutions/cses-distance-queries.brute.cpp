#include <vector>
#include <queue>

using namespace std;

class Solution {
public:
    vector<int> distanceQueries(int n, vector<vector<int>>& edges, vector<vector<int>>& queries) {
        vector<vector<int>> adj(n + 1);
        for (const auto& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        vector<int> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            int a = q[0], b = q[1];
            if (a == b) {
                ans.push_back(0);
                continue;
            }
            vector<int> dist(n + 1, -1);
            queue<int> qu;
            dist[a] = 0;
            qu.push(a);
            while (!qu.empty()) {
                int u = qu.front();
                qu.pop();
                if (u == b) break;
                for (int v : adj[u]) {
                    if (dist[v] == -1) {
                        dist[v] = dist[u] + 1;
                        qu.push(v);
                    }
                }
            }
            ans.push_back(dist[b]);
        }
        return ans;
    }
};
