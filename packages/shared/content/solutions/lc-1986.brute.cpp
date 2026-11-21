#include <vector>
#include <climits>
#include <algorithm>

using namespace std;

class Solution {
    int min_sessions;

    void backtrack(const vector<int>& tasks, int idx, vector<int>& sessions, int sessionTime) {
        if ((int)sessions.size() >= min_sessions) return;
        if (idx == (int)tasks.size()) {
            min_sessions = min(min_sessions, (int)sessions.size());
            return;
        }

        // Try placing tasks[idx] into an existing session
        for (int i = 0; i < (int)sessions.size(); ++i) {
            if (sessions[i] + tasks[idx] <= sessionTime) {
                sessions[i] += tasks[idx];
                backtrack(tasks, idx + 1, sessions, sessionTime);
                sessions[i] -= tasks[idx];
            }
        }

        // Try placing tasks[idx] into a new session
        sessions.push_back(tasks[idx]);
        backtrack(tasks, idx + 1, sessions, sessionTime);
        sessions.pop_back();
    }

public:
    int minSessions(vector<int>& tasks, int sessionTime) {
        min_sessions = (int)tasks.size();
        sort(tasks.rbegin(), tasks.rend());
        vector<int> sessions;
        backtrack(tasks, 0, sessions, sessionTime);
        return min_sessions;
    }
};
