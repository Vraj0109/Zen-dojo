#include <vector>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>

using namespace std;

class Solution {
    void dfs(const string& email, unordered_map<string, vector<string>>& adj, unordered_set<string>& visited, vector<string>& component) {
        visited.insert(email);
        component.push_back(email);
        for (const auto& neighbor : adj[email]) {
            if (!visited.count(neighbor)) {
                dfs(neighbor, adj, visited, component);
            }
        }
    }
public:
    vector<vector<string>> accountsMerge(vector<vector<string>>& accounts) {
        unordered_map<string, vector<string>> adj;
        unordered_map<string, string> emailToName;

        for (const auto& acc : accounts) {
            const string& name = acc[0];
            const string& firstEmail = acc[1];
            emailToName[firstEmail] = name;
            for (size_t i = 1; i < acc.size(); i++) {
                emailToName[acc[i]] = name;
                if (i > 1) {
                    adj[firstEmail].push_back(acc[i]);
                    adj[acc[i]].push_back(firstEmail);
                }
            }
        }

        unordered_set<string> visited;
        vector<vector<string>> res;

        for (const auto& pair : emailToName) {
            const string& email = pair.first;
            if (!visited.count(email)) {
                vector<string> component;
                dfs(email, adj, visited, component);
                sort(component.begin(), component.end());
                component.insert(component.begin(), pair.second);
                res.push_back(component);
            }
        }
        return res;
    }
};
