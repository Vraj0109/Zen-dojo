#include <bits/stdc++.h>
using namespace std;

class Solution {
    bool isValid(const string& s) {
        int bal = 0;
        for (char c : s) {
            if (c == '(') bal++;
            else if (c == ')') {
                bal--;
                if (bal < 0) return false;
            }
        }
        return bal == 0;
    }

public:
    vector<string> removeInvalidParentheses(string s) {
        // BFS level by level (by number of removals)
        vector<string> result;
        unordered_set<string> visited;
        queue<string> q;

        q.push(s);
        visited.insert(s);
        bool found = false;

        while (!q.empty()) {
            int sz = q.size();
            for (int i = 0; i < sz; i++) {
                string cur = q.front();
                q.pop();

                if (isValid(cur)) {
                    result.push_back(cur);
                    found = true;
                }

                if (found) continue;

                for (int j = 0; j < (int)cur.size(); j++) {
                    if (cur[j] != '(' && cur[j] != ')') continue;
                    string next = cur.substr(0, j) + cur.substr(j + 1);
                    if (visited.insert(next).second) {
                        q.push(next);
                    }
                }
            }
            if (found) break;
        }

        if (result.empty()) return {""};
        return result;
    }
};
