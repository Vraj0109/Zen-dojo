#include <vector>

using namespace std;

class Solution {
    bool hasCycleDFS(int u, const vector<vector<int>>& g, vector<int>& state) {
        state[u] = 1; // visiting
        for (int v : g[u]) {
            if (state[v] == 1) return true; // cycle found
            if (state[v] == 0 && hasCycleDFS(v, g, state)) return true;
        }
        state[u] = 2; // visited
        return false;
    }
public:
    bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {
        vector<vector<int>> g(numCourses);
        for (const auto& p : prerequisites) {
            g[p[1]].push_back(p[0]);
        }
        vector<int> state(numCourses, 0); // 0 = unvisited, 1 = visiting, 2 = visited
        for (int i = 0; i < numCourses; i++) {
            if (state[i] == 0) {
                if (hasCycleDFS(i, g, state)) return false;
            }
        }
        return true;
    }
};
