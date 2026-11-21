#include <vector>
#include <queue>

using namespace std;

class Solution {
public:
    long long fixedLengthPathsI(int n, int k, vector<vector<int>>& edges) {
        vector<vector<int>> adj(n + 1);
        for (const auto& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        long long count = 0;
        for (int i = 1; i <= n; i++) {
            vector<int> dist(n + 1, -1);
            queue<int> q;
            dist[i] = 0;
            q.push(i);
            while (!q.empty()) {
                int u = q.front();
                q.pop();
                if (dist[u] == k) {
                    count++;
                }
                if (dist[u] < k) {
                    for (int v : adj[u]) {
                        if (dist[v] == -1) {
                            dist[v] = dist[u] + 1;
                            q.push(v);
                        }
                    }
                }
            }
        }
        return count / 2;
    }
};
