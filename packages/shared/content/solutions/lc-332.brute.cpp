#include <vector>
#include <string>
#include <algorithm>
#include <map>

using namespace std;

class Solution {
    bool dfs(const string& u, map<string, vector<pair<string, bool>>>& g, int total_tickets, int used_tickets, vector<string>& route) {
        if (used_tickets == total_tickets) {
            return true;
        }

        if (g.find(u) == g.end()) return false;

        for (auto& edge : g[u]) {
            if (!edge.second) {
                edge.second = true;
                route.push_back(edge.first);
                if (dfs(edge.first, g, total_tickets, used_tickets + 1, route)) {
                    return true;
                }
                route.pop_back();
                edge.second = false;
            }
        }
        return false;
    }

public:
    vector<string> findItinerary(vector<vector<string>>& tickets) {
        map<string, vector<pair<string, bool>>> g;
        for (const auto& t : tickets) {
            g[t[0]].push_back({t[1], false});
        }
        for (auto& pair : g) {
            sort(pair.second.begin(), pair.second.end());
        }

        vector<string> route = {"JFK"};
        dfs("JFK", g, (int)tickets.size(), 0, route);
        return route;
    }
};
