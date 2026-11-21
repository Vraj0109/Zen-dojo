#include <vector>
#include <string>
#include <queue>
#include <algorithm>

using namespace std;

class Solution {
public:
    int leastInterval(vector<string>& tasks, int n) {
        if (n == 0) return tasks.size();
        int cnt[26] = {0};
        for (const auto& t : tasks) cnt[t[0] - 'A']++;

        priority_queue<int> pq;
        for (int c : cnt) if (c > 0) pq.push(c);

        int time = 0;
        queue<pair<int, int>> cool; // {count, availableTime}

        while (!pq.empty() || !cool.empty()) {
            time++;
            if (!cool.empty() && cool.front().second <= time) {
                pq.push(cool.front().first);
                cool.pop();
            }
            if (!pq.empty()) {
                int c = pq.top(); pq.pop();
                if (c - 1 > 0) {
                    cool.push({c - 1, time + n + 1});
                }
            }
        }
        return time;
    }
};
