#include <string>
#include <vector>
#include <queue>
#include <unordered_set>

using namespace std;

class Solution {
    bool diffOne(const string& a, const string& b) {
        int diff = 0;
        for (size_t i = 0; i < a.size(); i++) {
            if (a[i] != b[i]) {
                diff++;
                if (diff > 1) return false;
            }
        }
        return diff == 1;
    }
public:
    int ladderLength(string beginWord, string endWord, vector<string>& wordList) {
        unordered_set<string> dict(wordList.begin(), wordList.end());
        if (!dict.count(endWord)) return 0;

        vector<string> allWords;
        allWords.push_back(beginWord);
        for (const auto& w : wordList) {
            if (w != beginWord) allWords.push_back(w);
        }

        int n = allWords.size();
        vector<vector<int>> adj(n);
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                if (diffOne(allWords[i], allWords[j])) {
                    adj[i].push_back(j);
                    adj[j].push_back(i);
                }
            }
        }

        queue<int> q;
        vector<int> dist(n, -1);
        q.push(0);
        dist[0] = 1;
        while (!q.empty()) {
            int u = q.front(); q.pop();
            if (allWords[u] == endWord) return dist[u];
            for (int v : adj[u]) {
                if (dist[v] == -1) {
                    dist[v] = dist[u] + 1;
                    q.push(v);
                }
            }
        }
        return 0;
    }
};
