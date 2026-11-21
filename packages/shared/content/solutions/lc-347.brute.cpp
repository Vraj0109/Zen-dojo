#include <vector>
#include <unordered_map>
#include <algorithm>

class Solution {
public:
    std::vector<int> topKFrequent(std::vector<int>& nums, int k) {
        std::unordered_map<int, int> freq;
        for (int x : nums) freq[x]++;
        std::vector<std::pair<int, int>> pairs;
        for (const auto& p : freq) {
            pairs.push_back({p.second, p.first});
        }
        std::sort(pairs.rbegin(), pairs.rend());
        std::vector<int> res;
        for (int i = 0; i < k; i++) {
            res.push_back(pairs[i].second);
        }
        return res;
    }
};
