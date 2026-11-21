#include <vector>
#include <algorithm>

class Solution {
public:
    long long tasksAndDeadlines(std::vector<std::vector<int>>& tasks) {
        std::sort(tasks.begin(), tasks.end(), [](const std::vector<int>& a, const std::vector<int>& b) {
            return a[0] < b[0];
        });
        long long current_time = 0;
        long long total_reward = 0;
        for (const auto& task : tasks) {
            current_time += task[0];
            total_reward += (task[1] - current_time);
        }
        return total_reward;
    }
};
