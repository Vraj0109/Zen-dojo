#include <vector>
#include <unordered_set>

class Solution {
public:
    std::vector<int> findDuplicates(std::vector<int>& nums) {
        std::unordered_set<int> seen;
        std::vector<int> res;
        for (int x : nums) {
            if (seen.count(x)) {
                res.push_back(x);
            } else {
                seen.insert(x);
            }
        }
        return res;
    }
};
